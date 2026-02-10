import { DollarSign, Users, Smile, Zap, Droplets, Trash2, Thermometer } from 'lucide-react';
import { Resources } from '@/types/game';

interface Props {
  resources: Resources;
}

export default function ResourceBar({ resources }: Props) {
  const items = [
    { icon: DollarSign, label: 'Funds', value: `$${resources.money.toLocaleString()}`, color: 'text-accent', priority: 1 },
    { icon: Users, label: 'Pop', value: resources.population.toLocaleString(), color: 'text-primary', priority: 1 },
    { icon: Smile, label: 'Happy', value: `${resources.happiness}%`,
      color: resources.happiness > 60 ? 'text-green-400' : resources.happiness > 30 ? 'text-yellow-400' : 'text-red-400', priority: 1 },
    { icon: Zap, label: 'Power', value: `${resources.power}/${resources.maxPower}`,
      color: resources.power <= resources.maxPower ? 'text-yellow-300' : 'text-red-400', priority: 2 },
    { icon: Droplets, label: 'Water', value: `${resources.waterSupply}/${resources.maxWaterSupply}`,
      color: resources.waterSupply <= resources.maxWaterSupply ? 'text-blue-300' : 'text-red-400', priority: 2 },
    { icon: Trash2, label: 'Sewage', value: `${resources.sewageCapacity}/${resources.maxSewageCapacity}`,
      color: resources.sewageCapacity <= resources.maxSewageCapacity ? 'text-purple-300' : 'text-red-400', priority: 2 },
    { icon: Thermometer, label: 'Sick', value: `${resources.sickness}%`,
      color: resources.sickness < 10 ? 'text-green-400' : resources.sickness < 30 ? 'text-yellow-400' : 'text-red-400', priority: 2 },
  ];

  return (
    <div className="glass-panel rounded-2xl px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-4 flex-wrap">
      {items.map(({ icon: Icon, label, value, color, priority }) => (
        <div key={label} className={`flex items-center gap-1 sm:gap-1.5 ${priority === 2 ? 'hidden sm:flex' : ''}`}>
          <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${color}`} />
          <div className="flex flex-col">
            <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-muted-foreground font-display hidden sm:block">{label}</span>
            <span className={`text-[10px] sm:text-xs font-semibold ${color}`}>{value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
