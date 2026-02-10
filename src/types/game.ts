export type ZoneDensity = 'low' | 'medium' | 'high';

export type TileType =
  | 'grass' | 'water' | 'sand' | 'forest'
  // Zones
  | 'residential' | 'commercial' | 'industrial'
  | 'residential_md' | 'commercial_md' | 'industrial_md'
  | 'residential_hi' | 'commercial_hi' | 'industrial_hi'
  // Roads & parks
  | 'road' | 'park'
  // Power
  | 'power_coal' | 'power_oil' | 'power_wind' | 'power_solar' | 'power_nuclear'
  // Water/Waste
  | 'water_pump' | 'sewage' | 'garbage_dump' | 'recycling_plant'
  // Services
  | 'fire_station_small' | 'fire_station_large'
  | 'police_station' | 'police_hq' | 'prison'
  | 'clinic' | 'hospital'
  // Education
  | 'elementary_school' | 'high_school' | 'university' | 'library'
  // Transit
  | 'bus_depot' | 'airport' | 'helipad' | 'train_station'
  // Rail
  | 'rail';

export const ZONE_TYPES: TileType[] = [
  'residential', 'commercial', 'industrial',
  'residential_md', 'commercial_md', 'industrial_md',
  'residential_hi', 'commercial_hi', 'industrial_hi',
];

export const DRAGGABLE_TYPES: (TileType | 'bulldoze')[] = ['road', 'rail', 'bulldoze', ...ZONE_TYPES];

// Types that must be placed adjacent to water
export const WATER_ADJACENT_TYPES: TileType[] = ['water_pump', 'sewage'];

// Types that emit air pollution
export const POLLUTER_TYPES: TileType[] = ['power_coal', 'power_oil', 'industrial', 'industrial_md', 'industrial_hi', 'garbage_dump'];

// Pollution emission strength per type
export const POLLUTION_EMISSION: Partial<Record<TileType, number>> = {
  power_coal: 1.0,
  power_oil: 0.8,
  industrial: 0.3,
  industrial_md: 0.5,
  industrial_hi: 0.8,
  garbage_dump: 0.4,
};

export function isRCIType(type: TileType): 'residential' | 'commercial' | 'industrial' | null {
  if (type.startsWith('residential')) return 'residential';
  if (type.startsWith('commercial')) return 'commercial';
  if (type.startsWith('industrial')) return 'industrial';
  return null;
}

export function getMaxLevel(type: TileType): number {
  if (type.endsWith('_hi')) return 5;
  if (type.endsWith('_md')) return 4;
  if (type === 'residential' || type === 'commercial' || type === 'industrial') return 3;
  return 3;
}

export function isAdjacentToRoad(grid: { type: TileType }[][], x: number, y: number, size: number): boolean {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx].type === 'road') return true;
  }
  return false;
}

export function isAdjacentToWater(grid: { type: TileType }[][], x: number, y: number, size: number): boolean {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx].type === 'water') return true;
  }
  return false;
}

// Tile footprint in grid cells (width x height)
export const TILE_SIZE: Partial<Record<TileType, [number, number]>> = {
  power_coal: [3, 3],
  power_oil: [3, 3],
  power_nuclear: [4, 4],
  power_wind: [2, 2],
  power_solar: [3, 2],
  water_pump: [2, 2],
  sewage: [2, 2],
  garbage_dump: [3, 3],
  recycling_plant: [3, 2],
  fire_station_small: [2, 2],
  fire_station_large: [3, 3],
  police_station: [2, 2],
  police_hq: [3, 3],
  prison: [4, 3],
  clinic: [2, 2],
  hospital: [3, 3],
  elementary_school: [2, 2],
  high_school: [3, 2],
  university: [4, 3],
  library: [2, 2],
  bus_depot: [2, 2],
  airport: [5, 4],
  helipad: [2, 2],
  train_station: [3, 2],
};

export interface Tile {
  type: TileType;
  level: number;
  x: number;
  y: number;
  elevation: number;
  anchorX?: number; // For secondary tiles of multi-tile buildings, references anchor tile
  anchorY?: number;
}

export interface RCIDemand {
  residential: number;
  commercial: number;
  industrial: number;
}

export interface BudgetEntry {
  tick: number;
  income: number;
  expenses: number;
  balance: number;
}

export interface ServiceCoverage {
  fire: number[][];
  police: number[][];
  health: number[][];
  waterSupply: number[][];
  sewage: number[][];
  education: number[][];
  transport: number[][];
}

