import { OverlayType } from '@/types/game';
import {
  Eye, Users, DollarSign, Flame, Shield, Heart,
  Droplets, Trash2, Smile, EyeOff, GraduationCap, Bus,
} from 'lucide-react';

interface Props {
  current: OverlayType;
  onSelect: (overlay: OverlayType) => void;
}

const overlays: { type: OverlayType; icon: typeof Eye; label: string; color: string }[] = [
  { type: 'none', icon: EyeOff, label: 'None', color: 'text-muted-foreground' },
  { type: 'population', icon: Users, label: 'Population', color: 'text-orange-400' },
  { type: 'landValue', icon: DollarSign, label: 'Land Value', color: 'text-emerald-400' },
  { type: 'happiness', icon: Smile, label: 'Happiness', color: 'text-yellow-400' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-red-400' },
  { type: 'police', icon: Shield, label: 'Police', color: 'text-blue-400' },
  { type: 'health', icon: Heart, label: 'Health', color: 'text-orange-300' },
  { type: 'waterSupply', icon: Droplets, label: 'Water', color: 'text-cyan-400' },
  { type: 'sewage', icon: Trash2, label: 'Sewage', color: 'text-purple-400' },
  { type: 'education', icon: GraduationCap, label: 'Education', color: 'text-lime-400' },
  { type: 'transport', icon: Bus, label: 'Transit', color: 'text-amber-400' },
];

export default function OverlaySelector({ current, onSelect }: Props) {
  return (
    <div className="glass-panel rounded-xl p-2 w-40">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-display mb-2 px-1">
        Data Overlays
      </div>
      <div className="flex flex-col gap-0.5">
        {overlays.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
              current === type ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${current === type ? 'text-primary' : color}`} />
            <span className="font-display text-[10px] tracking-wider">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
