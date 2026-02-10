import { DollarSign, Users, Smile, Zap } from 'lucide-react';
import { Resources } from '@/types/game';

interface Props {
  resources: Resources;
}

export default function ResourceBar({ resources }: Props) {
  const items = [
    {
      icon: DollarSign,
      label: 'Funds',
      value: `$${resources.money.toLocaleString()}`,
      color: 'text-accent',
    },
    {
      icon: Users,
      label: 'Population',
      value: resources.population.toLocaleString(),
      color: 'text-primary',
    },
    {
      icon: Smile,
      label: 'Happiness',
      value: `${resources.happiness}%`,
      color: resources.happiness > 60 ? 'text-green-400' : resources.happiness > 30 ? 'text-yellow-400' : 'text-red-400',
    },
    {
      icon: Zap,
      label: 'Power',
      value: `${resources.power}/${resources.maxPower}`,
      color: resources.power <= resources.maxPower ? 'text-yellow-300' : 'text-red-400',
    },
  ];

  return (
    <div className="glass-panel rounded-2xl px-4 py-2.5 flex items-center gap-6">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-display">
              {label}
            </span>
            <span className={`text-sm font-semibold ${color}`}>{value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
