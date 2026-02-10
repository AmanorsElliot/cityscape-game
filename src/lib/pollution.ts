import { Tile, TileType, Wind, SmogParticle, POLLUTION_EMISSION, POLLUTER_TYPES } from '@/types/game';

let nextSmogId = 0;

/**
 * Calculate static pollution map based on emitters and wind.
 * Each polluter emits a cone of pollution downwind.
 */
export function calculatePollutionMap(grid: Tile[][], size: number, wind: Wind): number[][] {
  const map: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const windDx = Math.cos(wind.direction);
  const windDy = Math.sin(wind.direction);
  const spread = 0.8 + wind.speed * 0.6; // how wide the cone is

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      const emission = POLLUTION_EMISSION[tile.type];
      if (!emission) continue;

      // Emit pollution downwind in a cone
      const maxDist = 8 + wind.speed * 12;
      for (let dist = 1; dist <= maxDist; dist++) {
        const strength = emission * (1 - dist / maxDist) * 0.7;
        if (strength < 0.01) break;

        // Sample points across the cone width
        const width = Math.max(1, dist * spread * 0.4);
        for (let w = -width; w <= width; w += 0.8) {
          const px = Math.round(x + windDx * dist - windDy * w);
          const py = Math.round(y + windDy * dist + windDx * w);
          if (px >= 0 && px < size && py >= 0 && py < size) {
            const lateralFalloff = 1 - Math.abs(w) / (width + 0.01);
            map[py][px] = Math.min(1, map[py][px] + strength * lateralFalloff);
          }
        }
      }

      // Also pollute the source tile
      map[y][x] = Math.min(1, map[y][x] + emission * 0.5);
    }
  }
  return map;
}

/**
 * Spawn and update smog particles that drift with wind.
 */
export function updateSmogParticles(
  particles: SmogParticle[],
  grid: Tile[][],
  size: number,
  wind: Wind,
  speedMultiplier: number
): SmogParticle[] {
  const windDx = Math.cos(wind.direction) * wind.speed;
  const windDy = Math.sin(wind.direction) * wind.speed;

  // Update existing particles
  let updated = particles.map(p => {
    const np = { ...p };
    np.x += windDx * 0.15 * speedMultiplier + (Math.random() - 0.5) * 0.05;
    np.y += windDy * 0.15 * speedMultiplier + (Math.random() - 0.5) * 0.05;
    np.opacity -= 0.003 * speedMultiplier;
    np.size += 0.005 * speedMultiplier; // slowly expand
    return np;
  }).filter(p => p.opacity > 0.02 && p.x >= -2 && p.x < size + 2 && p.y >= -2 && p.y < size + 2);

  // Spawn new particles from polluters
  const maxParticles = 200;
  if (updated.length < maxParticles) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const emission = POLLUTION_EMISSION[grid[y][x].type];
        if (!emission) continue;
        if (Math.random() < emission * 0.08 * speedMultiplier) {
          updated.push({
            id: nextSmogId++,
            x: x + (Math.random() - 0.5) * 0.8,
            y: y + (Math.random() - 0.5) * 0.8,
            size: 0.6 + Math.random() * 0.8,
            opacity: 0.15 + emission * 0.25,
            sourceType: grid[y][x].type,
          });
        }
        if (updated.length >= maxParticles) break;
      }
      if (updated.length >= maxParticles) break;
    }
  }

  return updated;
}

/**
 * Calculate sickness level based on pollution over residential areas
 * and sewage-downstream-of-water-pump contamination.
 */
export function calculateSickness(
  grid: Tile[][],
  size: number,
  pollutionMap: number[][],
  wind: Wind,
): number {
  let totalSickness = 0;
  let residentialCount = 0;

  // Find water pump and sewage positions for downstream check
  const waterPumps: { x: number; y: number }[] = [];
  const sewageOutflows: { x: number; y: number }[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].type === 'water_pump') waterPumps.push({ x, y });
      if (grid[y][x].type === 'sewage') sewageOutflows.push({ x, y });
    }
  }

  // Check if any water pump is downstream from sewage
  // "Downstream" means sewage is upwind of the water pump (so pollution flows toward pump)
  const windDx = Math.cos(wind.direction);
  const windDy = Math.sin(wind.direction);
  let waterContamination = 0;

  for (const pump of waterPumps) {
    for (const sew of sewageOutflows) {
      const dx = pump.x - sew.x;
      const dy = pump.y - sew.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      // Dot product: if positive, pump is downwind of sewage
      const dot = (dx * windDx + dy * windDy) / dist;
      if (dot > 0.3 && dist < 25) {
        // The closer and more aligned, the worse
        waterContamination += dot * (1 - dist / 25) * 30;
      }
    }
  }

  // Pollution over residential
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      if (tile.type.startsWith('residential')) {
        residentialCount++;
        totalSickness += pollutionMap[y][x] * 15; // pollution contributes to sickness
      }
    }
  }

  if (residentialCount === 0) return 0;

  const avgPollutionSickness = totalSickness / residentialCount;
  return Math.min(100, Math.max(0, avgPollutionSickness + waterContamination));
}

/**
 * Slowly shift wind direction and speed for natural variation.
 */
export function updateWind(wind: Wind, tick: number): Wind {
  // Slow sinusoidal drift with some pseudo-randomness
  const dirShift = Math.sin(tick * 0.003) * 0.01 + Math.sin(tick * 0.0071) * 0.005;
  const speedShift = Math.sin(tick * 0.005) * 0.003 + Math.sin(tick * 0.0031) * 0.002;

  return {
    direction: wind.direction + dirShift,
    speed: Math.max(0.1, Math.min(1, wind.speed + speedShift)),
  };
}
