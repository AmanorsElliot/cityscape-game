import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState, Tile, TileType, Resources, RCIDemand, BudgetEntry, Agent, Wind, SmogParticle,
  TILE_COSTS, TILE_MAINTENANCE, SERVICE_CAPACITY, POWER_OUTPUT, OverlayType, DRAGGABLE_TYPES,
  isRCIType, getMaxLevel, isAdjacentToRoad, isAdjacentToWater, ZONE_TYPES, WATER_ADJACENT_TYPES,
  TILE_SIZE,
} from '@/types/game';
import { generateTerrain } from '@/lib/terrainGen';
import { calculateServiceCoverage, calculatePowerCoverage } from '@/lib/serviceCoverage';
import { spawnAgents, updateAgents } from '@/lib/agents';
import { calculatePollutionMap, updateSmogParticles, calculateSickness, updateWind } from '@/lib/pollution';
import { findTrafficLights, updateTrafficLights } from '@/lib/trafficLights';

const GRID_SIZE = 64;
const MAX_BUDGET_HISTORY = 100;
const DAY_LENGTH = 240;

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
  sickness: 0,
  demand: { residential: 0.5, commercial: 0, industrial: 0 },
};

function countRCI(type: TileType): 'R' | 'C' | 'I' | null {
  const rci = isRCIType(type);
  if (rci === 'residential') return 'R';
  if (rci === 'commercial') return 'C';
  if (rci === 'industrial') return 'I';
  return null;
}

function popMultiplier(type: TileType): number {
  if (type.endsWith('_hi')) return 3;
  if (type.endsWith('_md')) return 2;
  return 1;
}

const POWER_TYPES: TileType[] = ['power_coal', 'power_oil', 'power_wind', 'power_solar', 'power_nuclear'];
const FIRE_TYPES: TileType[] = ['fire_station_small', 'fire_station_large'];
const POLICE_TYPES: TileType[] = ['police_station', 'police_hq', 'prison'];
const HEALTH_TYPES: TileType[] = ['clinic', 'hospital'];
const EDU_TYPES: TileType[] = ['elementary_school', 'high_school', 'university', 'library'];
const TRANSPORT_TYPES: TileType[] = ['bus_depot', 'airport', 'helipad', 'train_station'];
const WASTE_TYPES: TileType[] = ['garbage_dump', 'recycling_plant'];

function isPowerType(t: TileType) { return POWER_TYPES.includes(t); }

