import { Tile, TileType, ServiceCoverage, SERVICE_RADIUS } from '@/types/game';

function createEmptyMap(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function applyRadialCoverage(map: number[][], cx: number, cy: number, radius: number, size: number) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const strength = 1 - (dist / radius);
        map[ny][nx] = Math.min(1, map[ny][nx] + strength);
      }
    }
  }
}

/** BFS flood-fill along road network from a source tile, applying coverage to tiles adjacent to roads */
const ROAD_NETWORK = new Set<TileType>(['road', 'bridge', 'bus_depot', 'train_station']);
const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

function applyRoadNetworkCoverage(
  map: number[][],
  grid: Tile[][],
  cx: number, cy: number,
  maxDist: number,
  size: number
) {
  // BFS from source along road-connected tiles
  const visited = new Set<string>();
  const queue: { x: number; y: number; dist: number }[] = [];

  // Start by finding adjacent road tiles to the source building
  // Also cover tiles directly adjacent to the source
  applyRadialCoverage(map, cx, cy, 2, size);

  // Find all tiles of this building (anchor system) and seed from their adjacent roads
  const anchorTile = grid[cy][cx];
  const buildingTiles: { x: number; y: number }[] = [{ x: cx, y: cy }];

  // Find all secondary tiles belonging to this building
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const t = grid[ny][nx];
      if (t.anchorX === cx && t.anchorY === cy) {
        buildingTiles.push({ x: nx, y: ny });
      }
    }
  }

  // Seed BFS from roads adjacent to any building tile
  for (const bt of buildingTiles) {
    for (const [ddx, ddy] of DIRS) {
      const rx = bt.x + ddx, ry = bt.y + ddy;
      if (rx < 0 || rx >= size || ry < 0 || ry >= size) continue;
      if (ROAD_NETWORK.has(grid[ry][rx].type)) {
        const key = `${rx},${ry}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ x: rx, y: ry, dist: 1 });
        }
      }
    }
  }

  // BFS along road network
  let head = 0;
  while (head < queue.length) {
    const { x, y, dist } = queue[head++];
    if (dist > maxDist) continue;

    const strength = Math.max(0, 1 - (dist / maxDist));

    // Apply coverage to this road tile and adjacent non-road tiles
    map[y][x] = Math.min(1, map[y][x] + strength);
    for (const [ddx, ddy] of DIRS) {
      const nx = x + ddx, ny = y + ddy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const neighborType = grid[ny][nx].type;
      if (!ROAD_NETWORK.has(neighborType)) {
        // Apply coverage to buildings adjacent to roads
        map[ny][nx] = Math.min(1, map[ny][nx] + strength * 0.8);
      }
    }

    // Continue BFS along roads
    for (const [ddx, ddy] of DIRS) {
      const nx = x + ddx, ny = y + ddy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && ROAD_NETWORK.has(grid[ny][nx].type)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, dist: dist + 1 });
      }
    }
  }
}

const FIRE_TYPES: TileType[] = ['fire_station_small', 'fire_station_large'];
const POLICE_TYPES: TileType[] = ['police_station', 'police_hq', 'prison'];
const HEALTH_TYPES: TileType[] = ['clinic', 'hospital'];
const EDU_TYPES: TileType[] = ['elementary_school', 'high_school', 'university', 'library'];
const TRANSPORT_TYPES: TileType[] = ['bus_depot', 'airport', 'helipad', 'train_station'];
const POWER_TYPES: TileType[] = ['power_coal', 'power_oil', 'power_wind', 'power_solar', 'power_nuclear'];

export function calculateServiceCoverage(grid: Tile[][], size: number): ServiceCoverage {
  const fire = createEmptyMap(size);
  const police = createEmptyMap(size);
  const health = createEmptyMap(size);
  const waterSupply = createEmptyMap(size);
  const sewage = createEmptyMap(size);
  const education = createEmptyMap(size);
  const transport = createEmptyMap(size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      // Skip secondary tiles
      if (tile.anchorX !== undefined) continue;
      const radius = SERVICE_RADIUS[tile.type];
      if (!radius) {
        // Power plants also distribute via roads
        if (POWER_TYPES.includes(tile.type)) {
          // Power uses a large road network reach
          applyRoadNetworkCoverage(waterSupply, grid, x, y, 0, size); // just mark; power is global but needs connection
        }
        continue;
      }

      if (FIRE_TYPES.includes(tile.type)) applyRadialCoverage(fire, x, y, radius, size);
      else if (POLICE_TYPES.includes(tile.type)) applyRadialCoverage(police, x, y, radius, size);
      else if (HEALTH_TYPES.includes(tile.type)) applyRadialCoverage(health, x, y, radius, size);
      // Water and sewage now distribute via road network
      else if (tile.type === 'water_pump') applyRoadNetworkCoverage(waterSupply, grid, x, y, radius, size);
      else if (tile.type === 'sewage' || tile.type === 'garbage_dump' || tile.type === 'recycling_plant') applyRoadNetworkCoverage(sewage, grid, x, y, radius, size);
      else if (EDU_TYPES.includes(tile.type)) applyRadialCoverage(education, x, y, radius, size);
      else if (TRANSPORT_TYPES.includes(tile.type)) applyRadialCoverage(transport, x, y, radius, size);
    }
  }

  return { fire, police, health, waterSupply, sewage, education, transport };
}

// --- Power network coverage (computed separately) ---
export function calculatePowerCoverage(grid: Tile[][], size: number): number[][] {
  const map = createEmptyMap(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      if (tile.anchorX !== undefined) continue;
      if (POWER_TYPES.includes(tile.type)) {
        // Power distributes through road network with large reach
        applyRoadNetworkCoverage(map, grid, x, y, 40, size);
      }
    }
  }
  return map;
}

export function calculatePopulationDensity(grid: Tile[][], size: number): number[][] {
  const map = createEmptyMap(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      if (tile.type.startsWith('residential')) {
        const density = tile.level * 0.33;
        applyRadialCoverage(map, x, y, 3, size);
        map[y][x] = Math.min(1, density);
      }
    }
  }
  return map;
}

export function calculateLandValue(grid: Tile[][], coverage: ServiceCoverage, size: number): number[][] {
  const map = createEmptyMap(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      if (tile.type === 'water' || tile.type === 'sand') continue;
      let value = 0.1;
      value += coverage.fire[y][x] * 0.12;
      value += coverage.police[y][x] * 0.12;
      value += coverage.health[y][x] * 0.12;
      value += coverage.waterSupply[y][x] * 0.12;
      value += coverage.education[y][x] * 0.2;
      value += coverage.transport[y][x] * 0.15;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
          const neighbor = grid[ny][nx];
          if (neighbor.type === 'park') value += 0.03;
          if (neighbor.type === 'water') value += 0.02;
          if (neighbor.type === 'industrial') value -= 0.04;
          if (neighbor.type === 'garbage_dump') value -= 0.06;
        }
      }
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
          if (grid[ny][nx].type === 'road') { value += 0.05; break; }
        }
      }
      map[y][x] = Math.min(1, Math.max(0, value));
    }
  }
  return map;
}

export function calculateHappinessMap(grid: Tile[][], coverage: ServiceCoverage, size: number): number[][] {
  const map = createEmptyMap(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y][x].type.startsWith('residential')) continue;
      let h = 0.35;
      h += coverage.fire[y][x] * 0.12;
      h += coverage.police[y][x] * 0.12;
      h += coverage.health[y][x] * 0.12;
      h += coverage.waterSupply[y][x] * 0.08;
      h += coverage.sewage[y][x] * 0.05;
      h += coverage.education[y][x] * 0.15;
      h += coverage.transport[y][x] * 0.1;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            if (grid[ny][nx].type === 'industrial') h -= 0.03;
            if (grid[ny][nx].type === 'garbage_dump') h -= 0.05;
          }
        }
      }
      map[y][x] = Math.min(1, Math.max(0, h));
    }
  }
  return map;
}
