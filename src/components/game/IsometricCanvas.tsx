import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { GameState, Camera, TILE_COLORS, TileType, OverlayType, Agent, DRAGGABLE_TYPES, ZONE_TYPES, isAdjacentToRoad, isRCIType } from '@/types/game';
import { calculatePopulationDensity, calculateLandValue, calculateHappinessMap } from '@/lib/serviceCoverage';

interface Props {
  gameState: GameState;
  onTileClick: (x: number, y: number) => void;
  onTileDrag: (tiles: { x: number; y: number }[]) => void;
}

const TILE_W = 64;
const TILE_H = 32;
const DAY_LENGTH = 240;

function toIso(x: number, y: number, cam: Camera): [number, number] {
  const ix = (x - y) * (TILE_W / 2) * cam.zoom + cam.x;
  const iy = (x + y) * (TILE_H / 2) * cam.zoom + cam.y;
  return [ix, iy];
}

function fromIso(sx: number, sy: number, cam: Camera): [number, number] {
  const rx = (sx - cam.x) / cam.zoom;
  const ry = (sy - cam.y) / cam.zoom;
  const x = (rx / (TILE_W / 2) + ry / (TILE_H / 2)) / 2;
  const y = (ry / (TILE_H / 2) - rx / (TILE_W / 2)) / 2;
  return [Math.floor(x), Math.floor(y)];
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

// Smooth easing function for agents
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Get day/night lighting factor (0 = midnight dark, 1 = full daylight)
function getDaylight(timeOfDay: number): number {
  const t = timeOfDay / DAY_LENGTH; // 0-1 cycle
  // Sine curve: peaks at 0.25 (noon), troughs at 0.75 (midnight)
  return 0.5 + 0.5 * Math.sin((t - 0.25) * Math.PI * 2);
}

const FLAT_TYPES: TileType[] = ['grass', 'road', 'sand', 'forest', 'bus_stop'];
const NO_WINDOWS: TileType[] = ['grass', 'road', 'sand', 'forest', 'water', 'park', 'bus_stop'];
const SERVICE_TYPES: TileType[] = ['fire_station', 'police_station', 'hospital', 'water_pump', 'sewage', 'school', 'university', 'train_station'];

function getOverlayColor(value: number, type: OverlayType): string {
  const v = Math.max(0, Math.min(1, value));
  switch (type) {
    case 'population': return `rgba(255, ${Math.floor(255 - v * 200)}, 50, ${v * 0.6})`;
    case 'landValue': return `rgba(${Math.floor(50 + v * 100)}, ${Math.floor(200 * v)}, ${Math.floor(50 + v * 150)}, ${v * 0.5})`;
    case 'fire': return `rgba(255, ${Math.floor(80 - v * 60)}, 50, ${v * 0.6})`;
    case 'police': return `rgba(60, ${Math.floor(100 + v * 100)}, 255, ${v * 0.6})`;
    case 'health': return `rgba(255, ${Math.floor(140 + v * 60)}, 50, ${v * 0.6})`;
    case 'waterSupply': return `rgba(50, ${Math.floor(150 + v * 100)}, 255, ${v * 0.6})`;
    case 'sewage': return `rgba(${Math.floor(140 + v * 60)}, 80, 255, ${v * 0.6})`;
    case 'happiness': return `rgba(${Math.floor(50 + (1 - v) * 200)}, ${Math.floor(50 + v * 200)}, 50, ${0.15 + v * 0.45})`;
    case 'education': return `rgba(${Math.floor(100 + v * 80)}, ${Math.floor(200 * v)}, ${Math.floor(50 + v * 50)}, ${v * 0.55})`;
    case 'transport': return `rgba(${Math.floor(200 * v)}, ${Math.floor(180 * v)}, 50, ${v * 0.5})`;
    default: return 'transparent';
  }
}

function drawWaterTile(ctx: CanvasRenderingContext2D, sx: number, sy: number, w: number, h: number, tick: number, x: number, y: number, daylight: number) {
  const waveOffset = Math.sin((tick * 0.05) + x * 0.5 + y * 0.3) * 1.5;
  const adjustedSy = sy + waveOffset;
  ctx.beginPath();
  ctx.moveTo(sx, adjustedSy - h); ctx.lineTo(sx + w, adjustedSy); ctx.lineTo(sx, adjustedSy + h); ctx.lineTo(sx - w, adjustedSy);
  ctx.closePath();
  const depth = Math.sin(x * 0.3 + y * 0.4) * 0.15;
  const bright = 0.4 + daylight * 0.6;
  ctx.fillStyle = `rgb(${Math.floor((30 + depth * 20) * bright)},${Math.floor((80 + depth * 30) * bright)},${Math.floor((200 + depth * 40) * bright)})`;
  ctx.fill();
  // Moon/sun reflection
  const reflectAlpha = daylight < 0.3 ? 0.04 + Math.sin(tick * 0.03 + x + y) * 0.03 : 0.1 + Math.sin(tick * 0.08 + x + y) * 0.08;
  ctx.fillStyle = `rgba(140, 200, 255, ${reflectAlpha})`;
  ctx.fill();
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)'; ctx.lineWidth = 0.5; ctx.stroke();
}

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, cam: Camera, type: TileType, level: number, hover: boolean, tick: number, daylight: number, overlayValue?: number, overlayType?: OverlayType, isPreview?: boolean, isInvalid?: boolean) {
  const [sx, sy] = toIso(x, y, cam);
  const w = (TILE_W / 2) * cam.zoom;
  const h = (TILE_H / 2) * cam.zoom;
  const dpr = window.devicePixelRatio || 1;
  const cw = ctx.canvas.width / dpr;
  const ch = ctx.canvas.height / dpr;
  if (sx + w < 0 || sx - w > cw || sy + h + 100 < 0 || sy - h - 100 > ch) return;

  if (type === 'water') { drawWaterTile(ctx, sx, sy, w, h, tick, x, y, daylight); return; }

  const colors = TILE_COLORS[type];
  const isFlat = FLAT_TYPES.includes(type);
  const rci = isRCIType(type);
  const isHiDensity = type.endsWith('_hi');
  const isMdDensity = type.endsWith('_md');

  // Building heights vary by density
  let buildingHeight = 0;
  if (!isFlat) {
    if (isHiDensity) buildingHeight = level * 12 * cam.zoom;
    else if (isMdDensity) buildingHeight = level * 10 * cam.zoom;
    else buildingHeight = level * 7 * cam.zoom;
  }
  const treeHeight = type === 'forest' ? 6 * cam.zoom : 0;
  const serviceExtra = SERVICE_TYPES.includes(type) ? 8 * cam.zoom : 0;
  const totalHeight = buildingHeight + treeHeight + serviceExtra;

  if (isPreview) ctx.globalAlpha = isInvalid ? 0.25 : 0.5;

  const tintAmount = Math.floor((1 - daylight) * 50);
  const nightGlow = 1 - daylight;

  // === BUILDING WALLS ===
  if (totalHeight > 0) {
    // Left wall
    ctx.beginPath(); ctx.moveTo(sx - w, sy); ctx.lineTo(sx, sy + h); ctx.lineTo(sx, sy + h - totalHeight); ctx.lineTo(sx - w, sy - totalHeight); ctx.closePath();
    ctx.fillStyle = darken(colors[2], tintAmount); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5; ctx.stroke();
    // Right wall
    ctx.beginPath(); ctx.moveTo(sx + w, sy); ctx.lineTo(sx, sy + h); ctx.lineTo(sx, sy + h - totalHeight); ctx.lineTo(sx + w, sy - totalHeight); ctx.closePath();
    ctx.fillStyle = darken(colors[1], tintAmount); ctx.fill(); ctx.stroke();

    // === FLOOR LINES for tall buildings ===
    if (rci && level >= 2 && cam.zoom > 0.35) {
      const floorH = (isHiDensity ? 12 : isMdDensity ? 10 : 7) * cam.zoom;
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.5;
      for (let f = 1; f < level; f++) {
        const fy = sy + h - f * floorH;
        // Left wall floor line
        ctx.beginPath(); ctx.moveTo(sx - w, fy - h); ctx.lineTo(sx, fy); ctx.stroke();
        // Right wall floor line
        ctx.beginPath(); ctx.moveTo(sx + w, fy - h); ctx.lineTo(sx, fy); ctx.stroke();
      }
    }

    // === WINDOWS ===
    if (rci && level >= 1 && cam.zoom > 0.35) {
      const windowAlpha = 0.25 + nightGlow * 0.75;
      const windowColor = rci === 'commercial'
        ? `rgba(100,200,255,${windowAlpha})`
        : rci === 'industrial'
          ? `rgba(255,200,100,${windowAlpha})`
          : `rgba(255,255,${Math.floor(150 + nightGlow * 100)},${windowAlpha})`;
      ctx.fillStyle = windowColor;

      const dotW = 1.5 * cam.zoom;
      const dotH = 2 * cam.zoom;
      const cols = isHiDensity ? 4 : isMdDensity ? 3 : 2;
      const floorH = (isHiDensity ? 12 : isMdDensity ? 10 : 7) * cam.zoom;

      for (let floor = 0; floor < level; floor++) {
        const baseY = sy + h - totalHeight + floor * floorH;
        for (let col = 0; col < cols; col++) {
          const offset = (col - (cols - 1) / 2) * dotW * 2.5;
          // Left wall windows
          ctx.fillRect(sx - w * 0.5 + offset * 0.5, baseY + floorH * 0.3, dotW, dotH);
          // Right wall windows
          ctx.fillRect(sx + w * 0.3 + offset * 0.5, baseY + floorH * 0.3, dotW, dotH);
        }
      }
    }

    // === HI-DENSITY ROOFTOP FEATURES ===
    if (isHiDensity && cam.zoom > 0.4) {
      // Antenna/spire
      const antennaH = 5 * cam.zoom;
      ctx.strokeStyle = darken(colors[0], tintAmount + 20);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy + h - totalHeight); ctx.lineTo(sx, sy + h - totalHeight - antennaH); ctx.stroke();
      // Red light at top (blinks)
      if (Math.sin(tick * 0.1) > 0) {
        ctx.fillStyle = 'rgba(255,50,50,0.8)';
        ctx.beginPath(); ctx.arc(sx, sy + h - totalHeight - antennaH, 1.5 * cam.zoom, 0, Math.PI * 2); ctx.fill();
      }
    }

    // === MD-DENSITY BALCONIES ===
    if (isMdDensity && level >= 2 && cam.zoom > 0.5) {
      ctx.fillStyle = darken(colors[1], tintAmount + 15);
      const balconyW = w * 0.15;
      for (let f = 1; f < level; f++) {
        const fy = sy + h - f * 10 * cam.zoom;
        ctx.fillRect(sx + w - balconyW, fy - h * 0.3, balconyW * 1.5, h * 0.15);
      }
    }
  }

  // === TOP FACE ===
  ctx.beginPath(); ctx.moveTo(sx, sy - h - totalHeight); ctx.lineTo(sx + w, sy - totalHeight); ctx.lineTo(sx, sy + h - totalHeight); ctx.lineTo(sx - w, sy - totalHeight); ctx.closePath();
  const topColor = hover ? lighten(colors[0], 30) : darken(colors[0], tintAmount);
  ctx.fillStyle = topColor; ctx.fill();
  ctx.strokeStyle = hover ? 'rgba(94,234,212,0.6)' : 'rgba(0,0,0,0.1)'; ctx.lineWidth = hover ? 2 : 0.3; ctx.stroke();

  // Roof detail for commercial
  if (rci === 'commercial' && !isHiDensity && level >= 2 && cam.zoom > 0.4) {
    ctx.fillStyle = darken(colors[0], tintAmount + 20);
    ctx.fillRect(sx - w * 0.2, sy - totalHeight - h * 0.3, w * 0.4, h * 0.3);
  }

  // Invalid placement indicator
  if (isPreview && isInvalid) {
    ctx.beginPath(); ctx.moveTo(sx, sy - h - totalHeight); ctx.lineTo(sx + w, sy - totalHeight); ctx.lineTo(sx, sy + h - totalHeight); ctx.lineTo(sx - w, sy - totalHeight); ctx.closePath();
    ctx.fillStyle = 'rgba(255, 50, 50, 0.4)'; ctx.fill();
  }

  // Service icons
  if (SERVICE_TYPES.includes(type) && cam.zoom > 0.4) {
    const iconSize = 3.5 * cam.zoom;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    if (type === 'hospital') {
      ctx.fillRect(sx - iconSize * 0.3, sy - totalHeight - h - iconSize, iconSize * 0.6, iconSize * 2);
      ctx.fillRect(sx - iconSize, sy - totalHeight - h - iconSize * 0.3, iconSize * 2, iconSize * 0.6);
    } else if (type === 'fire_station') {
      // Flame shape
      ctx.fillStyle = 'rgba(255,100,50,0.9)';
      ctx.beginPath();
      ctx.moveTo(sx, sy - totalHeight - h - iconSize * 1.5);
      ctx.quadraticCurveTo(sx + iconSize, sy - totalHeight - h, sx, sy - totalHeight - h + iconSize * 0.3);
      ctx.quadraticCurveTo(sx - iconSize, sy - totalHeight - h, sx, sy - totalHeight - h - iconSize * 1.5);
      ctx.fill();
    } else if (type === 'police_station') {
      // Star badge
      ctx.fillStyle = 'rgba(100,180,255,0.9)';
      ctx.beginPath(); ctx.arc(sx, sy - totalHeight - h - iconSize * 0.3, iconSize * 0.6, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'school' || type === 'university') {
      ctx.fillRect(sx - iconSize * 0.7, sy - totalHeight - h - iconSize * 0.6, iconSize * 1.4, iconSize * 0.7);
      ctx.fillStyle = colors[2];
      ctx.fillRect(sx - iconSize * 0.1, sy - totalHeight - h - iconSize * 0.6, iconSize * 0.2, iconSize * 0.7);
    } else {
      ctx.beginPath(); ctx.arc(sx, sy - totalHeight - h - iconSize * 0.3, iconSize * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Night glow bloom for buildings
  if (rci && daylight < 0.4 && totalHeight > 0 && cam.zoom > 0.3) {
    ctx.fillStyle = `rgba(255,240,150,${(0.4 - daylight) * 0.12})`;
    ctx.beginPath();
    ctx.arc(sx, sy - totalHeight / 2, totalHeight * 0.9 + w * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Forest trees
  if (type === 'forest' && cam.zoom > 0.5) {
    ctx.fillStyle = darken('#0d4a0d', tintAmount);
    const ts = 3 * cam.zoom;
    ctx.beginPath(); ctx.moveTo(sx, sy - totalHeight - ts * 2); ctx.lineTo(sx - ts, sy - totalHeight); ctx.lineTo(sx + ts, sy - totalHeight); ctx.closePath(); ctx.fill();
    // Second smaller tree
    ctx.fillStyle = darken('#1a6b1a', tintAmount);
    ctx.beginPath(); ctx.moveTo(sx - ts, sy - totalHeight - ts * 1.3); ctx.lineTo(sx - ts * 1.8, sy - totalHeight + ts * 0.3); ctx.lineTo(sx - ts * 0.2, sy - totalHeight + ts * 0.3); ctx.closePath(); ctx.fill();
  }

  // Park details
  if (type === 'park' && cam.zoom > 0.5) {
    const ts = 2 * cam.zoom;
    // Small trees
    ctx.fillStyle = darken('#059669', tintAmount);
    ctx.beginPath(); ctx.arc(sx - ts * 1.5, sy - h - ts, ts, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + ts, sy - h - ts * 0.8, ts * 0.8, 0, Math.PI * 2); ctx.fill();
    // Path
    ctx.strokeStyle = 'rgba(200,200,180,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - w * 0.5, sy); ctx.lineTo(sx + w * 0.3, sy - h * 0.5); ctx.stroke();
  }

  // Street lights at night on roads
  if (type === 'road' && daylight < 0.35 && cam.zoom > 0.5) {
    const lightR = 4 * cam.zoom;
    ctx.fillStyle = `rgba(255,230,150,${(0.35 - daylight) * 0.3})`;
    ctx.beginPath(); ctx.arc(sx, sy - h, lightR, 0, Math.PI * 2); ctx.fill();
  }

  if (isPreview) ctx.globalAlpha = 1;

  if (overlayType && overlayType !== 'none' && overlayValue !== undefined && overlayValue > 0.01) {
    ctx.beginPath(); ctx.moveTo(sx, sy - h - totalHeight); ctx.lineTo(sx + w, sy - totalHeight); ctx.lineTo(sx, sy + h - totalHeight); ctx.lineTo(sx - w, sy - totalHeight); ctx.closePath();
    ctx.fillStyle = getOverlayColor(overlayValue, overlayType); ctx.fill();
  }
}

function drawAgent(ctx: CanvasRenderingContext2D, agent: Agent, cam: Camera, daylight: number) {
  // Smooth eased interpolation
  const t = easeInOut(agent.progress);
  const lx = agent.x + (agent.targetX - agent.x) * t;
  const ly = agent.y + (agent.targetY - agent.y) * t;
  const [sx, sy] = toIso(lx, ly, cam);

  const dpr = window.devicePixelRatio || 1;
  const cw = ctx.canvas.width / dpr;
  const ch = ctx.canvas.height / dpr;
  if (sx < -20 || sx > cw + 20 || sy < -20 || sy > ch + 20) return;

  const z = cam.zoom;

  // Direction for rotation
  const dx = agent.targetX - agent.x;
  const dy = agent.targetY - agent.y;

  if (agent.type === 'car') {
    const size = 3 * z;
    ctx.save();
    ctx.translate(sx, sy - size);
    // Rotate based on direction
    const angle = Math.atan2(dy + dx, dx - dy); // iso adjustment
    ctx.rotate(angle);
    ctx.fillStyle = agent.color;
    // Car body (rounded)
    ctx.beginPath();
    ctx.roundRect(-size * 1.2, -size * 0.5, size * 2.4, size, [size * 0.3]);
    ctx.fill();
    // Windshield
    ctx.fillStyle = `rgba(200,230,255,${0.5 + daylight * 0.3})`;
    ctx.fillRect(size * 0.4, -size * 0.35, size * 0.6, size * 0.7);
    // Headlights at night
    if (daylight < 0.4) {
      ctx.fillStyle = `rgba(255,255,200,${(0.4 - daylight) * 1.5})`;
      ctx.beginPath(); ctx.arc(size * 1.2, 0, size * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else if (agent.type === 'bus') {
    const size = 4 * z;
    ctx.save();
    ctx.translate(sx, sy - size * 0.6);
    const angle = Math.atan2(dy + dx, dx - dy);
    ctx.rotate(angle);
    ctx.fillStyle = agent.color;
    ctx.beginPath();
    ctx.roundRect(-size * 1.5, -size * 0.45, size * 3, size * 0.9, [size * 0.2]);
    ctx.fill();
    ctx.fillStyle = `rgba(200,230,255,${0.4 + daylight * 0.3})`;
    ctx.fillRect(-size * 1.2, -size * 0.35, size * 0.4, size * 0.7);
    ctx.fillRect(size * 0.5, -size * 0.35, size * 0.4, size * 0.7);
    if (daylight < 0.4) {
      ctx.fillStyle = `rgba(255,255,200,${(0.4 - daylight) * 1.2})`;
      ctx.beginPath(); ctx.arc(size * 1.5, 0, size * 0.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else {
    // Pedestrian - smooth bobbing
    const bob = Math.sin(agent.progress * Math.PI * 4) * z * 0.5;
    const size = 1.5 * z;
    ctx.fillStyle = agent.color;
    // Head
    ctx.beginPath(); ctx.arc(sx, sy - size * 3 + bob, size * 0.8, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillRect(sx - size * 0.35, sy - size * 2.2 + bob, size * 0.7, size * 1.8);
  }
}

// Get tiles in a line between two points (Bresenham's)
function getTilesInLine(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0, cy = y0;

  while (true) {
    tiles.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return tiles;
}

export default function IsometricCanvas({ gameState, onTileClick, onTileDrag }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 0.7 });
  const [hoverTile, setHoverTile] = useState<[number, number] | null>(null);
  const dragRef = useRef({ dragging: false, isDragPlace: false, startX: 0, startY: 0, lastX: 0, lastY: 0, startTileX: -1, startTileY: -1 });
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number }[] | null>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const animFrameRef = useRef<number>(0);
  const tickRef = useRef(0);

  const isDraggableTool = DRAGGABLE_TYPES.includes(gameState.selectedTool);

  const overlayMap = useMemo<number[][] | null>(() => {
    const { overlay, grid, gridSize, coverage } = gameState;
    if (overlay === 'none') return null;
    switch (overlay) {
      case 'population': return calculatePopulationDensity(grid, gridSize);
      case 'landValue': return calculateLandValue(grid, coverage, gridSize);
      case 'fire': return coverage.fire;
      case 'police': return coverage.police;
      case 'health': return coverage.health;
      case 'waterSupply': return coverage.waterSupply;
      case 'sewage': return coverage.sewage;
      case 'happiness': return calculateHappinessMap(grid, coverage, gridSize);
      case 'education': return coverage.education;
      case 'transport': return coverage.transport;
      default: return null;
    }
  }, [gameState.overlay, gameState.grid, gameState.coverage, gameState.gridSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.style.width = parent.clientWidth + 'px';
    canvas.style.height = parent.clientHeight + 'px';
    setCamera({ x: parent.clientWidth / 2, y: parent.clientHeight / 5, zoom: 0.55 });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;
      tickRef.current++;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Day/night sky color
      const daylight = getDaylight(gameState.timeOfDay);
      const skyR = Math.floor(8 + daylight * 12);
      const skyG = Math.floor(10 + daylight * 15);
      const skyB = Math.floor(20 + daylight * 20);
      ctx.fillStyle = `rgb(${skyR},${skyG},${skyB})`;
      ctx.fillRect(0, 0, rect.width, rect.height);

      const cam = cameraRef.current;

      // Draw tiles
      for (let y = 0; y < gameState.gridSize; y++) {
        for (let x = 0; x < gameState.gridSize; x++) {
          const tile = gameState.grid[y][x];
          const isHover = hoverTile?.[0] === x && hoverTile?.[1] === y;
          const ov = overlayMap ? (overlayMap[y]?.[x] ?? 0) : undefined;
          drawTile(ctx, x, y, cam, tile.type, tile.level, isHover, tickRef.current, daylight, ov, gameState.overlay);
        }
      }

      // Draw drag preview
      if (dragPreview) {
        const tool = gameState.selectedTool;
        const isZoneTool = ZONE_TYPES.includes(tool as TileType);
        for (const { x, y } of dragPreview) {
          const invalid = isZoneTool && !isAdjacentToRoad(gameState.grid, x, y, gameState.gridSize);
          drawTile(ctx, x, y, cam, tool === 'bulldoze' ? 'road' : tool as TileType, 1, false, tickRef.current, daylight, undefined, undefined, true, invalid);
        }
      }

      // Draw agents
      for (const agent of gameState.agents) {
        drawAgent(ctx, agent, cam, daylight);
      }

      // Night overlay
      if (daylight < 0.5) {
        ctx.fillStyle = `rgba(10,10,40,${(0.5 - daylight) * 0.25})`;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [gameState, hoverTile, overlayMap, dragPreview]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.style.width = parent.clientWidth + 'px';
      canvas.style.height = parent.clientHeight + 'px';
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const [tx, ty] = fromIso(e.clientX - rect.left, e.clientY - rect.top, cameraRef.current);

    dragRef.current = {
      dragging: true,
      isDragPlace: isDraggableTool && tx >= 0 && tx < gameState.gridSize && ty >= 0 && ty < gameState.gridSize,
      startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
      startTileX: tx, startTileY: ty,
    };
  }, [isDraggableTool, gameState.gridSize]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const [tx, ty] = fromIso(mx, my, cameraRef.current);

    if (dragRef.current.dragging && e.buttons > 0) {
      if (dragRef.current.isDragPlace) {
        if (tx >= 0 && tx < gameState.gridSize && ty >= 0 && ty < gameState.gridSize) {
          const tiles = getTilesInLine(dragRef.current.startTileX, dragRef.current.startTileY, tx, ty);
          setDragPreview(tiles);
        }
        return;
      }

      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        return;
      }
    }

    if (tx >= 0 && tx < gameState.gridSize && ty >= 0 && ty < gameState.gridSize) {
      setHoverTile([tx, ty]);
    } else { setHoverTile(null); }
  }, [gameState.gridSize]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const wasDragPlace = dragRef.current.isDragPlace;
    const totalDx = Math.abs(e.clientX - dragRef.current.startX);
    const totalDy = Math.abs(e.clientY - dragRef.current.startY);
    dragRef.current.dragging = false;
    dragRef.current.isDragPlace = false;

    if (wasDragPlace && dragPreview && dragPreview.length > 1) {
      onTileDrag(dragPreview);
      setDragPreview(null);
      return;
    }
    setDragPreview(null);

    if (totalDx < 5 && totalDy < 5 && e.button === 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const [tx, ty] = fromIso(e.clientX - rect.left, e.clientY - rect.top, cameraRef.current);
      if (tx >= 0 && tx < gameState.gridSize && ty >= 0 && ty < gameState.gridSize) onTileClick(tx, ty);
    }
  }, [gameState.gridSize, onTileClick, onTileDrag, dragPreview]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setCamera(c => {
      const newZoom = Math.max(0.2, Math.min(3, c.zoom * (1 - e.deltaY * 0.001)));
      const scale = newZoom / c.zoom;
      return { x: mx - (mx - c.x) * scale, y: my - (my - c.y) * scale, zoom: newZoom };
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={e => e.preventDefault()}
      style={{ display: 'block' }}
    />
  );
}
