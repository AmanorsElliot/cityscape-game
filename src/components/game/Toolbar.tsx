import {
  Home, Building2, Factory, Route, TreePine, Zap, Eraser,
  Droplets, Trash2, Flame, Shield, Heart, GraduationCap, BookOpen, Bus, TrainFront,
  Plane, Wind, Sun, Atom, Recycle, Siren, Library, CircleDot, RailSymbol,
  ChevronDown,
} from 'lucide-react';
import { TileType, TILE_COSTS, TILE_LABELS, TILE_SIZE } from '@/types/game';
import { useState, useRef, useEffect } from 'react';

interface Props {
  selected: TileType | 'bulldoze';
  onSelect: (tool: TileType | 'bulldoze') => void;
  money: number;
}

interface ToolItem {
  type: TileType | 'bulldoze';
  icon: typeof Home;
  label?: string;
}

interface ToolGroup {
  id: string;
  label: string;
  icon: typeof Home;
  items: ToolItem[];
}

const toolGroups: ToolGroup[] = [
  {
    id: 'residential', label: 'Residential', icon: Home,
    items: [
      { type: 'residential', icon: Home, label: 'Low Density' },
      { type: 'residential_md', icon: Home, label: 'Medium Density' },
      { type: 'residential_hi', icon: Home, label: 'High Density' },
    ],
  },
  {
    id: 'commercial', label: 'Commercial', icon: Building2,
    items: [
      { type: 'commercial', icon: Building2, label: 'Low Density' },
      { type: 'commercial_md', icon: Building2, label: 'Medium Density' },
      { type: 'commercial_hi', icon: Building2, label: 'High Density' },
    ],
  },
  {
    id: 'industrial', label: 'Industrial', icon: Factory,
    items: [
      { type: 'industrial', icon: Factory, label: 'Low Density' },
      { type: 'industrial_md', icon: Factory, label: 'Medium Density' },
      { type: 'industrial_hi', icon: Factory, label: 'High Density' },
    ],
  },
  {
    id: 'roads', label: 'Roads', icon: Route,
    items: [
      { type: 'road', icon: Route },
      { type: 'park', icon: TreePine },
      { type: 'bulldoze', icon: Eraser },
    ],
  },
  {
    id: 'power', label: 'Power', icon: Zap,
    items: [
      { type: 'power_wind', icon: Wind },
      { type: 'power_solar', icon: Sun },
      { type: 'power_coal', icon: Zap },
      { type: 'power_oil', icon: Zap },
      { type: 'power_nuclear', icon: Atom },
    ],
  },
  {
    id: 'water', label: 'Utilities', icon: Droplets,
    items: [
      { type: 'water_pump', icon: Droplets },
      { type: 'sewage', icon: Trash2 },
      { type: 'garbage_dump', icon: Trash2 },
      { type: 'recycling_plant', icon: Recycle },
    ],
  },
  {
    id: 'services', label: 'Services', icon: Shield,
    items: [
      { type: 'fire_station_small', icon: Flame },
      { type: 'fire_station_large', icon: Flame },
      { type: 'police_station', icon: Shield },
      { type: 'police_hq', icon: Siren },
      { type: 'prison', icon: Shield },
      { type: 'clinic', icon: Heart },
      { type: 'hospital', icon: Heart },
    ],
  },
  {
    id: 'education', label: 'Education', icon: GraduationCap,
    items: [
      { type: 'elementary_school', icon: BookOpen },
      { type: 'high_school', icon: BookOpen },
      { type: 'university', icon: GraduationCap },
      { type: 'library', icon: Library },
    ],
  },
  {
    id: 'transit', label: 'Transit', icon: Bus,
    items: [
      { type: 'bus_depot', icon: Bus },
      { type: 'train_station', icon: TrainFront },
      { type: 'rail', icon: RailSymbol, label: 'Rail Track' },
      { type: 'airport', icon: Plane },
      { type: 'helipad', icon: CircleDot },
    ],
  },
];

function getSizeLabel(type: TileType | 'bulldoze'): string | null {
  if (type === 'bulldoze') return null;
  const s = TILE_SIZE[type as TileType];
  if (!s) return null;
  return `${s[0]}×${s[1]}`;
}

export default function Toolbar({ selected, onSelect, money }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  const isGroupActive = (group: ToolGroup) => group.items.some(i => i.type === selected);

  return (
    <div className="glass-panel rounded-2xl p-1.5 flex gap-1" ref={dropdownRef}>
      {toolGroups.map(group => {
        const GroupIcon = group.icon;
        const active = isGroupActive(group);
        const isOpen = openGroup === group.id;

        return (
          <div key={group.id} className="relative">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (group.items.length === 1) {
                  onSelect(group.items[0].type);
                  setOpenGroup(null);
                } else {
                  setOpenGroup(isOpen ? null : group.id);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-[10px] font-display tracking-wider transition-all touch-manipulation
                ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'}
              `}
              title={group.label}
            >
              <GroupIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{group.label}</span>
              {group.items.length > 1 && <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isOpen && group.items.length > 1 && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[100] rounded-xl p-1.5 min-w-[180px] shadow-xl border border-border/50 bg-card backdrop-blur-xl"
              >
                {group.items.map(({ type, icon: Icon, label }) => {
                  const cost = TILE_COSTS[type];
                  const canAfford = money >= cost;
                  const isActive = selected === type;
                  const sizeLabel = getSizeLabel(type);

                  return (
                    <button
                      key={type}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onSelect(type); setOpenGroup(null); }}
                      disabled={!canAfford}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all touch-manipulation
                        ${isActive ? 'bg-primary/15 text-primary' : 'text-foreground/80 hover:bg-secondary/50 hover:text-foreground'}
                        ${!canAfford ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{label || TILE_LABELS[type]}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>${cost.toLocaleString()}</span>
                          {sizeLabel && <span className="text-muted-foreground/60">{sizeLabel}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
