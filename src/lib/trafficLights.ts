import { Tile, TileType } from '@/types/game';

const ROAD_LIKE = new Set<TileType>(['road', 'bus_depot', 'train_station']);
const RAIL_LIKE = new Set<TileType>(['rail', 'train_station']);

export interface TrafficLight {
  x: number;
  y: number;
  /** Which axis is green: 'ns' = north/south, 'ew' = east/west */
  greenAxis: 'ns' | 'ew';
  /** Current phase: 0=green, 1=yellow, 2=red (for greenAxis direction) */
  phase: number;
  /** Ticks remaining in current phase */
  timer: number;
}

/** Directions for neighbor checking */
const DIRS = [
  { dx: 0, dy: -1, axis: 'ns' as const }, // north
  { dx: 0, dy: 1, axis: 'ns' as const },  // south
  { dx: -1, dy: 0, axis: 'ew' as const }, // west
  { dx: 1, dy: 0, axis: 'ew' as const },  // east
];

/** Count road neighbors and which axes they're on */
export function getRoadNeighbors(grid: Tile[][], x: number, y: number, size: number) {
  let n = false, s = false, e = false, w = false;
  if (y > 0 && ROAD_LIKE.has(grid[y - 1][x].type)) n = true;
  if (y < size - 1 && ROAD_LIKE.has(grid[y + 1][x].type)) s = true;
  if (x > 0 && ROAD_LIKE.has(grid[y][x - 1].type)) w = true;
  if (x < size - 1 && ROAD_LIKE.has(grid[y][x + 1].type)) e = true;
  const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);
  return { n, s, e, w, count };
}

/** Get road variant type based on neighbors */
export type RoadVariant = 'straight_ns' | 'straight_ew' | 'corner_ne' | 'corner_nw' | 'corner_se' | 'corner_sw' | 't_n' | 't_s' | 't_e' | 't_w' | 'cross' | 'dead_n' | 'dead_s' | 'dead_e' | 'dead_w' | 'single';

export function getRoadVariant(grid: Tile[][], x: number, y: number, size: number): RoadVariant {
  const { n, s, e, w, count } = getRoadNeighbors(grid, x, y, size);

  if (count === 0) return 'single';
  if (count === 1) {
    if (n) return 'dead_n';
    if (s) return 'dead_s';
    if (e) return 'dead_e';
    return 'dead_w';
  }
  if (count === 4) return 'cross';
  if (count === 3) {
    if (!n) return 't_s'; // T pointing south (missing north)
    if (!s) return 't_n'; // T pointing north (missing south)
    if (!e) return 't_w'; // T pointing west (missing east)
    return 't_e'; // T pointing east (missing west)
  }
  // count === 2
  if (n && s) return 'straight_ns';
  if (e && w) return 'straight_ew';
  if (n && e) return 'corner_ne';
  if (n && w) return 'corner_nw';
  if (s && e) return 'corner_se';
  return 'corner_sw';
}

/** Does this tile need a traffic light? (3+ way intersection) */
export function needsTrafficLight(variant: RoadVariant): boolean {
  return variant === 'cross' || variant.startsWith('t_');
}

/** Find all intersections and create traffic lights */
export function findTrafficLights(grid: Tile[][], size: number): TrafficLight[] {
  const lights: TrafficLight[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!ROAD_LIKE.has(grid[y][x].type)) continue;
      const variant = getRoadVariant(grid, x, y, size);
      if (needsTrafficLight(variant)) {
        lights.push({
          x, y,
          greenAxis: 'ns',
          phase: 0,
          timer: 30,
        });
      }
    }
  }
  return lights;
}

/** Cycle traffic light phases. Phase durations: green=30, yellow=5, red=30, yellow=5 */
const PHASE_DURATIONS = [30, 5, 30, 5]; // green, yellow (transition), red, yellow (transition back)

export function updateTrafficLights(lights: TrafficLight[]): TrafficLight[] {
  return lights.map(light => {
    const l = { ...light };
    l.timer--;
    if (l.timer <= 0) {
      l.phase = (l.phase + 1) % 4;
      l.timer = PHASE_DURATIONS[l.phase];
      // After completing a full cycle (phase 0 again after 3), swap axis
      if (l.phase === 0) {
        l.greenAxis = l.greenAxis === 'ns' ? 'ew' : 'ns';
      }
    }
    return l;
  });
}

/** Check if an agent moving in a direction should stop at a traffic light */
export function shouldStopAtLight(
  light: TrafficLight,
  dx: number, // direction the agent is moving
  dy: number,
): boolean {
  // Determine which axis the agent is traveling on
  const agentAxis: 'ns' | 'ew' = (dy !== 0) ? 'ns' : 'ew';

  // Phase 0 = green for greenAxis, Phase 2 = red for greenAxis (green for other)
  // Phase 1,3 = yellow (both stop)
  if (light.phase === 1 || light.phase === 3) {
    // Yellow - stop if close
    return true;
  }

  if (light.phase === 0) {
    // Green for greenAxis
    return agentAxis !== light.greenAxis;
  }

  // Phase 2: Red for greenAxis = green for other axis
  return agentAxis === light.greenAxis;
}

/** Get rail neighbors for connectivity */
export function getRailNeighbors(grid: Tile[][], x: number, y: number, size: number) {
  let n = false, s = false, e = false, w = false;
  if (y > 0 && RAIL_LIKE.has(grid[y - 1][x].type)) n = true;
  if (y < size - 1 && RAIL_LIKE.has(grid[y + 1][x].type)) s = true;
  if (x > 0 && RAIL_LIKE.has(grid[y][x - 1].type)) w = true;
  if (x < size - 1 && RAIL_LIKE.has(grid[y][x + 1].type)) e = true;
  const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);
  return { n, s, e, w, count };
}

export type RailVariant = 'straight_ns' | 'straight_ew' | 'curve_ne' | 'curve_nw' | 'curve_se' | 'curve_sw' | 'dead_n' | 'dead_s' | 'dead_e' | 'dead_w' | 'single';

export function getRailVariant(grid: Tile[][], x: number, y: number, size: number): RailVariant {
  const { n, s, e, w, count } = getRailNeighbors(grid, x, y, size);

  if (count === 0) return 'single';
  if (count === 1) {
    if (n) return 'dead_n';
    if (s) return 'dead_s';
    if (e) return 'dead_e';
    return 'dead_w';
  }
  // For 3+ connections, pick the dominant straight or first curve
  if (n && s) return 'straight_ns';
  if (e && w) return 'straight_ew';
  if (n && e) return 'curve_ne';
  if (n && w) return 'curve_nw';
  if (s && e) return 'curve_se';
  return 'curve_sw';
}
