import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Tile, TileType, Resources, TILE_COSTS } from '@/types/game';

const GRID_SIZE = 24;

function createGrid(size: number): Tile[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({
      type: 'grass' as TileType,
      level: 0,
      x,
      y,
    }))
  );
}

const initialResources: Resources = {
  money: 10000,
  population: 0,
  happiness: 75,
  power: 0,
  maxPower: 0,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>({
    grid: createGrid(GRID_SIZE),
    resources: initialResources,
    selectedTool: 'residential',
    tick: 0,
    speed: 1,
    gridSize: GRID_SIZE,
  });

  const tickRef = useRef<number>(0);

  const selectTool = useCallback((tool: TileType | 'bulldoze') => {
    setGameState(prev => ({ ...prev, selectedTool: tool }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setGameState(prev => ({ ...prev, speed }));
  }, []);

  const placeTile = useCallback((x: number, y: number) => {
    setGameState(prev => {
      const tool = prev.selectedTool;
      const currentTile = prev.grid[y]?.[x];
      if (!currentTile) return prev;

      if (tool === 'bulldoze') {
        if (currentTile.type === 'grass') return prev;
        if (prev.resources.money < TILE_COSTS.bulldoze) return prev;
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
        newGrid[y][x] = { type: 'grass', level: 0, x, y };
        return {
          ...prev,
          grid: newGrid,
          resources: { ...prev.resources, money: prev.resources.money - TILE_COSTS.bulldoze },
        };
      }

      if (currentTile.type !== 'grass') return prev;
      const cost = TILE_COSTS[tool];
      if (prev.resources.money < cost) return prev;

      const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
      newGrid[y][x] = { type: tool, level: 1, x, y };
      
      const newResources = { ...prev.resources, money: prev.resources.money - cost };
      if (tool === 'power') {
        newResources.maxPower += 100;
      }

      return { ...prev, grid: newGrid, resources: newResources };
    });
  }, []);

  // Simulation tick
  useEffect(() => {
    if (gameState.speed === 0) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        const newTick = prev.tick + 1;
        let { money, population, happiness, power, maxPower } = prev.resources;

        let residentialCount = 0;
        let commercialCount = 0;
        let industrialCount = 0;
        let parkCount = 0;
        let roadCount = 0;
        let powerPlantCount = 0;

        const newGrid = prev.grid.map(row =>
          row.map(tile => {
            const t = { ...tile };
            switch (t.type) {
              case 'residential': residentialCount++; break;
              case 'commercial': commercialCount++; break;
              case 'industrial': industrialCount++; break;
              case 'park': parkCount++; break;
              case 'road': roadCount++; break;
              case 'power': powerPlantCount++; break;
            }
            // Growth: randomly level up tiles
            if (newTick % 10 === 0 && t.level > 0 && t.level < 3) {
              if (['residential', 'commercial', 'industrial'].includes(t.type)) {
                if (Math.random() < 0.15) {
                  t.level = Math.min(3, t.level + 1);
                }
              }
            }
            return t;
          })
        );

        // Calculate resources
        population = residentialCount * 50 + 
          newGrid.flat().filter(t => t.type === 'residential').reduce((sum, t) => sum + (t.level - 1) * 30, 0);
        
        maxPower = powerPlantCount * 100;
        power = Math.min(maxPower, residentialCount * 10 + commercialCount * 15 + industrialCount * 25);

        // Income per tick
        const income = commercialCount * 8 + industrialCount * 12 - residentialCount * 2;
        money = Math.max(0, money + income);

        // Happiness
        const parkBonus = Math.min(30, parkCount * 5);
        const roadBonus = Math.min(15, roadCount * 2);
        const industrialPenalty = Math.min(20, industrialCount * 3);
        const powerPenalty = power > maxPower * 0.8 ? 10 : 0;
        happiness = Math.max(0, Math.min(100, 50 + parkBonus + roadBonus - industrialPenalty - powerPenalty));

        return {
          ...prev,
          grid: newGrid,
          tick: newTick,
          resources: { money: Math.round(money), population, happiness: Math.round(happiness), power, maxPower },
        };
      });
    }, [1000, 1000, 500, 200][gameState.speed] || 1000);

    return () => clearInterval(interval);
  }, [gameState.speed]);

  return { gameState, placeTile, selectTool, setSpeed };
}
