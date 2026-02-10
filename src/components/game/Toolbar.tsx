import {
  Home, Building2, Factory, Route, TreePine, Zap, Eraser,
  Droplets, Trash2, Flame, Shield, Heart, GraduationCap, BookOpen, Bus, TrainFront,
  ArrowUp,
} from 'lucide-react';
import { TileType, TILE_COSTS, TILE_LABELS } from '@/types/game';
import { useState } from 'react';

interface Props {
  selected: TileType | 'bulldoze';
  onSelect: (tool: TileType | 'bulldoze') => void;
  money: number;
}

type ToolCategory = 'zones' | 'infra' | 'services' | 'education' | 'transport';

const categories: { id: ToolCategory; label: string; tools: { type: TileType | 'bulldoze'; icon: typeof Home }[] }[] = [
  {
    id: 'zones', label: 'Zones',
    tools: [
      { type: 'residential', icon: Home },
      { type: 'commercial', icon: Building2 },
      { type: 'industrial', icon: Factory },
      { type: 'residential_md', icon: Home },
      { type: 'commercial_md', icon: Building2 },
      { type: 'industrial_md', icon: Factory },
      { type: 'residential_hi', icon: Home },
      { type: 'commercial_hi', icon: Building2 },
      { type: 'industrial_hi', icon: Factory },
    ],
  },
  {
    id: 'infra', label: 'Infra',
    tools: [
      { type: 'road', icon: Route },
      { type: 'park', icon: TreePine },
      { type: 'power', icon: Zap },
      { type: 'water_pump', icon: Droplets },
      { type: 'sewage', icon: Trash2 },
    ],
  },
  {
    id: 'services', label: 'Services',
    tools: [
      { type: 'fire_station', icon: Flame },
      { type: 'police_station', icon: Shield },
      { type: 'hospital', icon: Heart },
    ],
  },
  {
    id: 'education', label: 'Education',
    tools: [
      { type: 'school', icon: BookOpen },
      { type: 'university', icon: GraduationCap },
    ],
  },
  {
    id: 'transport', label: 'Transit',
    tools: [
      { type: 'bus_stop', icon: Bus },
      { type: 'train_station', icon: TrainFront },
      { type: 'bulldoze', icon: Eraser },
    ],
  },
];

function getDensityBadge(type: TileType | 'bulldoze'): string | null {
  if (typeof type === 'string' && type.endsWith('_md')) return 'M';
  if (typeof type === 'string' && type.endsWith('_hi')) return 'H';
  if (['residential', 'commercial', 'industrial'].includes(type)) return 'L';
  return null;
}

function getDensityColor(type: TileType | 'bulldoze'): string {
  if (typeof type === 'string' && type.endsWith('_hi')) return 'bg-red-500/30 text-red-300';
  if (typeof type === 'string' && type.endsWith('_md')) return 'bg-amber-500/30 text-amber-300';
  return 'bg-emerald-500/30 text-emerald-300';
}

export default function Toolbar({ selected, onSelect, money }: Props) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('zones');
  const currentCategory = categories.find(c => c.id === activeCategory)!;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="glass-panel rounded-xl p-1 flex gap-0.5">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-display tracking-wider transition-all ${
              activeCategory === cat.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="glass-panel rounded-2xl p-2 flex gap-1.5 flex-wrap justify-center max-w-[520px]">
        {currentCategory.tools.map(({ type, icon: Icon }) => {
          const cost = TILE_COSTS[type];
          const canAfford = money >= cost;
          const isActive = selected === type;
          const badge = getDensityBadge(type);
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              disabled={!canAfford}
              className={`toolbar-btn flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all relative
                ${isActive ? 'active border-primary bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50'}
                ${!canAfford ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={`${TILE_LABELS[type]} ($${cost})`}
            >
              {badge && (
                <span className={`absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded ${getDensityColor(type)}`}>
                  {badge}
                </span>
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium font-display tracking-wide">{TILE_LABELS[type]}</span>
              {cost > 0 && <span className="text-[9px] text-muted-foreground">${cost}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
