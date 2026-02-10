export type TileType = 'grass' | 'residential' | 'commercial' | 'industrial' | 'road' | 'park' | 'power';

export interface Tile {
  type: TileType;
  level: number; // 0-3, higher = more developed
  x: number;
  y: number;
}

export interface Resources {
  money: number;
  population: number;
  happiness: number;
  power: number;
  maxPower: number;
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

export const TILE_COSTS: Record<TileType | 'bulldoze', number> = {
  grass: 0,
  residential: 100,
  commercial: 150,
  industrial: 200,
  road: 50,
  park: 75,
  power: 500,
  bulldoze: 10,
};

export const TILE_COLORS: Record<TileType, string[]> = {
  grass: ['#2d5a27', '#3a7233', '#2d5a27'],
  residential: ['#4ade80', '#22c55e', '#16a34a'],
  commercial: ['#60a5fa', '#3b82f6', '#2563eb'],
  industrial: ['#fbbf24', '#f59e0b', '#d97706'],
  road: ['#64748b', '#475569', '#334155'],
  park: ['#34d399', '#10b981', '#059669'],
  power: ['#facc15', '#eab308', '#ca8a04'],
};

export const TILE_LABELS: Record<TileType | 'bulldoze', string> = {
  grass: 'Grass',
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  road: 'Road',
  park: 'Park',
  power: 'Power Plant',
  bulldoze: 'Bulldoze',
};
