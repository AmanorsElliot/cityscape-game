import { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, Camera, TILE_COLORS, TileType } from '@/types/game';

interface Props {
  gameState: GameState;
  onTileClick: (x: number, y: number) => void;
}

const TILE_W = 64;
const TILE_H = 32;

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

function drawWaterTile(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, w: number, h: number,
  tick: number, x: number, y: number
) {
  // Animated water with wave effect
  const waveOffset = Math.sin((tick * 0.05) + x * 0.5 + y * 0.3) * 1.5;
  const adjustedSy = sy + waveOffset;

  ctx.beginPath();
  ctx.moveTo(sx, adjustedSy - h);
  ctx.lineTo(sx + w, adjustedSy);
  ctx.lineTo(sx, adjustedSy + h);
  ctx.lineTo(sx - w, adjustedSy);
  ctx.closePath();

  // Gradient water color
  const depth = Math.sin(x * 0.3 + y * 0.4) * 0.15;
  const r = Math.floor(30 + depth * 20);
  const g = Math.floor(80 + depth * 30);
  const b = Math.floor(200 + depth * 40);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();

  // Specular highlight
  ctx.fillStyle = `rgba(140, 200, 255, ${0.1 + Math.sin(tick * 0.08 + x + y) * 0.08})`;
  ctx.fill();

  ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  cam: Camera,
  type: TileType,
  level: number,
  hover: boolean,
  tick: number
) {
  const [sx, sy] = toIso(x, y, cam);
  const w = (TILE_W / 2) * cam.zoom;
  const h = (TILE_H / 2) * cam.zoom;

  // Culling: skip tiles outside viewport
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.width / dpr;
  const ch = canvas.height / dpr;
  if (sx + w < 0 || sx - w > cw || sy + h + 50 < 0 || sy - h - 50 > ch) return;

  if (type === 'water') {
    drawWaterTile(ctx, sx, sy, w, h, tick, x, y);
    return;
  }

  const colors = TILE_COLORS[type];
  const buildingHeight = ['grass', 'road', 'sand', 'forest'].includes(type) ? 0 : level * 8 * cam.zoom;

  // Forest gets small trees
  const treeHeight = type === 'forest' ? 6 * cam.zoom : 0;
  const totalHeight = buildingHeight + treeHeight;

  // Draw sides if has height
  if (totalHeight > 0) {
    ctx.beginPath();
    ctx.moveTo(sx - w, sy);
    ctx.lineTo(sx, sy + h);
    ctx.lineTo(sx, sy + h - totalHeight);
    ctx.lineTo(sx - w, sy - totalHeight);
    ctx.closePath();
    ctx.fillStyle = colors[2];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx + w, sy);
    ctx.lineTo(sx, sy + h);
    ctx.lineTo(sx, sy + h - totalHeight);
    ctx.lineTo(sx + w, sy - totalHeight);
    ctx.closePath();
    ctx.fillStyle = colors[1];
    ctx.fill();
    ctx.stroke();
  }

  // Top face
  ctx.beginPath();
  ctx.moveTo(sx, sy - h - totalHeight);
  ctx.lineTo(sx + w, sy - totalHeight);
  ctx.lineTo(sx, sy + h - totalHeight);
  ctx.lineTo(sx - w, sy - totalHeight);
  ctx.closePath();
  ctx.fillStyle = hover ? lighten(colors[0], 30) : colors[0];
  ctx.fill();
  ctx.strokeStyle = hover ? 'rgba(94,234,212,0.6)' : 'rgba(0,0,0,0.1)';
  ctx.lineWidth = hover ? 2 : 0.3;
  ctx.stroke();

  // Building windows for higher levels
  if (level >= 2 && !['grass', 'road', 'sand', 'forest', 'water', 'park'].includes(type)) {
    const dotSize = 2 * cam.zoom;
    ctx.fillStyle = 'rgba(255,255,200,0.7)';
    for (let row = 0; row < level; row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillRect(
          sx - dotSize * 1.5 + col * dotSize * 2,
          sy - totalHeight + row * dotSize * 2.5 - dotSize,
          dotSize,
          dotSize
        );
      }
    }
  }

  // Forest: draw little tree shapes
  if (type === 'forest' && cam.zoom > 0.5) {
    ctx.fillStyle = '#0d4a0d';
    const ts = 3 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(sx, sy - totalHeight - ts * 2);
    ctx.lineTo(sx - ts, sy - totalHeight);
    ctx.lineTo(sx + ts, sy - totalHeight);
    ctx.closePath();
    ctx.fill();
  }
}

export default function IsometricCanvas({ gameState, onTileClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 0.7 });
  const [hoverTile, setHoverTile] = useState<[number, number] | null>(null);
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; lastX: number; lastY: number }>({
    dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0,
  });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const animFrameRef = useRef<number>(0);
  const tickRef = useRef(0);

  // Center camera on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.style.width = parent.clientWidth + 'px';
    canvas.style.height = parent.clientHeight + 'px';
    setCamera({
      x: parent.clientWidth / 2,
      y: parent.clientHeight / 5,
      zoom: 0.55,
    });
  }, []);

  // Render loop
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
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = 'hsl(220, 20%, 8%)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      const cam = cameraRef.current;
      for (let y = 0; y < gameState.gridSize; y++) {
        for (let x = 0; x < gameState.gridSize; x++) {
          const tile = gameState.grid[y][x];
          const isHover = hoverTile?.[0] === x && hoverTile?.[1] === y;
          drawTile(ctx, x, y, cam, tile.type, tile.level, isHover, tickRef.current);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, hoverTile]);

  // Resize
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
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (dragRef.current.dragging && e.buttons > 0) {
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        return;
      }
    }

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const [tx, ty] = fromIso(mx, my, cameraRef.current);
    if (tx >= 0 && tx < gameState.gridSize && ty >= 0 && ty < gameState.gridSize) {
      setHoverTile([tx, ty]);
    } else {
      setHoverTile(null);
    }
  }, [gameState.gridSize]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const totalDx = Math.abs(e.clientX - dragRef.current.startX);
    const totalDy = Math.abs(e.clientY - dragRef.current.startY);
    dragRef.current.dragging = false;

    if (totalDx < 5 && totalDy < 5 && e.button === 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const [tx, ty] = fromIso(mx, my, cameraRef.current);
      if (tx >= 0 && tx < gameState.gridSize && ty >= 0 && ty < gameState.gridSize) {
        onTileClick(tx, ty);
      }
    }
  }, [gameState.gridSize, onTileClick]);

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
      return {
        x: mx - (mx - c.x) * scale,
        y: my - (my - c.y) * scale,
        zoom: newZoom,
      };
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
