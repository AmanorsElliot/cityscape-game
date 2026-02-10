import { Tile, TileType } from '@/types/game';

// Simple seeded pseudo-random
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simplified value noise
function generateNoiseMap(size: number, scale: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  // Generate coarse grid
  const coarseSize = Math.ceil(size / scale) + 2;
  const coarse: number[][] = Array.from({ length: coarseSize }, () =>
    Array.from({ length: coarseSize }, () => rand())
  );

  // Interpolate
  const map: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x / scale;
      const fy = y / scale;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const dx = fx - ix;
      const dy = fy - iy;

      // Smoothstep
      const sx = dx * dx * (3 - 2 * dx);
      const sy = dy * dy * (3 - 2 * dy);

      const v00 = coarse[iy]?.[ix] ?? 0;
      const v10 = coarse[iy]?.[ix + 1] ?? 0;
      const v01 = coarse[iy + 1]?.[ix] ?? 0;
      const v11 = coarse[iy + 1]?.[ix + 1] ?? 0;

      const top = v00 + sx * (v10 - v00);
      const bottom = v01 + sx * (v11 - v01);
      map[y][x] = top + sy * (bottom - top);
    }
  }
  return map;
}

// Combine multiple octaves of noise for more natural terrain
function fbmNoise(size: number, seed: number): number[][] {
  const map1 = generateNoiseMap(size, 12, seed);
  const map2 = generateNoiseMap(size, 6, seed + 1000);
  const map3 = generateNoiseMap(size, 3, seed + 2000);

  const result: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      result[y][x] = map1[y][x] * 0.5 + map2[y][x] * 0.3 + map3[y][x] * 0.2;
    }
  }
  return result;
}

// Generate a river path using random walk
function generateRiver(size: number, rand: () => number): boolean[][] {
  const river: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Start from a random edge
  const side = Math.floor(rand() * 4);
  let x: number, y: number;
  let dx: number, dy: number;

  switch (side) {
    case 0: x = Math.floor(rand() * size); y = 0; dx = 0; dy = 1; break;
    case 1: x = Math.floor(rand() * size); y = size - 1; dx = 0; dy = -1; break;
    case 2: x = 0; y = Math.floor(rand() * size); dx = 1; dy = 0; break;
    default: x = size - 1; y = Math.floor(rand() * size); dx = -1; dy = 0; break;
  }

  const riverWidth = 2 + Math.floor(rand() * 2);
  let steps = 0;
  const maxSteps = size * 3;

  while (x >= 0 && x < size && y >= 0 && y < size && steps < maxSteps) {
    // Carve river width
    for (let ry = -riverWidth; ry <= riverWidth; ry++) {
      for (let rx = -riverWidth; rx <= riverWidth; rx++) {
        const nx = x + rx;
        const ny = y + ry;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
          const dist = Math.sqrt(rx * rx + ry * ry);
          if (dist <= riverWidth) {
            river[ny][nx] = true;
          }
        }
      }
    }

    // Move forward with some randomness
    x += dx;
    y += dy;

    // Meander
    if (rand() < 0.3) {
      if (dx === 0) { x += rand() < 0.5 ? -1 : 1; }
      else { y += rand() < 0.5 ? -1 : 1; }
    }

    // Occasionally widen for lakes
    if (rand() < 0.03) {
      const lakeRadius = 3 + Math.floor(rand() * 4);
      for (let ry = -lakeRadius; ry <= lakeRadius; ry++) {
        for (let rx = -lakeRadius; rx <= lakeRadius; rx++) {
          const nx = x + rx;
          const ny = y + ry;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            if (Math.sqrt(rx * rx + ry * ry) <= lakeRadius) {
              river[ny][nx] = true;
            }
          }
        }
      }
    }

    steps++;
  }

  return river;
}

export function generateTerrain(size: number, seed?: number): Tile[][] {
  const actualSeed = seed ?? Math.floor(Math.random() * 999999);
  const rand = mulberry32(actualSeed);

  // Generate elevation noise
  const elevation = fbmNoise(size, actualSeed);
  const moisture = fbmNoise(size, actualSeed + 5000);

  // Generate 1-2 rivers
  const riverCount = 1 + Math.floor(rand() * 2);
  const rivers: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  for (let r = 0; r < riverCount; r++) {
    const riverMap = generateRiver(size, mulberry32(actualSeed + r * 7777));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (riverMap[y][x]) rivers[y][x] = true;
      }
    }
  }

  // Generate a lake using low elevation
  const lakeThreshold = 0.28;

  // Build grid
  const grid: Tile[][] = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const elev = elevation[y][x];
      const moist = moisture[y][x];
      let type: TileType = 'grass';

      // Water from rivers
      if (rivers[y][x]) {
        type = 'water';
      }
      // Lakes from low elevation
      else if (elev < lakeThreshold) {
        type = 'water';
      }
      // Determine terrain
      else if (elev < lakeThreshold + 0.06) {
        type = 'sand'; // beach around water
      }
      else if (moist > 0.6 && elev > 0.45) {
        type = 'forest';
      }
      else {
        type = 'grass';
      }

      return {
        type,
        level: 0,
        x,
        y,
        elevation: elev,
      };
    })
  );

  // Ensure beaches around water bodies
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[y][x].type !== 'water') {
        // Check if adjacent to water
        const neighbors = [
          grid[y - 1]?.[x], grid[y + 1]?.[x],
          grid[y]?.[x - 1], grid[y]?.[x + 1],
          grid[y - 1]?.[x - 1], grid[y - 1]?.[x + 1],
          grid[y + 1]?.[x - 1], grid[y + 1]?.[x + 1],
        ];
        if (neighbors.some(n => n?.type === 'water') && grid[y][x].type === 'grass') {
          grid[y][x].type = 'sand';
        }
      }
    }
  }

  return grid;
}
