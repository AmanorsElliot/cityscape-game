import { RCIDemand } from '@/types/game';

interface Props {
  demand: RCIDemand;
}

function DemandBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.abs(value) * 100;
  const isPositive = value > 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-display tracking-wider text-muted-foreground w-3">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted/50 relative overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/30" />
        {isPositive ? (
          <div
            className="absolute inset-y-0 left-1/2 rounded-r-full transition-all duration-500"
            style={{ width: `${pct / 2}%`, backgroundColor: color }}
          />
        ) : (
          <div
            className="absolute inset-y-0 rounded-l-full transition-all duration-500"
            style={{
              width: `${pct / 2}%`,
              right: '50%',
              backgroundColor: color,
              opacity: 0.6,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function DemandMeter({ demand }: Props) {
  return (
    <div className="glass-panel rounded-xl px-3 py-2.5 w-40">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-display mb-2">
        RCI Demand
      </div>
      <div className="flex flex-col gap-1.5">
        <DemandBar label="R" value={demand.residential} color="#4ade80" />
        <DemandBar label="C" value={demand.commercial} color="#60a5fa" />
        <DemandBar label="I" value={demand.industrial} color="#fbbf24" />
      </div>
    </div>
  );
}