function createEmptyMap(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function calculateRCIDemand(grid: Tile[][], coverage: ReturnType<typeof calculateServiceCoverage>): RCIDemand {
  let R = 0, C = 0, I = 0;
  let totalRLevel = 0, totalCLevel = 0, totalILevel = 0;
  let roadCount = 0, parkCount = 0, powerCount = 0;
  let waterPumpCount = 0, serviceCount = 0, eduCount = 0, transportCount = 0;

  for (const row of grid) {
    for (const tile of row) {
      // Skip secondary tiles of multi-tile buildings
      if (tile.anchorX !== undefined) continue;

      const rci = countRCI(tile.type);
      const mult = popMultiplier(tile.type);
      if (rci === 'R') { R += mult; totalRLevel += tile.level * mult; }
      else if (rci === 'C') { C += mult; totalCLevel += tile.level * mult; }
      else if (rci === 'I') { I += mult; totalILevel += tile.level * mult; }
      else if (tile.type === 'road') roadCount++;
      else if (tile.type === 'park') parkCount++;
      else if (isPowerType(tile.type)) powerCount++;
      else if (tile.type === 'water_pump') waterPumpCount++;
      else if (EDU_TYPES.includes(tile.type)) eduCount++;
      else if (TRANSPORT_TYPES.includes(tile.type)) transportCount++;
      else if (FIRE_TYPES.includes(tile.type) || POLICE_TYPES.includes(tile.type) || HEALTH_TYPES.includes(tile.type) || tile.type === 'sewage' || WASTE_TYPES.includes(tile.type)) serviceCount++;
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
  if (eduCount > 0) { rDemand += 0.1; cDemand += 0.1; }
  if (transportCount > 0) { cDemand += Math.min(0.15, transportCount * 0.04); }

  if (total <= 1) { rDemand = 0.6; cDemand = 0.1; iDemand = 0.1; }

  return {
    residential: Math.max(-1, Math.min(1, rDemand)),
    commercial: Math.max(-1, Math.min(1, cDemand)),
    industrial: Math.max(-1, Math.min(1, iDemand)),
  };
}

const initialWind: Wind = { direction: Math.PI * 0.25, speed: 0.4 };

function createInitialState(): GameState {
  const grid = generateTerrain(GRID_SIZE);
  const coverage = calculateServiceCoverage(grid, GRID_SIZE);
  const pollutionMap = createEmptyMap(GRID_SIZE);
  const powerCoverage = calculatePowerCoverage(grid, GRID_SIZE);
  return {
    grid, resources: initialResources, selectedTool: 'residential',
    tick: 0, speed: 1, gridSize: GRID_SIZE, coverage, budgetHistory: [], overlay: 'none', agents: [],
    timeOfDay: 0, wind: initialWind, smogParticles: [], pollutionMap, powerCoverage, rotation: 0, trafficLights: [],
  };
}

/** Get the footprint [w, h] for a tool, applying rotation */
export function getFootprint(tool: TileType, rotation: number): [number, number] {
  const base = TILE_SIZE[tool] || [1, 1];
  return rotation % 2 === 0 ? [base[0], base[1]] : [base[1], base[0]];
}

/** Check if all tiles in a footprint can be placed */
function canPlaceFootprint(
  grid: Tile[][], x: number, y: number, w: number, h: number, tool: TileType, size: number
): boolean {
  // Bridges must be placed on water tiles
  if (tool === 'bridge') {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) return false;
        const tile = grid[ny][nx];
        if (tile.type !== 'water' && tile.type !== 'bridge') return false;
      }
    }
    return true;
  }

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) return false;
      const tile = grid[ny][nx];
      if (tile.type === 'water') return false;
      if (!['grass', 'sand', 'forest'].includes(tile.type)) return false;
    }
  }

  // Water adjacency check: any cell in footprint adjacent to water
  if (WATER_ADJACENT_TYPES.includes(tool)) {
    let hasWater = false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (isAdjacentToWater(grid, x + dx, y + dy, size)) hasWater = true;
      }
    }
    if (!hasWater) return false;
  }

  return true;
}

/** Place a multi-tile building on the grid */
function placeFootprint(
  grid: Tile[][], x: number, y: number, w: number, h: number, tool: TileType
): void {
  // Anchor tile at (x, y)
  grid[y][x] = { ...grid[y][x], type: tool, level: 1, anchorX: undefined, anchorY: undefined };

  // Secondary tiles reference the anchor
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (dx === 0 && dy === 0) continue;
      grid[y + dy][x + dx] = {
        ...grid[y + dy][x + dx],
        type: tool,
        level: 1,
        anchorX: x,
        anchorY: y,
      };
    }
  }
}

