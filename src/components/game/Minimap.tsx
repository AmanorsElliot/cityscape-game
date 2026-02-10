import { useRef, useEffect } from 'react';
import { GameState, TILE_COLORS, TileType } from '@/types/game';

interface Props {
  gameState: GameState;
}

const MINIMAP_SIZE = 160;

const MINIMAP_COLORS: Record<TileType, string> = {
  grass: '#3a7a33',
  residential: '#4ade80',
  commercial: '#60a5fa',
  industrial: '#fbbf24',
  road: '#64748b',
  park: '#34d399',
  power: '#facc15',
  water: '#2563eb',
  sand: '#e8d5a3',
  forest: '#1a5c1a',
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

    // Background
    ctx.fillStyle = 'hsl(220, 20%, 6%)';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const cellSize = MINIMAP_SIZE / gameState.gridSize;

    for (let y = 0; y < gameState.gridSize; y++) {
      for (let x = 0; x < gameState.gridSize; x++) {
        const tile = gameState.grid[y][x];
        ctx.fillStyle = MINIMAP_COLORS[tile.type] || '#333';
        
        // Brighten based on level
        if (tile.level > 1) {
          ctx.globalAlpha = 0.7 + tile.level * 0.1;
        } else {
          ctx.globalAlpha = 1;
        }
        
        ctx.fillRect(
          x * cellSize,
          y * cellSize,
          Math.max(1, cellSize),
          Math.max(1, cellSize)
        );
      }
    }

    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = 'hsla(175, 70%, 45%, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  }, [gameState]);

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{
          width: MINIMAP_SIZE,
          height: MINIMAP_SIZE,
          display: 'block',
        }}
      />
    </div>
  );
}
