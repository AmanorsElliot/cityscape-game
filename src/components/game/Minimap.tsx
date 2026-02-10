import { useRef, useEffect } from 'react';
import { GameState, TileType } from '@/types/game';

interface Props {
  gameState: GameState;
}

const MINIMAP_SIZE = 160;

const MINIMAP_COLORS: Record<TileType, string> = {
  grass: '#3a7a33',
  residential: '#4ade80', commercial: '#60a5fa', industrial: '#fbbf24',
  residential_md: '#34d399', commercial_md: '#818cf8', industrial_md: '#fb923c',
  residential_hi: '#2dd4bf', commercial_hi: '#a78bfa', industrial_hi: '#f87171',
  road: '#64748b', park: '#34d399', rail: '#57534e', bridge: '#8B7355',
  water: '#2563eb', sand: '#e8d5a3', forest: '#1a5c1a',
  power_coal: '#6b7280', power_oil: '#78716c', power_wind: '#bae6fd',
  power_solar: '#fde047', power_nuclear: '#bef264',
  water_pump: '#38bdf8', sewage: '#a78bfa',
  garbage_dump: '#78716c', recycling_plant: '#6ee7b7',
  fire_station_small: '#fca5a5', fire_station_large: '#f87171',
  police_station: '#60a5fa', police_hq: '#3b82f6', prison: '#9ca3af',
  clinic: '#fca5a5', hospital: '#fb923c',
  elementary_school: '#bef264', high_school: '#a3e635', university: '#c084fc', library: '#fde68a',
  bus_depot: '#fde68a', airport: '#cbd5e1', helipad: '#9ca3af', train_station: '#94a3b8',
};

export default function Minimap({ gameState }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_SIZE * dpr;
    canvas.height = MINIMAP_SIZE * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'hsl(220, 20%, 6%)';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const cellSize = MINIMAP_SIZE / gameState.gridSize;
    for (let y = 0; y < gameState.gridSize; y++) {
      for (let x = 0; x < gameState.gridSize; x++) {
        const tile = gameState.grid[y][x];
        ctx.fillStyle = MINIMAP_COLORS[tile.type] || '#333';
        if (tile.level > 1) ctx.globalAlpha = 0.7 + tile.level * 0.1;
        else ctx.globalAlpha = 1;
        ctx.fillRect(x * cellSize, y * cellSize, Math.max(1, cellSize), Math.max(1, cellSize));
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'hsla(175, 70%, 45%, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  }, [gameState]);

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <canvas ref={canvasRef} style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE, display: 'block' }} />
    </div>
  );
}
