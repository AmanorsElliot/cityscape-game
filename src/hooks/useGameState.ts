import { useState, useCallback, useEffect } from 'react';
import { GameState, Tile, TileType, Resources, RCIDemand, TILE_COSTS } from '@/types/game';
import { generateTerrain } from '@/lib/terrainGen';

const GRID_SIZE = 64;

const initialResources: Resources = {
  money: 15000,
  population: 0,
  happiness: 75,
  power: 0,
  maxPower: 0,
  demand: { residential: 0.5, commercial: 0, industrial: 0 },
};

function calculateRCIDemand(grid: Tile[][]): RCIDemand {
  let R = 0, C = 0, I = 0;
  let totalRLevel = 0, totalCLevel = 0, totalILevel = 0;
  let roadCount = 0, parkCount = 0, powerCount = 0;

  for (const row of grid) {
    for (const tile of row) {
      switch (tile.type) {
        case 'residential': R++; totalRLevel += tile.level; break;
        case 'commercial': C++; totalCLevel += tile.level; break;
        case 'industrial': I++; totalILevel += tile.level; break;
        case 'road': roadCount++; break;
        case 'park': parkCount++; break;
        case 'power': powerCount++; break;
      }
    }
  }

  const total = R + C + I || 1;
  const rRatio = R / total;
  const cRatio = C / total;
  const iRatio = I / total;

  // Target ratios: R=50%, C=30%, I=20%
  // Demand = how much more is needed (positive = high demand)
  let rDemand = 0.5 - rRatio;
  let cDemand = 0.3 - cRatio;
  let iDemand = 0.2 - iRatio;

  // Jobs drive residential demand: commercial and industrial create jobs
  const jobs = C * 20 + I * 30 + totalCLevel * 10 + totalILevel * 15;
  const workers = R * 15 + totalRLevel * 10;
  if (jobs > workers) rDemand += 0.2; // need more workers
  if (workers > jobs * 1.5) {
    cDemand += 0.15; // need more jobs
    iDemand += 0.1;
  }

  // Commercial demand increases with population
  const population = R * 50 + totalRLevel * 30;
  if (population > 200 && C < R * 0.4) cDemand += 0.2;

  // Industrial demand: base need for economy
  if (I === 0 && R > 3) iDemand += 0.3;
  if (population > 500 && I < R * 0.25) iDemand += 0.15;

  // Infrastructure bonuses
  if (roadCount < total * 0.3) {
    // Poor road coverage suppresses all demand slightly
    rDemand *= 0.8;
    cDemand *= 0.8;
    iDemand *= 0.8;
  }
  if (powerCount === 0 && total > 5) {
    rDemand *= 0.5;
    cDemand *= 0.5;
    iDemand *= 0.5;
  }

  // Parks boost residential demand
  if (parkCount > 0) rDemand += Math.min(0.15, parkCount * 0.03);

  // Starting demand when empty
  if (total <= 1) {
    rDemand = 0.6;
    cDemand = 0.1;
    iDemand = 0.1;
  }

  return {
    residential: Math.max(-1, Math.min(1, rDemand)),
    commercial: Math.max(-1, Math.min(1, cDemand)),
    industrial: Math.max(-1, Math.min(1, iDemand)),
  };
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(() => ({
    grid: generateTerrain(GRID_SIZE),
    resources: initialResources,
    selectedTool: 'residential',
    tick: 0,
    speed: 1,
    gridSize: GRID_SIZE,
  }));

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

      // Can't build on water
      if (currentTile.type === 'water') return prev;

      if (tool === 'bulldoze') {
        if (['grass', 'water', 'sand', 'forest'].includes(currentTile.type)) return prev;
        if (prev.resources.money < TILE_COSTS.bulldoze) return prev;
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
        newGrid[y][x] = { ...newGrid[y][x], type: 'grass', level: 0 };
        return {
          ...prev,
          grid: newGrid,
          resources: { ...prev.resources, money: prev.resources.money - TILE_COSTS.bulldoze },
        };
      }

      // Can only build on grass, sand, forest
      if (!['grass', 'sand', 'forest'].includes(currentTile.type)) return prev;
      const cost = TILE_COSTS[tool];
      if (prev.resources.money < cost) return prev;

      const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
      newGrid[y][x] = { ...newGrid[y][x], type: tool, level: 1 };

      const newResources = { ...prev.resources, money: prev.resources.money - cost };
      if (tool === 'power') {
        newResources.maxPower += 100;
      }

      // Recalculate demand after placement
      newResources.demand = calculateRCIDemand(newGrid);

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

        let residentialCount = 0, commercialCount = 0, industrialCount = 0;
        let parkCount = 0, roadCount = 0, powerPlantCount = 0;
        let totalRLevel = 0, totalCLevel = 0, totalILevel = 0;

        const demand = prev.resources.demand;

        const newGrid = prev.grid.map(row =>
          row.map(tile => {
            const t = { ...tile };
            switch (t.type) {
              case 'residential': residentialCount++; totalRLevel += t.level; break;
              case 'commercial': commercialCount++; totalCLevel += t.level; break;
              case 'industrial': industrialCount++; totalILevel += t.level; break;
              case 'park': parkCount++; break;
              case 'road': roadCount++; break;
              case 'power': powerPlantCount++; break;
            }

            // Growth based on demand — tiles only grow if demand is positive
            if (newTick % 8 === 0 && t.level > 0 && t.level < 3) {
              if (t.type === 'residential' && demand.residential > 0.1) {
                if (Math.random() < 0.12 * demand.residential) t.level = Math.min(3, t.level + 1);
              }
              if (t.type === 'commercial' && demand.commercial > 0.1) {
                if (Math.random() < 0.10 * demand.commercial) t.level = Math.min(3, t.level + 1);
              }
              if (t.type === 'industrial' && demand.industrial > 0.1) {
                if (Math.random() < 0.10 * demand.industrial) t.level = Math.min(3, t.level + 1);
              }
            }

            // Decline: if demand is very negative, buildings can downgrade
            if (newTick % 20 === 0 && t.level > 1) {
              if (t.type === 'residential' && demand.residential < -0.3 && Math.random() < 0.1) t.level--;
              if (t.type === 'commercial' && demand.commercial < -0.3 && Math.random() < 0.1) t.level--;
              if (t.type === 'industrial' && demand.industrial < -0.3 && Math.random() < 0.1) t.level--;
            }

            return t;
          })
        );

        // Calculate resources
        population = residentialCount * 50 + totalRLevel * 30;
        maxPower = powerPlantCount * 100;
        power = residentialCount * 10 + commercialCount * 15 + industrialCount * 25;

        // Income driven by commercial tax and industrial output
        const taxIncome = commercialCount * 10 + totalCLevel * 5;
        const industrialIncome = industrialCount * 15 + totalILevel * 8;
        const maintenance = residentialCount * 3 + parkCount * 2 + roadCount * 1;
        const income = taxIncome + industrialIncome - maintenance;
        money = Math.max(0, money + income);

        // Happiness
        const parkBonus = Math.min(25, parkCount * 4);
        const roadBonus = Math.min(10, roadCount * 1);
        const industrialPenalty = Math.min(20, industrialCount * 3);
        const powerPenalty = power > maxPower ? 15 : 0;
        const jobSatisfaction = commercialCount + industrialCount >= residentialCount * 0.4 ? 10 : -10;
        happiness = Math.max(0, Math.min(100, 50 + parkBonus + roadBonus - industrialPenalty - powerPenalty + jobSatisfaction));

        // Recalculate demand
        const newDemand = calculateRCIDemand(newGrid);

        return {
          ...prev,
          grid: newGrid,
          tick: newTick,
          resources: {
            money: Math.round(money),
            population,
            happiness: Math.round(happiness),
            power,
            maxPower,
            demand: newDemand,
          },
        };
      });
    }, [1000, 1000, 500, 200][gameState.speed] || 1000);

    return () => clearInterval(interval);
  }, [gameState.speed]);

  const regenerateMap = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      grid: generateTerrain(GRID_SIZE),
      resources: initialResources,
      tick: 0,
    }));
  }, []);

  return { gameState, placeTile, selectTool, setSpeed, regenerateMap };
}
