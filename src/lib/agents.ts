import { Agent, Tile, TileType, VehicleModel } from '@/types/game';
import { TrafficLight, shouldStopAtLight } from './trafficLights';

const CIVILIAN_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#ffffff', '#1e293b'];
const BUS_COLORS = ['#fbbf24', '#22c55e'];

let nextId = 0;

const ROAD_LIKE: TileType[] = ['road', 'bus_depot', 'train_station'];

// Emergency service types mapped to their vehicle
const EMERGENCY_VEHICLE_MAP: Partial<Record<TileType, VehicleModel>> = {
  fire_station_small: 'fire_truck',
  fire_station_large: 'fire_truck',
  police_station: 'police_car',
  police_hq: 'police_car',
  prison: 'police_car',
  clinic: 'ambulance',
  hospital: 'ambulance',
};

// Industrial types that should have tractors
const TRACTOR_TYPES: TileType[] = ['industrial', 'industrial_md', 'industrial_hi'];

function findRoads(grid: Tile[][], size: number): { x: number; y: number }[] {
  const roads: { x: number; y: number }[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].type === 'road') roads.push({ x, y });
    }
  }
  return roads;
}

/** Find roads adjacent to specific building types */
function findRoadsNearType(grid: Tile[][], size: number, types: TileType[]): { x: number; y: number }[] {
  const roads: { x: number; y: number }[] = [];
  const roadSet = new Set<string>();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].type !== 'road') continue;
      // Check neighbors for the target types
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
          if (types.includes(grid[ny][nx].type)) {
            const key = `${x},${y}`;
            if (!roadSet.has(key)) {
              roadSet.add(key);
              roads.push({ x, y });
            }
            break;
          }
        }
      }
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
      return ROAD_LIKE.includes(t);
    });

    if (dirs.length === 0) break;
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

/** Determine vehicle model based on spawn context */
function pickVehicleModel(grid: Tile[][], size: number, startPos: { x: number; y: number }): { vehicleModel: VehicleModel; color: string; speed: number; type: 'car' | 'bus' | 'pedestrian' } {
  const { x, y } = startPos;
  
  // Check adjacent tiles for context
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      const adjType = grid[ny][nx].type;
      
      // Emergency vehicles
      const emergencyVehicle = EMERGENCY_VEHICLE_MAP[adjType];
      if (emergencyVehicle && Math.random() < 0.35) {
        const colors: Record<string, string> = {
          fire_truck: '#cc0000',
          police_car: '#1a237e',
          ambulance: '#ffffff',
        };
        return {
          vehicleModel: emergencyVehicle,
          color: colors[emergencyVehicle] || '#ffffff',
          speed: 0.035 + Math.random() * 0.01, // faster than normal
          type: 'car',
        };
      }
      
      // Race cars from low-density residential only (high wealth = high level)
      if (adjType === 'residential') {
        const tile = grid[ny][nx];
        if (tile.level >= 2 && Math.random() < 0.08) {
          const raceColors = ['#ff0000', '#ffff00', '#00ff00', '#0066ff', '#ff6600', '#ff00ff'];
          return {
            vehicleModel: 'race_car',
            color: raceColors[Math.floor(Math.random() * raceColors.length)],
            speed: 0.045 + Math.random() * 0.015, // very fast
            type: 'car',
          };
        }
      }
      
      // Tractors near industrial
      if (TRACTOR_TYPES.includes(adjType) && Math.random() < 0.2) {
        return {
          vehicleModel: 'tractor',
          color: '#388e3c',
          speed: 0.012 + Math.random() * 0.005, // slow
          type: 'car',
        };
      }
      
      // Bus depot spawns buses
      if (adjType === 'bus_depot' && Math.random() < 0.5) {
        return {
          vehicleModel: 'bus',
          color: BUS_COLORS[Math.floor(Math.random() * BUS_COLORS.length)],
          speed: 0.018,
          type: 'bus',
        };
      }
    }
  }
  
  // Default civilian vehicles
  const roll = Math.random();
  let vehicleModel: VehicleModel;
  if (roll < 0.35) vehicleModel = 'sedan';
  else if (roll < 0.55) vehicleModel = 'suv';
  else if (roll < 0.70) vehicleModel = 'truck';
  else if (roll < 0.82) vehicleModel = 'van';
  else vehicleModel = 'taxi';
  
  return {
    vehicleModel,
    color: CIVILIAN_COLORS[Math.floor(Math.random() * CIVILIAN_COLORS.length)],
    speed: 0.025 + Math.random() * 0.015,
    type: 'car',
  };
}

export function spawnAgents(grid: Tile[][], size: number, existingAgents: Agent[], population: number): Agent[] {
  const roads = findRoads(grid, size);
  if (roads.length < 2) return existingAgents;

  const targetCount = Math.min(120, Math.floor(population / 30) + Math.floor(roads.length / 6));

  let agents = existingAgents.filter(a => a.pathIndex < a.path.length - 1);

  while (agents.length < targetCount) {
    const startRoad = roads[Math.floor(Math.random() * roads.length)];
    const path = findRandomPath(grid, size, startRoad, 10 + Math.floor(Math.random() * 15));
    if (path.length < 2) continue;

    // Check if this should be a pedestrian
    const pedRoll = Math.random();
    if (pedRoll < 0.18) {
      agents.push({
        id: nextId++,
        x: path[0].x, y: path[0].y,
        targetX: path[1].x, targetY: path[1].y,
        progress: 0,
        type: 'pedestrian',
        vehicleModel: 'sedan', // unused for pedestrians
        color: ['#d4d4d8', '#a3a3a3', '#fca5a5', '#93c5fd', '#86efac'][Math.floor(Math.random() * 5)],
        path, pathIndex: 0,
        speed: 0.012,
        stopped: false,
      });
      continue;
    }

    const vehicle = pickVehicleModel(grid, size, startRoad);
    agents.push({
      id: nextId++,
      x: path[0].x, y: path[0].y,
      targetX: path[1].x, targetY: path[1].y,
      progress: 0,
      type: vehicle.type,
      vehicleModel: vehicle.vehicleModel,
      color: vehicle.color,
      path, pathIndex: 0,
      speed: vehicle.speed,
      stopped: false,
    });
  }

  return agents;
}

/** Build a quick lookup map for traffic lights */
function buildLightMap(lights: TrafficLight[]): Map<string, TrafficLight> {
  const map = new Map<string, TrafficLight>();
  for (const l of lights) {
    map.set(`${l.x},${l.y}`, l);
  }
  return map;
}

export function updateAgents(agents: Agent[], speedMultiplier: number, trafficLights: TrafficLight[]): Agent[] {
  const lightMap = buildLightMap(trafficLights);

  return agents.map(agent => {
    const a = { ...agent };

    // Check if agent is approaching a traffic light at their target tile
    const targetKey = `${a.targetX},${a.targetY}`;
    const light = lightMap.get(targetKey);

    if (light && a.type !== 'pedestrian') {
      const dx = a.targetX - a.path[a.pathIndex].x;
      const dy = a.targetY - a.path[a.pathIndex].y;

      if (shouldStopAtLight(light, dx, dy)) {
        if (a.progress > 0.6) {
          a.stopped = true;
          return a;
        }
      }
    }

    a.stopped = false;
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