export type OverlayType = 'none' | 'population' | 'landValue' | 'fire' | 'police' | 'health' | 'waterSupply' | 'sewage' | 'happiness' | 'education' | 'transport' | 'pollution' | 'wind';

export interface Wind {
  direction: number; // radians, 0 = east, PI/2 = south
  speed: number; // 0-1 normalized
}

export interface SmogParticle {
  id: number;
  x: number; // grid position (float)
  y: number;
  size: number; // 0.5-2
  opacity: number; // 0-0.6
  sourceType: TileType;
}

export type VehicleModel = 'sedan' | 'suv' | 'truck' | 'van' | 'taxi' | 'bus' | 'fire_truck' | 'police_car' | 'ambulance' | 'tractor' | 'race_car';

export interface Agent {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: 'car' | 'bus' | 'pedestrian';
  vehicleModel: VehicleModel;
  color: string;
  path: { x: number; y: number }[];
  pathIndex: number;
  speed: number;
  stopped: boolean;
}

export interface Resources {
  money: number;
  population: number;
  happiness: number;
  power: number;
  maxPower: number;
  waterSupply: number;
  maxWaterSupply: number;
  sewageCapacity: number;
  maxSewageCapacity: number;
  sickness: number; // 0-100 percentage
  demand: RCIDemand;
}

