import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState, Tile, TileType, Resources, RCIDemand, BudgetEntry, Agent,
  TILE_COSTS, TILE_MAINTENANCE, SERVICE_CAPACITY, OverlayType, DRAGGABLE_TYPES,
} from '@/types/game';
import { generateTerrain } from '@/lib/terrainGen';
import { calculateServiceCoverage } from '@/lib/serviceCoverage';
import { spawnAgents, updateAgents } from '@/lib/agents';

const GRID_SIZE = 64;
const MAX_BUDGET_HISTORY = 100;

const initialResources: Resources = {
  money: 15000,
  population: 0,
  happiness: 75,
  power: 0,
  maxPower: 0,
  waterSupply: 0,
  maxWaterSupply: 0,
  sewageCapacity: 0,
  maxSewageCapacity: 0,
  demand: { residential: 0.5, commercial: 0, industrial: 0 },
};

function calculateRCIDemand(grid: Tile[][], coverage: ReturnType<typeof calculateServiceCoverage>): RCIDemand {
  let R = 0, C = 0, I = 0;
  let totalRLevel = 0, totalCLevel = 0, totalILevel = 0;
  let roadCount = 0, parkCount = 0, powerCount = 0;
  let waterPumpCount = 0, serviceCount = 0, eduCount = 0, transportCount = 0;

  for (const row of grid) {
    for (const tile of row) {
      switch (tile.type) {
        case 'residential': R++; totalRLevel += tile.level; break;
        case 'commercial': C++; totalCLevel += tile.level; break;
        case 'industrial': I++; totalILevel += tile.level; break;
        case 'road': roadCount++; break;
        case 'park': parkCount++; break;
        case 'power': powerCount++; break;
        case 'water_pump': waterPumpCount++; break;
        case 'school': case 'university': eduCount++; break;
        case 'bus_stop': case 'train_station': transportCount++; break;
        case 'fire_station': case 'police_station': case 'hospital': case 'sewage': serviceCount++; break;
      }
    }
  }

  const total = R + C + I || 1;
  let rDemand = 0.5 - R / total;
  let cDemand = 0.3 - C / total;
  let iDemand = 0.2 - I / total;

  const jobs = C * 20 + I * 30 + totalCLevel * 10 + totalILevel * 15;
  const workers = R * 15 + totalRLevel * 10;
  if (jobs > workers) rDemand += 0.2;
  if (workers > jobs * 1.5) { cDemand += 0.15; iDemand += 0.1; }

  const population = R * 50 + totalRLevel * 30;
  if (population > 200 && C < R * 0.4) cDemand += 0.2;
  if (I === 0 && R > 3) iDemand += 0.3;
  if (population > 500 && I < R * 0.25) iDemand += 0.15;

  if (roadCount < total * 0.3) { rDemand *= 0.8; cDemand *= 0.8; iDemand *= 0.8; }
  if (powerCount === 0 && total > 5) { rDemand *= 0.5; cDemand *= 0.5; iDemand *= 0.5; }
  if (waterPumpCount === 0 && total > 8) { rDemand *= 0.6; cDemand *= 0.6; }
  if (serviceCount > 0) { rDemand += 0.1; cDemand += 0.05; }
  if (parkCount > 0) rDemand += Math.min(0.15, parkCount * 0.03);
  // Education boosts all demand
  if (eduCount > 0) { rDemand += 0.1; cDemand += 0.1; }
  // Transport boosts commercial
  if (transportCount > 0) { cDemand += Math.min(0.15, transportCount * 0.04); }

  if (total <= 1) { rDemand = 0.6; cDemand = 0.1; iDemand = 0.1; }

  return {
    residential: Math.max(-1, Math.min(1, rDemand)),
    commercial: Math.max(-1, Math.min(1, cDemand)),
    industrial: Math.max(-1, Math.min(1, iDemand)),
  };
}

