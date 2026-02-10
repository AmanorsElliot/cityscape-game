import { Pause, Play, FastForward, ChevronsRight } from 'lucide-react';

interface Props {
  speed: number;
  onSetSpeed: (speed: number) => void;
}

const speeds = [
  { value: 0, icon: Pause, label: 'Pause' },
  { value: 1, icon: Play, label: 'Normal' },
  { value: 2, icon: FastForward, label: 'Fast' },
  { value: 3, icon: ChevronsRight, label: 'Ultra' },
];

export default function SpeedControls({ speed, onSetSpeed }: Props) {
  return (
    <div className="glass-panel rounded-2xl p-1.5 flex gap-1">
      {speeds.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => onSetSpeed(value)}
          className={`p-2 rounded-lg transition-all ${
            speed === value
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
