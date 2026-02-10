import { Agent, Tile, TileType } from '@/types/game';

const AGENT_COLORS = {
  car: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#ffffff', '#1e293b'],
  bus: ['#fbbf24', '#22c55e'],
  pedestrian: ['#d4d4d8', '#a3a3a3', '#fca5a5', '#93c5fd', '#86efac'],
};

let nextId = 0;

function findRoads(grid: Tile[][], size: number): { x: number; y: number }[] {
  const roads: { x: number; y: number }[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].type === 'road') roads.push({ x, y });
    }
  }
  return roads;
}

function findRandomPath(grid: Tile[][], size: number, start: { x: number; y: number }, maxLen: number): { x: number; y: number }[] {
  const path = [start];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  let current = start;

  for (let i = 0; i < maxLen; i++) {
    const dirs = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ].filter(d => {
      if (d.x < 0 || d.x >= size || d.y < 0 || d.y >= size) return false;
      if (visited.has(`${d.x},${d.y}`)) return false;
      const t = grid[d.y][d.x].type;
      return t === 'road' || t === 'bus_stop' || t === 'train_station';
    });

    if (dirs.length === 0) break;
    // Prefer continuing in the same direction for smoother paths
    let next: { x: number; y: number };
    if (path.length >= 2 && Math.random() < 0.6) {
      const prevDir = { x: current.x - path[path.length - 2].x, y: current.y - path[path.length - 2].y };
      const straight = dirs.find(d => d.x - current.x === prevDir.x && d.y - current.y === prevDir.y);
      next = straight || dirs[Math.floor(Math.random() * dirs.length)];
    } else {
      next = dirs[Math.floor(Math.random() * dirs.length)];
    }
    visited.add(`${next.x},${next.y}`);
    path.push(next);
    current = next;
  }

  return path;
}

export function spawnAgents(grid: Tile[][], size: number, existingAgents: Agent[], population: number): Agent[] {
  const roads = findRoads(grid, size);
  if (roads.length < 2) return existingAgents;

  const targetCount = Math.min(120, Math.floor(population / 30) + Math.floor(roads.length / 6));

  // Remove dead agents
  let agents = existingAgents.filter(a => a.pathIndex < a.path.length - 1);

  while (agents.length < targetCount) {
    const startRoad = roads[Math.floor(Math.random() * roads.length)];
    const path = findRandomPath(grid, size, startRoad, 10 + Math.floor(Math.random() * 15));
    if (path.length < 2) continue;

    let type: 'car' | 'bus' | 'pedestrian' = 'car';
    const roll = Math.random();
    if (roll < 0.12) type = 'bus';
    else if (roll < 0.30) type = 'pedestrian';

    const colors = AGENT_COLORS[type];
    agents.push({
      id: nextId++,
      x: path[0].x,
      y: path[0].y,
      targetX: path[1].x,
      targetY: path[1].y,
      progress: 0,
      type,
      color: colors[Math.floor(Math.random() * colors.length)],
      path,
      pathIndex: 0,
      speed: type === 'car' ? 0.025 + Math.random() * 0.015 : type === 'bus' ? 0.018 : 0.012,
    });
  }

  return agents;
}

export function updateAgents(agents: Agent[], speedMultiplier: number): Agent[] {
  return agents.map(agent => {
    const a = { ...agent };
    a.progress += a.speed * speedMultiplier;

    if (a.progress >= 1) {
      a.pathIndex++;
      if (a.pathIndex >= a.path.length - 1) {
        a.progress = 1;
        return a;
      }
      a.progress -= 1;
      a.x = a.path[a.pathIndex].x;
      a.y = a.path[a.pathIndex].y;
      a.targetX = a.path[a.pathIndex + 1].x;
      a.targetY = a.path[a.pathIndex + 1].y;
    }

    return a;
  });
}
