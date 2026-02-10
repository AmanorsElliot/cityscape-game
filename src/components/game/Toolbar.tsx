import { Home, Building2, Factory, Route, TreePine, Zap, Eraser } from 'lucide-react';
import { TileType, TILE_COSTS, TILE_LABELS } from '@/types/game';

interface Props {
  selected: TileType | 'bulldoze';
  onSelect: (tool: TileType | 'bulldoze') => void;
  money: number;
}

const tools: { type: TileType | 'bulldoze'; icon: typeof Home }[] = [
  { type: 'residential', icon: Home },
  { type: 'commercial', icon: Building2 },
  { type: 'industrial', icon: Factory },
  { type: 'road', icon: Route },
  { type: 'park', icon: TreePine },
  { type: 'power', icon: Zap },
  { type: 'bulldoze', icon: Eraser },
];

export default function Toolbar({ selected, onSelect, money }: Props) {
  return (
    <div className="glass-panel rounded-2xl p-2 flex gap-1.5">
      {tools.map(({ type, icon: Icon }) => {
        const cost = TILE_COSTS[type];
        const canAfford = money >= cost;
        const isActive = selected === type;

        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            disabled={!canAfford}
            className={`toolbar-btn flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all
              ${isActive
                ? 'active border-primary bg-primary/10 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }
              ${!canAfford ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={`${TILE_LABELS[type]} ($${cost})`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium font-display tracking-wide">
              {TILE_LABELS[type]}
            </span>
            {cost > 0 && (
              <span className="text-[9px] text-muted-foreground">${cost}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