function createInitialState(): GameState {
  const grid = generateTerrain(GRID_SIZE);
  const coverage = calculateServiceCoverage(grid, GRID_SIZE);
  return {
    grid, resources: initialResources, selectedTool: 'residential',
    tick: 0, speed: 1, gridSize: GRID_SIZE, coverage, budgetHistory: [], overlay: 'none', agents: [],
  };
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  const selectTool = useCallback((tool: TileType | 'bulldoze') => {
    setGameState(prev => ({ ...prev, selectedTool: tool }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setGameState(prev => ({ ...prev, speed }));
  }, []);

  const setOverlay = useCallback((overlay: OverlayType) => {
    setGameState(prev => ({ ...prev, overlay }));
  }, []);

  // Place a single tile
  const placeTile = useCallback((x: number, y: number) => {
    setGameState(prev => {
      const tool = prev.selectedTool;
      const currentTile = prev.grid[y]?.[x];
      if (!currentTile) return prev;
      if (currentTile.type === 'water') return prev;

      if (tool === 'bulldoze') {
        if (['grass', 'water', 'sand', 'forest'].includes(currentTile.type)) return prev;
        if (prev.resources.money < TILE_COSTS.bulldoze) return prev;
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
        newGrid[y][x] = { ...newGrid[y][x], type: 'grass', level: 0 };
        const coverage = calculateServiceCoverage(newGrid, GRID_SIZE);
        return {
          ...prev, grid: newGrid, coverage,
          resources: { ...prev.resources, money: prev.resources.money - TILE_COSTS.bulldoze, demand: calculateRCIDemand(newGrid, coverage) },
        };
      }

      if (!['grass', 'sand', 'forest'].includes(currentTile.type)) return prev;
      const cost = TILE_COSTS[tool];
      if (prev.resources.money < cost) return prev;

      const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
      newGrid[y][x] = { ...newGrid[y][x], type: tool, level: 1 };

      const newResources = { ...prev.resources, money: prev.resources.money - cost };
      if (tool === 'power') newResources.maxPower += 100;
      if (tool === 'water_pump') newResources.maxWaterSupply += (SERVICE_CAPACITY.water_pump || 150);
      if (tool === 'sewage') newResources.maxSewageCapacity += (SERVICE_CAPACITY.sewage || 120);

      const coverage = calculateServiceCoverage(newGrid, GRID_SIZE);
      newResources.demand = calculateRCIDemand(newGrid, coverage);

      return { ...prev, grid: newGrid, resources: newResources, coverage };
    });
  }, []);

  // Place tiles along a line (for drag placement)
  const placeTileLine = useCallback((tiles: { x: number; y: number }[]) => {
    setGameState(prev => {
      const tool = prev.selectedTool;
      let money = prev.resources.money;
      const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
      let changed = false;

      for (const { x, y } of tiles) {
        const currentTile = newGrid[y]?.[x];
        if (!currentTile) continue;
        if (currentTile.type === 'water') continue;

        if (tool === 'bulldoze') {
          if (['grass', 'water', 'sand', 'forest'].includes(currentTile.type)) continue;
          if (money < TILE_COSTS.bulldoze) continue;
          newGrid[y][x] = { ...newGrid[y][x], type: 'grass', level: 0 };
          money -= TILE_COSTS.bulldoze;
          changed = true;
        } else {
          if (!['grass', 'sand', 'forest'].includes(currentTile.type)) continue;
          const cost = TILE_COSTS[tool];
          if (money < cost) continue;
          newGrid[y][x] = { ...newGrid[y][x], type: tool, level: 1 };
          money -= cost;
          changed = true;
        }
      }

      if (!changed) return prev;

      const coverage = calculateServiceCoverage(newGrid, GRID_SIZE);
      const newResources = { ...prev.resources, money, demand: calculateRCIDemand(newGrid, coverage) };
      return { ...prev, grid: newGrid, resources: newResources, coverage };
    });
  }, []);

  // Simulation tick
  useEffect(() => {
    if (gameState.speed === 0) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        const newTick = prev.tick + 1;
        let { money, population, happiness, power, maxPower, waterSupply, maxWaterSupply, sewageCapacity, maxSewageCapacity } = prev.resources;
        const demand = prev.resources.demand;

        let rCount = 0, cCount = 0, iCount = 0;
        let parkCount = 0, roadCount = 0, powerPlantCount = 0;
        let totalRLevel = 0, totalCLevel = 0, totalILevel = 0;
        let waterPumpCount = 0, sewageCount = 0;
        let fireCount = 0, policeCount = 0, hospitalCount = 0;
        let schoolCount = 0, uniCount = 0, busCount = 0, trainCount = 0;

        const newGrid = prev.grid.map(row =>
          row.map(tile => {
            const t = { ...tile };
            switch (t.type) {
              case 'residential': rCount++; totalRLevel += t.level; break;
              case 'commercial': cCount++; totalCLevel += t.level; break;
              case 'industrial': iCount++; totalILevel += t.level; break;
              case 'park': parkCount++; break;
              case 'road': roadCount++; break;
              case 'power': powerPlantCount++; break;
              case 'water_pump': waterPumpCount++; break;
              case 'sewage': sewageCount++; break;
              case 'fire_station': fireCount++; break;
              case 'police_station': policeCount++; break;
              case 'hospital': hospitalCount++; break;
              case 'school': schoolCount++; break;
              case 'university': uniCount++; break;
              case 'bus_stop': busCount++; break;
              case 'train_station': trainCount++; break;
            }

            if (newTick % 8 === 0 && t.level > 0 && t.level < 3) {
              const cov = prev.coverage;
              const svcBonus = (cov.fire[t.y]?.[t.x] || 0) * 0.08 +
                (cov.police[t.y]?.[t.x] || 0) * 0.08 +
                (cov.waterSupply[t.y]?.[t.x] || 0) * 0.1 +
                (cov.education[t.y]?.[t.x] || 0) * 0.15 +
                (cov.transport[t.y]?.[t.x] || 0) * 0.1;

              if (t.type === 'residential' && demand.residential > 0.1) {
                if (Math.random() < (0.1 + svcBonus) * demand.residential) t.level = Math.min(3, t.level + 1);
              }
              if (t.type === 'commercial' && demand.commercial > 0.1) {
                if (Math.random() < (0.08 + svcBonus) * demand.commercial) t.level = Math.min(3, t.level + 1);
              }
              if (t.type === 'industrial' && demand.industrial > 0.1) {
                if (Math.random() < (0.08 + svcBonus * 0.5) * demand.industrial) t.level = Math.min(3, t.level + 1);
              }
            }

            if (newTick % 20 === 0 && t.level > 1) {
              if (t.type === 'residential' && demand.residential < -0.3 && Math.random() < 0.1) t.level--;
              if (t.type === 'commercial' && demand.commercial < -0.3 && Math.random() < 0.1) t.level--;
              if (t.type === 'industrial' && demand.industrial < -0.3 && Math.random() < 0.1) t.level--;
            }

            return t;
          })
        );

        population = rCount * 50 + totalRLevel * 30;
        maxPower = powerPlantCount * 100;
        power = rCount * 10 + cCount * 15 + iCount * 25;
        maxWaterSupply = waterPumpCount * (SERVICE_CAPACITY.water_pump || 150);
        waterSupply = rCount * 8 + cCount * 12 + iCount * 15;
        maxSewageCapacity = sewageCount * (SERVICE_CAPACITY.sewage || 120);
        sewageCapacity = rCount * 6 + cCount * 10 + iCount * 20;

        const taxIncome = cCount * 10 + totalCLevel * 5;
        const industrialIncome = iCount * 15 + totalILevel * 8;
        const totalIncome = taxIncome + industrialIncome;

        let totalExpenses = rCount * 3;
        for (const [type, cost] of Object.entries(TILE_MAINTENANCE)) {
          let count = 0;
          switch (type) {
            case 'fire_station': count = fireCount; break;
            case 'police_station': count = policeCount; break;
            case 'hospital': count = hospitalCount; break;
            case 'water_pump': count = waterPumpCount; break;
            case 'sewage': count = sewageCount; break;
            case 'power': count = powerPlantCount; break;
            case 'park': count = parkCount; break;
            case 'road': count = roadCount; break;
            case 'school': count = schoolCount; break;
            case 'university': count = uniCount; break;
            case 'bus_stop': count = busCount; break;
            case 'train_station': count = trainCount; break;
          }
          totalExpenses += count * (cost as number);
        }

        const netIncome = totalIncome - totalExpenses;
        money = Math.max(0, money + netIncome);

        const parkBonus = Math.min(20, parkCount * 3);
        const roadBonus = Math.min(8, roadCount * 0.5);
        const industrialPenalty = Math.min(15, iCount * 2);
        const powerPenalty = power > maxPower ? 15 : 0;
        const waterPenalty = waterSupply > maxWaterSupply ? 10 : 0;
        const sewagePenalty = sewageCapacity > maxSewageCapacity ? 8 : 0;
        const jobSatisfaction = cCount + iCount >= rCount * 0.4 ? 8 : -8;
        const fireBonus = Math.min(10, fireCount * 5);
        const policeBonus = Math.min(10, policeCount * 5);
        const healthBonus = Math.min(10, hospitalCount * 5);
        const eduBonus = Math.min(12, (schoolCount * 4 + uniCount * 6));
        const transportBonus = Math.min(8, (busCount * 3 + trainCount * 5));

        happiness = Math.max(0, Math.min(100,
          42 + parkBonus + roadBonus + fireBonus + policeBonus + healthBonus + jobSatisfaction + eduBonus + transportBonus
          - industrialPenalty - powerPenalty - waterPenalty - sewagePenalty
        ));

        const coverage = newTick % 5 === 0 ? calculateServiceCoverage(newGrid, GRID_SIZE) : prev.coverage;
        const newDemand = calculateRCIDemand(newGrid, coverage);

        const budgetEntry: BudgetEntry = { tick: newTick, income: totalIncome, expenses: totalExpenses, balance: Math.round(money) };
        const budgetHistory = [...prev.budgetHistory, budgetEntry].slice(-MAX_BUDGET_HISTORY);

        // Update agents
        const speedMultiplier = [0, 1, 2, 3][prev.speed] || 1;
        let agents = updateAgents(prev.agents, speedMultiplier);
        if (newTick % 3 === 0) {
          agents = spawnAgents(newGrid, GRID_SIZE, agents, population);
        }

        return {
          ...prev, grid: newGrid, tick: newTick, coverage, budgetHistory, agents,
          resources: {
            money: Math.round(money), population, happiness: Math.round(happiness),
            power, maxPower, waterSupply, maxWaterSupply, sewageCapacity, maxSewageCapacity, demand: newDemand,
          },
        };
      });
    }, [1000, 1000, 500, 200][gameState.speed] || 1000);

    return () => clearInterval(interval);
  }, [gameState.speed]);

  const regenerateMap = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  return { gameState, placeTile, placeTileLine, selectTool, setSpeed, regenerateMap, setOverlay };
}
