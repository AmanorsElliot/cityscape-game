export type TileType = 'grass' | 'residential' | 'commercial' | 'industrial' | 'road' | 'park' | 'power' | 'water' | 'sand' | 'forest';

export interface Tile {
  type: TileType;
  level: number; // 0-3, higher = more developed
  x: number;
  y: number;
  elevation: number; // terrain height
}

export interface RCIDemand {
  residential: number; // -1 to 1
  commercial: number;
  industrial: number;
}

export interface Resources {
  money: number;
  population: number;
  happiness: number;
  power: number;
  maxPower: number;
  demand: RCIDemand;
}

export interface GameState {
  grid: Tile[][];
  resources: Resources;
  selectedTool: TileType | 'bulldoze';
  tick: number;
  speed: number; // 0=paused, 1=normal, 2=fast, 3=ultra
  gridSize: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const BUILDABLE_TYPES: TileType[] = ['residential', 'commercial', 'industrial', 'road', 'park', 'power'];

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
  bulldoze: 10,
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
  bulldoze: 'Bulldoze',
};
