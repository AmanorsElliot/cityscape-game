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

function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cam: Camera,
  type: TileType,
  level: number,
  hover: boolean
) {
  const [sx, sy] = toIso(x, y, cam);
  const w = (TILE_W / 2) * cam.zoom;
  const h = (TILE_H / 2) * cam.zoom;
  const colors = TILE_COLORS[type];
  const height = type === 'grass' || type === 'road' ? 0 : level * 8 * cam.zoom;

  // Draw sides if has height
  if (height > 0) {
    // Left face
    ctx.beginPath();
    ctx.moveTo(sx - w, sy);
    ctx.lineTo(sx, sy + h);
    ctx.lineTo(sx, sy + h - height);
    ctx.lineTo(sx - w, sy - height);
    ctx.closePath();
    ctx.fillStyle = colors[2];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Right face
    ctx.beginPath();
    ctx.moveTo(sx + w, sy);
    ctx.lineTo(sx, sy + h);
    ctx.lineTo(sx, sy + h - height);
    ctx.lineTo(sx + w, sy - height);
    ctx.closePath();
    ctx.fillStyle = colors[1];
    ctx.fill();
    ctx.stroke();
  }

  // Top face
  ctx.beginPath();
  ctx.moveTo(sx, sy - h - height);
  ctx.lineTo(sx + w, sy - height);
  ctx.lineTo(sx, sy + h - height);
  ctx.lineTo(sx - w, sy - height);
  ctx.closePath();
  ctx.fillStyle = hover ? lighten(colors[0], 30) : colors[0];
  ctx.fill();
  ctx.strokeStyle = hover ? 'rgba(94,234,212,0.6)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = hover ? 2 : 0.5;
  ctx.stroke();

  // Building details for higher levels
  if (level >= 2 && type !== 'road' && type !== 'grass') {
    const dotSize = 2 * cam.zoom;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < level; i++) {
      ctx.fillRect(sx - dotSize + i * dotSize * 1.5, sy - height - 2 * cam.zoom, dotSize, dotSize);
    }
  }
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

export default function IsometricCanvas({ gameState, onTileClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [hoverTile, setHoverTile] = useState<[number, number] | null>(null);
  const dragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({
    dragging: false, lastX: 0, lastY: 0,
  });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // Center camera on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCamera({
      x: canvas.width / 2,
      y: canvas.height / 4,
      zoom: 1,
    });
  }, []);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = 'hsl(220, 20%, 8%)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid back-to-front
    const cam = cameraRef.current;
    for (let y = 0; y < gameState.gridSize; y++) {
      for (let x = 0; x < gameState.gridSize; x++) {
        const tile = gameState.grid[y][x];
        const isHover = hoverTile?.[0] === x && hoverTile?.[1] === y;
        drawTile(ctx, x, y, cam, tile.type, tile.level, isHover);
      }
    }
  }, [gameState, camera, hoverTile]);

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
    if (e.button === 2 || e.button === 1) {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    } else {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    }
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
    const wasDragging = dragRef.current.dragging;
    const dx = Math.abs(e.clientX - dragRef.current.lastX);
    const dy = Math.abs(e.clientY - dragRef.current.lastY);
    dragRef.current.dragging = false;

    // Only place if wasn't a drag
    if (dx < 5 && dy < 5 && e.button === 0) {
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
    setCamera(c => ({
      ...c,
      zoom: Math.max(0.3, Math.min(3, c.zoom - e.deltaY * 0.001)),
    }));
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