export interface GameState {
  grid: Tile[][];
  resources: Resources;
  selectedTool: TileType | 'bulldoze';
  tick: number;
  speed: number;
  gridSize: number;
  coverage: ServiceCoverage;
  budgetHistory: BudgetEntry[];
  overlay: OverlayType;
  agents: Agent[];
  timeOfDay: number;
  wind: Wind;
  smogParticles: SmogParticle[];
  pollutionMap: number[][];
  rotation: number;
  trafficLights: import('@/lib/trafficLights').TrafficLight[];
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const SERVICE_RADIUS: Partial<Record<TileType, number>> = {
  fire_station_small: 8,
  fire_station_large: 14,
  police_station: 10,
  police_hq: 18,
  prison: 6,
  clinic: 8,
  hospital: 16,
  water_pump: 15,
  sewage: 12,
  garbage_dump: 10,
  recycling_plant: 14,
  elementary_school: 8,
  high_school: 12,
  university: 18,
  library: 10,
  bus_depot: 12,
  airport: 30,
  helipad: 10,
  train_station: 20,
};

export const SERVICE_CAPACITY: Partial<Record<TileType, number>> = {
  water_pump: 150,
  sewage: 120,
};

export const POWER_OUTPUT: Partial<Record<TileType, number>> = {
  power_coal: 200,
  power_oil: 180,
  power_wind: 50,
  power_solar: 40,
  power_nuclear: 500,
};

export const TILE_COSTS: Record<TileType | 'bulldoze', number> = {
  grass: 0, water: 0, sand: 0, forest: 0,
  residential: 100, commercial: 150, industrial: 200,
  residential_md: 200, commercial_md: 300, industrial_md: 400,
  residential_hi: 400, commercial_hi: 600, industrial_hi: 800,
  road: 50, park: 75, rail: 75,
  power_coal: 800, power_oil: 900, power_wind: 400, power_solar: 500, power_nuclear: 3000,
  water_pump: 400, sewage: 350,
  garbage_dump: 300, recycling_plant: 600,
  fire_station_small: 400, fire_station_large: 900,
  police_station: 500, police_hq: 1200, prison: 800,
  clinic: 350, hospital: 1200,
  elementary_school: 350, high_school: 600, university: 1200, library: 300,
  bus_depot: 400, airport: 5000, helipad: 800, train_station: 1500,
  bulldoze: 10,
};

export const TILE_MAINTENANCE: Partial<Record<TileType, number>> = {
  fire_station_small: 8, fire_station_large: 18,
  police_station: 10, police_hq: 25, prison: 20,
  clinic: 8, hospital: 22,
  water_pump: 8, sewage: 6,
  garbage_dump: 5, recycling_plant: 10,
  power_coal: 15, power_oil: 18, power_wind: 4, power_solar: 3, power_nuclear: 30,
  park: 2, road: 1, rail: 2,
  elementary_school: 8, high_school: 14, university: 24, library: 6,
  bus_depot: 8, airport: 40, helipad: 10, train_station: 18,
  residential_md: 2, commercial_md: 3, industrial_md: 4,
  residential_hi: 4, commercial_hi: 6, industrial_hi: 8,
};

export const TILE_COLORS: Record<TileType, string[]> = {
  grass: ['#3a7a33', '#4a8a40', '#2d6a27'],
  residential: ['#4ade80', '#22c55e', '#16a34a'],
  commercial: ['#60a5fa', '#3b82f6', '#2563eb'],
  industrial: ['#fbbf24', '#f59e0b', '#d97706'],
  residential_md: ['#34d399', '#10b981', '#059669'],
  commercial_md: ['#818cf8', '#6366f1', '#4f46e5'],
  industrial_md: ['#fb923c', '#f97316', '#ea580c'],
  residential_hi: ['#2dd4bf', '#14b8a6', '#0d9488'],
  commercial_hi: ['#a78bfa', '#8b5cf6', '#7c3aed'],
  industrial_hi: ['#f87171', '#ef4444', '#dc2626'],
  road: ['#64748b', '#475569', '#334155'],
  park: ['#34d399', '#10b981', '#059669'],
  rail: ['#78716c', '#57534e', '#44403c'],
  water: ['#2563eb', '#1d4ed8', '#1e40af'],
  sand: ['#e8d5a3', '#d4c08a', '#c4a86e'],
  forest: ['#1a5c1a', '#226b22', '#155215'],
  power_coal: ['#6b7280', '#4b5563', '#374151'],
  power_oil: ['#78716c', '#57534e', '#44403c'],
  power_wind: ['#e0f2fe', '#bae6fd', '#7dd3fc'],
  power_solar: ['#fef08a', '#fde047', '#facc15'],
  power_nuclear: ['#d9f99d', '#bef264', '#a3e635'],
  water_pump: ['#38bdf8', '#0ea5e9', '#0284c7'],
  sewage: ['#a78bfa', '#8b5cf6', '#7c3aed'],
  garbage_dump: ['#78716c', '#57534e', '#44403c'],
  recycling_plant: ['#6ee7b7', '#34d399', '#10b981'],
  fire_station_small: ['#fca5a5', '#f87171', '#ef4444'],
  fire_station_large: ['#f87171', '#ef4444', '#dc2626'],
  police_station: ['#60a5fa', '#3b82f6', '#1d4ed8'],
  police_hq: ['#3b82f6', '#2563eb', '#1d4ed8'],
  prison: ['#9ca3af', '#6b7280', '#4b5563'],
  clinic: ['#fca5a5', '#fb923c', '#f97316'],
  hospital: ['#fb923c', '#f97316', '#ea580c'],
  elementary_school: ['#bef264', '#a3e635', '#84cc16'],
  high_school: ['#a3e635', '#84cc16', '#65a30d'],
  university: ['#c084fc', '#a855f7', '#9333ea'],
  library: ['#fde68a', '#fcd34d', '#fbbf24'],
  bus_depot: ['#fde68a', '#fcd34d', '#fbbf24'],
  airport: ['#e2e8f0', '#cbd5e1', '#94a3b8'],
  helipad: ['#d1d5db', '#9ca3af', '#6b7280'],
  train_station: ['#94a3b8', '#64748b', '#475569'],
};

export const TILE_LABELS: Record<TileType | 'bulldoze', string> = {
  grass: 'Grass', water: 'Water', sand: 'Beach', forest: 'Forest',
  residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial',
  residential_md: 'Residential', commercial_md: 'Commercial', industrial_md: 'Industrial',
  residential_hi: 'Residential', commercial_hi: 'Commercial', industrial_hi: 'Industrial',
  road: 'Road', park: 'Park', rail: 'Rail Track',
  power_coal: 'Coal Plant', power_oil: 'Oil Plant', power_wind: 'Wind Farm',
  power_solar: 'Solar Farm', power_nuclear: 'Nuclear Plant',
  water_pump: 'Water Pump', sewage: 'Sewage Plant',
  garbage_dump: 'Garbage Dump', recycling_plant: 'Recycling Plant',
  fire_station_small: 'Small Fire Stn', fire_station_large: 'Large Fire Stn',
  police_station: 'Police Station', police_hq: 'Police HQ', prison: 'Prison',
  clinic: 'Clinic', hospital: 'Hospital',
  elementary_school: 'Elementary', high_school: 'High School',
  university: 'University', library: 'Library',
  bus_depot: 'Bus Depot', airport: 'Airport', helipad: 'Helipad', train_station: 'Train Station',
  bulldoze: 'Bulldoze',
};

export type ToolCategory = 'zones_res' | 'zones_com' | 'zones_ind' | 'roads' | 'power' | 'water' | 'services' | 'education' | 'transit';
