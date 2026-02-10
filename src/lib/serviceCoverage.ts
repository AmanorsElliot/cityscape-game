import { Tile, TileType, ServiceCoverage, SERVICE_RADIUS } from '@/types/game';

function createEmptyMap(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function applyRadialCoverage(
  map: number[][],
  cx: number, cy: number,
  radius: number,
  size: number
) {
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

export function calculateServiceCoverage(grid: Tile[][], size: number): ServiceCoverage {
  const fire = createEmptyMap(size);
  const police = createEmptyMap(size);
  const health = createEmptyMap(size);
  const waterSupply = createEmptyMap(size);
  const sewage = createEmptyMap(size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      const radius = SERVICE_RADIUS[tile.type];
      if (!radius) continue;

      switch (tile.type) {
        case 'fire_station': applyRadialCoverage(fire, x, y, radius, size); break;
        case 'police_station': applyRadialCoverage(police, x, y, radius, size); break;
        case 'hospital': applyRadialCoverage(health, x, y, radius, size); break;
        case 'water_pump': applyRadialCoverage(waterSupply, x, y, radius, size); break;
        case 'sewage': applyRadialCoverage(sewage, x, y, radius, size); break;
      }
    }
  }

  return { fire, police, health, waterSupply, sewage };
}

export function calculatePopulationDensity(grid: Tile[][], size: number): number[][] {
  const map = createEmptyMap(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      if (tile.type === 'residential') {
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
      // Services boost land value
      value += coverage.fire[y][x] * 0.15;
      value += coverage.police[y][x] * 0.15;
      value += coverage.health[y][x] * 0.15;
      value += coverage.waterSupply[y][x] * 0.15;

      // Parks and water proximity
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
          const neighbor = grid[ny][nx];
          if (neighbor.type === 'park') value += 0.03;
          if (neighbor.type === 'water') value += 0.02;
          if (neighbor.type === 'industrial') value -= 0.04;
        }
      }

      // Roads nearby
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
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
      if (grid[y][x].type !== 'residential') continue;
      let h = 0.4;
      h += coverage.fire[y][x] * 0.15;
      h += coverage.police[y][x] * 0.15;
      h += coverage.health[y][x] * 0.15;
      h += coverage.waterSupply[y][x] * 0.1;
      h += coverage.sewage[y][x] * 0.05;
      // Industrial penalty
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx].type === 'industrial') {
            h -= 0.03;
          }
        }
      }
      map[y][x] = Math.min(1, Math.max(0, h));
    }
  }
  return map;
}