/** Bulldoze all tiles belonging to a multi-tile building */
function bulldozeBuilding(grid: Tile[][], x: number, y: number): boolean {
  const tile = grid[y][x];
  if (['grass', 'water', 'sand', 'forest'].includes(tile.type)) return false;

  // Find anchor
  const ax = tile.anchorX ?? x;
  const ay = tile.anchorY ?? y;
  const anchorTile = grid[ay][ax];
  const [bw, bh] = TILE_SIZE[anchorTile.type] || [1, 1];

  // Check if this anchor's footprint actually covers tile at (ax,ay)
  // We need to figure out the rotation - check if bw x bh covers the footprint
  // Try both orientations to find which one fits
  let w = bw, h = bh;
  // If the furthest secondary tile extends beyond bw x bh, it's rotated
  // Simple approach: scan for all tiles with same anchor
  for (let sy = 0; sy < Math.max(bw, bh); sy++) {
    for (let sx = 0; sx < Math.max(bw, bh); sx++) {
      const nx = ax + sx, ny = ay + sy;
      if (nx < grid[0].length && ny < grid.length) {
        const t = grid[ny][nx];
        if ((t.anchorX === ax && t.anchorY === ay) || (nx === ax && ny === ay && t.type === anchorTile.type)) {
          w = Math.max(w, sx + 1);
          h = Math.max(h, sy + 1);
        }
      }
    }
  }

  // Clear all tiles in the footprint
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const nx = ax + dx, ny = ay + dy;
      if (nx < grid[0].length && ny < grid.length) {
        const t = grid[ny][nx];
        if ((t.anchorX === ax && t.anchorY === ay) || (nx === ax && ny === ay)) {
          // Bridges revert to water when bulldozed
          const revertType = anchorTile.type === 'bridge' ? 'water' : 'grass';
          grid[ny][nx] = { ...grid[ny][nx], type: revertType as TileType, level: 0, anchorX: undefined, anchorY: undefined };
        }
      }
    }
  }
  return true;
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

  const setRotation = useCallback((rotation: number) => {
    setGameState(prev => ({ ...prev, rotation }));
  }, []);

  const placeTile = useCallback((x: number, y: number) => {
    setGameState(prev => {
      const tool = prev.selectedTool;
      const currentTile = prev.grid[y]?.[x];
      if (!currentTile) return prev;

      if (tool === 'bulldoze') {
        if (prev.resources.money < TILE_COSTS.bulldoze) return prev;
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
        if (!bulldozeBuilding(newGrid, x, y)) return prev;
        const coverage = calculateServiceCoverage(newGrid, GRID_SIZE);
        const powerCoverage = calculatePowerCoverage(newGrid, GRID_SIZE);
        const trafficLights = findTrafficLights(newGrid, GRID_SIZE);
        return {
          ...prev, grid: newGrid, coverage, powerCoverage, trafficLights,
          resources: { ...prev.resources, money: prev.resources.money - TILE_COSTS.bulldoze, demand: calculateRCIDemand(newGrid, coverage) },
        };
      }

      const [fw, fh] = getFootprint(tool, prev.rotation);

      if (!canPlaceFootprint(prev.grid, x, y, fw, fh, tool, GRID_SIZE)) return prev;

      // Zone adjacency check (at least one tile in footprint must be adjacent to road)
      if (ZONE_TYPES.includes(tool)) {
        let hasRoad = false;
        for (let dy = 0; dy < fh && !hasRoad; dy++) {
          for (let dx = 0; dx < fw && !hasRoad; dx++) {
            if (isAdjacentToRoad(prev.grid, x + dx, y + dy, GRID_SIZE)) hasRoad = true;
          }
        }
        if (!hasRoad) return prev;
      }

      const cost = TILE_COSTS[tool];
      if (prev.resources.money < cost) return prev;

      const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
      placeFootprint(newGrid, x, y, fw, fh, tool);

      const newResources = { ...prev.resources, money: prev.resources.money - cost };
      if (isPowerType(tool)) newResources.maxPower += (POWER_OUTPUT[tool] || 100);
      if (tool === 'water_pump') newResources.maxWaterSupply += (SERVICE_CAPACITY.water_pump || 150);
      if (tool === 'sewage') newResources.maxSewageCapacity += (SERVICE_CAPACITY.sewage || 120);

      const coverage = calculateServiceCoverage(newGrid, GRID_SIZE);
      const powerCoverage = calculatePowerCoverage(newGrid, GRID_SIZE);
      newResources.demand = calculateRCIDemand(newGrid, coverage);

      const trafficLights = tool === 'road' ? findTrafficLights(newGrid, GRID_SIZE) : prev.trafficLights;
      return { ...prev, grid: newGrid, resources: newResources, coverage, powerCoverage, trafficLights };
    });
  }, []);

  const placeTileLine = useCallback((tiles: { x: number; y: number }[]) => {
    setGameState(prev => {
      const tool = prev.selectedTool;
      let money = prev.resources.money;
      const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
      let changed = false;

      for (const { x, y } of tiles) {
        const currentTile = newGrid[y]?.[x];
        if (!currentTile) continue;
        if (currentTile.type === 'water' && tool !== 'bridge') continue;

        if (tool === 'bulldoze') {
          if (money < TILE_COSTS.bulldoze) continue;
          if (bulldozeBuilding(newGrid, x, y)) {
            money -= TILE_COSTS.bulldoze;
            changed = true;
          }
        } else {
          const [fw, fh] = getFootprint(tool, prev.rotation);
          if (!canPlaceFootprint(newGrid, x, y, fw, fh, tool, GRID_SIZE)) continue;
          if (ZONE_TYPES.includes(tool)) {
            let hasRoad = false;
            for (let dy = 0; dy < fh && !hasRoad; dy++) {
              for (let dx = 0; dx < fw && !hasRoad; dx++) {
                if (isAdjacentToRoad(newGrid, x + dx, y + dy, GRID_SIZE)) hasRoad = true;
              }
            }
            if (!hasRoad) continue;
          }
          const cost = TILE_COSTS[tool];
          if (money < cost) continue;
          placeFootprint(newGrid, x, y, fw, fh, tool);
          money -= cost;
          changed = true;
        }
      }

      if (!changed) return prev;

      const coverage = calculateServiceCoverage(newGrid, GRID_SIZE);
      const powerCoverage = calculatePowerCoverage(newGrid, GRID_SIZE);
      const newResources = { ...prev.resources, money, demand: calculateRCIDemand(newGrid, coverage) };
      const trafficLights = (tool === 'road' || tool === 'bulldoze') ? findTrafficLights(newGrid, GRID_SIZE) : prev.trafficLights;
      return { ...prev, grid: newGrid, resources: newResources, coverage, powerCoverage, trafficLights };
    });
  }, []);

  // Simulation tick
  useEffect(() => {
    if (gameState.speed === 0) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        const newTick = prev.tick + 1;
        const timeOfDay = (prev.timeOfDay + 1) % DAY_LENGTH;
        let { money, population, happiness, power, maxPower, waterSupply, maxWaterSupply, sewageCapacity, maxSewageCapacity } = prev.resources;
        const demand = prev.resources.demand;

        let rCount = 0, cCount = 0, iCount = 0;
        let parkCount = 0, roadCount = 0;
        let totalRLevel = 0, totalCLevel = 0, totalILevel = 0;
        let waterPumpCount = 0, sewageCount = 0;
        let totalPowerOutput = 0;
        const serviceCountMap: Partial<Record<TileType, number>> = {};

        const newGrid = prev.grid.map(row =>
          row.map(tile => {
            const t = { ...tile };
            // Skip secondary tiles for counting
            if (t.anchorX !== undefined) return t;

            const rci = countRCI(t.type);
            const mult = popMultiplier(t.type);
            if (rci === 'R') { rCount += mult; totalRLevel += t.level * mult; }
            else if (rci === 'C') { cCount += mult; totalCLevel += t.level * mult; }
            else if (rci === 'I') { iCount += mult; totalILevel += t.level * mult; }
            else if (t.type === 'park') parkCount++;
            else if (t.type === 'road') roadCount++;
            else if (isPowerType(t.type)) totalPowerOutput += (POWER_OUTPUT[t.type] || 100);
            else if (t.type === 'water_pump') waterPumpCount++;
            else if (t.type === 'sewage') sewageCount++;
            else {
              serviceCountMap[t.type] = (serviceCountMap[t.type] || 0) + 1;
            }

            if (newTick % 8 === 0 && t.level > 0) {
              const maxLvl = getMaxLevel(t.type);
              if (t.level < maxLvl) {
                const cov = prev.coverage;
                const svcBonus = (cov.fire[t.y]?.[t.x] || 0) * 0.08 +
                  (cov.police[t.y]?.[t.x] || 0) * 0.08 +
                  (cov.waterSupply[t.y]?.[t.x] || 0) * 0.1 +
                  (cov.education[t.y]?.[t.x] || 0) * 0.15 +
                  (cov.transport[t.y]?.[t.x] || 0) * 0.1;

                // Require road-connected water and power for growth
                const hasWater = (cov.waterSupply[t.y]?.[t.x] || 0) > 0.1;
                const hasPower = (prev.powerCoverage?.[t.y]?.[t.x] || 0) > 0.1;
                const utilityMult = hasWater && hasPower ? 1.0 : hasWater || hasPower ? 0.3 : 0.05;

                if (rci === 'R' && demand.residential > 0.1) {
                  if (Math.random() < (0.1 + svcBonus) * demand.residential * utilityMult) t.level = Math.min(maxLvl, t.level + 1);
                }
                if (rci === 'C' && demand.commercial > 0.1) {
                  if (Math.random() < (0.08 + svcBonus) * demand.commercial * utilityMult) t.level = Math.min(maxLvl, t.level + 1);
                }
                if (rci === 'I' && demand.industrial > 0.1) {
                  if (Math.random() < (0.08 + svcBonus * 0.5) * demand.industrial * utilityMult) t.level = Math.min(maxLvl, t.level + 1);
                }
              }
            }

            if (newTick % 20 === 0 && t.level > 1) {
              if (rci === 'R' && demand.residential < -0.3 && Math.random() < 0.1) t.level--;
              if (rci === 'C' && demand.commercial < -0.3 && Math.random() < 0.1) t.level--;
              if (rci === 'I' && demand.industrial < -0.3 && Math.random() < 0.1) t.level--;
            }

            return t;
          })
        );

        population = rCount * 50 + totalRLevel * 30;
        maxPower = totalPowerOutput;
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
          const count = serviceCountMap[type as TileType] || 0;
          let extra = 0;
          if (type === 'road') extra = roadCount;
          else if (type === 'park') extra = parkCount;
          totalExpenses += (count + extra) * (cost as number);
        }

        const netIncome = totalIncome - totalExpenses;
        money = Math.max(0, money + netIncome);

        const fireCount = (serviceCountMap['fire_station_small'] || 0) + (serviceCountMap['fire_station_large'] || 0);
        const policeCount = (serviceCountMap['police_station'] || 0) + (serviceCountMap['police_hq'] || 0);
        const healthCount = (serviceCountMap['clinic'] || 0) + (serviceCountMap['hospital'] || 0);
        const eduCount = (serviceCountMap['elementary_school'] || 0) + (serviceCountMap['high_school'] || 0) + (serviceCountMap['university'] || 0) + (serviceCountMap['library'] || 0);
        const transportCount = (serviceCountMap['bus_depot'] || 0) + (serviceCountMap['airport'] || 0) + (serviceCountMap['helipad'] || 0) + (serviceCountMap['train_station'] || 0);

        // Wind & pollution update
        const newWind = updateWind(prev.wind, newTick);
        const pollutionMap = newTick % 10 === 0 ? calculatePollutionMap(newGrid, GRID_SIZE, newWind) : prev.pollutionMap;
        const sickness = newTick % 10 === 0 ? calculateSickness(newGrid, GRID_SIZE, pollutionMap, newWind) : prev.resources.sickness;

        const speedMultiplier = [0, 1, 2, 3][prev.speed] || 1;
        const smogParticles = updateSmogParticles(prev.smogParticles, newGrid, GRID_SIZE, newWind, speedMultiplier);

        const parkBonus = Math.min(20, parkCount * 3);
        const roadBonus = Math.min(8, roadCount * 0.5);
        const industrialPenalty = Math.min(15, iCount * 2);
        const powerPenalty = power > maxPower ? 15 : 0;
        const waterPenalty = waterSupply > maxWaterSupply ? 10 : 0;
        const sewagePenalty = sewageCapacity > maxSewageCapacity ? 8 : 0;
        const sicknessPenalty = Math.min(20, sickness * 0.3);
        const jobSatisfaction = cCount + iCount >= rCount * 0.4 ? 8 : -8;
        const fireBonus = Math.min(10, fireCount * 5);
        const policeBonus = Math.min(10, policeCount * 5);
        const healthBonus = Math.min(10, healthCount * 5);
        const eduBonus = Math.min(12, eduCount * 4);
        const transportBonus = Math.min(8, transportCount * 3);

        happiness = Math.max(0, Math.min(100,
          42 + parkBonus + roadBonus + fireBonus + policeBonus + healthBonus + jobSatisfaction + eduBonus + transportBonus
          - industrialPenalty - powerPenalty - waterPenalty - sewagePenalty - sicknessPenalty
        ));

        const coverage = newTick % 5 === 0 ? calculateServiceCoverage(newGrid, GRID_SIZE) : prev.coverage;
        const powerCoverage = newTick % 5 === 0 ? calculatePowerCoverage(newGrid, GRID_SIZE) : prev.powerCoverage;
        const newDemand = calculateRCIDemand(newGrid, coverage);

        const budgetEntry: BudgetEntry = { tick: newTick, income: totalIncome, expenses: totalExpenses, balance: Math.round(money) };
        const budgetHistory = [...prev.budgetHistory, budgetEntry].slice(-MAX_BUDGET_HISTORY);

        // Update traffic lights
        let trafficLights = updateTrafficLights(prev.trafficLights);
        // Rebuild traffic light positions when grid changes
        if (newTick % 10 === 0) {
          const newLights = findTrafficLights(newGrid, GRID_SIZE);
          // Preserve existing light states where possible
          const existingMap = new Map(trafficLights.map(l => [`${l.x},${l.y}`, l]));
          trafficLights = newLights.map(nl => existingMap.get(`${nl.x},${nl.y}`) || nl);
        }

        let agents = updateAgents(prev.agents, speedMultiplier, trafficLights);
        if (newTick % 3 === 0) {
          agents = spawnAgents(newGrid, GRID_SIZE, agents, population);
        }

        return {
          ...prev, grid: newGrid, tick: newTick, coverage, powerCoverage, budgetHistory, agents, timeOfDay,
          wind: newWind, smogParticles, pollutionMap, trafficLights,
          resources: {
            money: Math.round(money), population, happiness: Math.round(happiness),
            power, maxPower, waterSupply, maxWaterSupply, sewageCapacity, maxSewageCapacity,
            sickness: Math.round(sickness), demand: newDemand,
          },
        };
      });
    }, [1000, 1000, 500, 200][gameState.speed] || 1000);

    return () => clearInterval(interval);
  }, [gameState.speed]);

  const regenerateMap = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  const loadSave = useCallback((data: { grid_data: any; resources: any; tick: number; time_of_day: number }) => {
    setGameState(prev => {
      const grid: Tile[][] = (data.grid_data as any[][]).map(row =>
        row.map(t => ({ type: t.type as TileType, level: t.level, x: t.x, y: t.y, elevation: t.elevation, anchorX: t.anchorX, anchorY: t.anchorY }))
      );
      const coverage = calculateServiceCoverage(grid, GRID_SIZE);
      const powerCoverage = calculatePowerCoverage(grid, GRID_SIZE);
      return {
        ...prev,
        grid,
        resources: { ...initialResources, ...data.resources },
        tick: data.tick || 0,
        timeOfDay: data.time_of_day || 0,
        coverage,
        powerCoverage,
        agents: [],
      };
    });
  }, []);

  return { gameState, placeTile, placeTileLine, selectTool, setSpeed, regenerateMap, setOverlay, loadSave, setRotation };
}
