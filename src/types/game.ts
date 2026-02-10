export type TileType =
  | 'grass' | 'residential' | 'commercial' | 'industrial'
  | 'road' | 'park' | 'power' | 'water' | 'sand' | 'forest'
  | 'water_pump' | 'sewage' | 'fire_station' | 'police_station' | 'hospital'
  | 'school' | 'university' | 'bus_stop' | 'train_station';

export const DRAGGABLE_TYPES: (TileType | 'bulldoze')[] = ['road', 'bulldoze'];

export interface Tile {
  type: TileType;
  level: number;
  x: number;
  y: number;
  elevation: number;
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

export type OverlayType = 'none' | 'population' | 'landValue' | 'fire' | 'police' | 'health' | 'waterSupply' | 'sewage' | 'happiness' | 'education' | 'transport';

export interface Agent {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number; // 0-1 along current segment
  type: 'car' | 'bus' | 'pedestrian';
  color: string;
  path: { x: number; y: number }[];
  pathIndex: number;
  speed: number;
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
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const SERVICE_RADIUS: Partial<Record<TileType, number>> = {
  fire_station: 10,
  police_station: 12,
  hospital: 14,
  water_pump: 15,
  sewage: 12,
  school: 10,
  university: 16,
  bus_stop: 8,
  train_station: 18,
};

export const SERVICE_CAPACITY: Partial<Record<TileType, number>> = {
  water_pump: 150,
  sewage: 120,
};

export const TILE_COSTS: Record<TileType | 'bulldoze', number> = {
  grass: 0,
  residential: 100,
  commercial: 150,
  industrial: 200,
  road: 50,
  park: 75,
  power: 500,
  water: 0,
  sand: 0,
  forest: 0,
  water_pump: 400,
  sewage: 350,
  fire_station: 600,
  police_station: 650,
  hospital: 800,
  school: 450,
  university: 900,
  bus_stop: 200,
  train_station: 750,
  bulldoze: 10,
};

export const TILE_MAINTENANCE: Partial<Record<TileType, number>> = {
  fire_station: 12,
  police_station: 14,
  hospital: 18,
  water_pump: 8,
  sewage: 6,
  power: 10,
  park: 2,
  road: 1,
  school: 10,
  university: 20,
  bus_stop: 4,
  train_station: 15,
};

export const TILE_COLORS: Record<TileType, string[]> = {
  grass: ['#3a7a33', '#4a8a40', '#2d6a27'],
  residential: ['#4ade80', '#22c55e', '#16a34a'],
  commercial: ['#60a5fa', '#3b82f6', '#2563eb'],
  industrial: ['#fbbf24', '#f59e0b', '#d97706'],
  road: ['#64748b', '#475569', '#334155'],
  park: ['#34d399', '#10b981', '#059669'],
  power: ['#facc15', '#eab308', '#ca8a04'],
  water: ['#2563eb', '#1d4ed8', '#1e40af'],
  sand: ['#e8d5a3', '#d4c08a', '#c4a86e'],
  forest: ['#1a5c1a', '#226b22', '#155215'],
  water_pump: ['#38bdf8', '#0ea5e9', '#0284c7'],
  sewage: ['#a78bfa', '#8b5cf6', '#7c3aed'],
  fire_station: ['#f87171', '#ef4444', '#dc2626'],
  police_station: ['#60a5fa', '#3b82f6', '#1d4ed8'],
  hospital: ['#fb923c', '#f97316', '#ea580c'],
  school: ['#a3e635', '#84cc16', '#65a30d'],
  university: ['#c084fc', '#a855f7', '#9333ea'],
  bus_stop: ['#fde68a', '#fcd34d', '#fbbf24'],
  train_station: ['#94a3b8', '#64748b', '#475569'],
};

export const TILE_LABELS: Record<TileType | 'bulldoze', string> = {
  grass: 'Grass',
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  road: 'Road',
  park: 'Park',
  power: 'Power Plant',
  water: 'Water',
  sand: 'Beach',
  forest: 'Forest',
  water_pump: 'Water Pump',
  sewage: 'Sewage Plant',
  fire_station: 'Fire Station',
  police_station: 'Police',
  hospital: 'Hospital',
  school: 'School',
  university: 'University',
  bus_stop: 'Bus Stop',
  train_station: 'Train Stn',
  bulldoze: 'Bulldoze',
};
