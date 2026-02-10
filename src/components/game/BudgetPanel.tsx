import { BudgetEntry, Resources, TILE_MAINTENANCE } from '@/types/game';
import { DollarSign, TrendingUp, TrendingDown, X } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface Props {
  resources: Resources;
  budgetHistory: BudgetEntry[];
  onClose: () => void;
}

export default function BudgetPanel({ resources, budgetHistory, onClose }: Props) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  const lastEntry = budgetHistory[budgetHistory.length - 1];
  const income = lastEntry?.income ?? 0;
  const expenses = lastEntry?.expenses ?? 0;
  const net = income - expenses;

  // Draw balance chart
  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas || budgetHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 280;
    const h = 100;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);

    const balances = budgetHistory.map(e => e.balance);
    const maxBal = Math.max(...balances, 1);
    const minBal = Math.min(...balances, 0);
    const range = maxBal - minBal || 1;

    // Grid lines
    ctx.strokeStyle = 'rgba(100,150,180,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const gy = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Balance line
    ctx.beginPath();
    ctx.strokeStyle = net >= 0 ? '#4ade80' : '#f87171';
    ctx.lineWidth = 1.5;
    const step = w / (balances.length - 1);
    for (let i = 0; i < balances.length; i++) {
      const bx = i * step;
      const by = h - ((balances[i] - minBal) / range) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();

    // Fill under curve
    const lastX = (balances.length - 1) * step;
    const lastY = h - ((balances[balances.length - 1] - minBal) / range) * (h - 10) - 5;
    ctx.lineTo(lastX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = net >= 0 ? 'rgba(74, 222, 128, 0.08)' : 'rgba(248, 113, 113, 0.08)';
    ctx.fill();
  }, [budgetHistory, net]);

  return (
    <div className="glass-panel-solid rounded-2xl p-4 w-80 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm tracking-wider text-primary glow-text">BUDGET</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-muted/30 rounded-xl p-2 text-center">
          <TrendingUp className="w-3.5 h-3.5 text-green-400 mx-auto mb-1" />
          <div className="text-[9px] font-display tracking-wider text-muted-foreground">INCOME</div>
          <div className="text-sm font-bold text-green-400">${income}</div>
        </div>
        <div className="bg-muted/30 rounded-xl p-2 text-center">
          <TrendingDown className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
          <div className="text-[9px] font-display tracking-wider text-muted-foreground">EXPENSES</div>
          <div className="text-sm font-bold text-red-400">${expenses}</div>
        </div>
        <div className="bg-muted/30 rounded-xl p-2 text-center">
          <DollarSign className={`w-3.5 h-3.5 mx-auto mb-1 ${net >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          <div className="text-[9px] font-display tracking-wider text-muted-foreground">NET</div>
          <div className={`text-sm font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {net >= 0 ? '+' : ''}{net}
          </div>
        </div>
      </div>

      {/* Balance chart */}
      <div className="mb-4">
        <div className="text-[9px] font-display tracking-wider text-muted-foreground mb-1">BALANCE HISTORY</div>
        <canvas ref={chartRef} style={{ width: 280, height: 100, borderRadius: 8 }} className="w-full" />
      </div>

      {/* Breakdown */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-display tracking-wider text-muted-foreground mb-1">PER-TICK BREAKDOWN</div>
        <BreakdownRow label="Commercial Tax" value={income > 0 ? `+$${Math.round(income * 0.45)}` : '+$0'} color="text-green-400" />
        <BreakdownRow label="Industrial Output" value={income > 0 ? `+$${Math.round(income * 0.55)}` : '+$0'} color="text-green-400" />
        <div className="border-t border-border my-1.5" />
        <BreakdownRow label="Residential" value={`-$${Math.round(expenses * 0.2)}`} color="text-red-400" />
        <BreakdownRow label="Services" value={`-$${Math.round(expenses * 0.5)}`} color="text-red-400" />
        <BreakdownRow label="Infrastructure" value={`-$${Math.round(expenses * 0.3)}`} color="text-red-400" />
      </div>

      {/* Treasury */}
      <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
        <div className="text-[9px] font-display tracking-wider text-muted-foreground">TREASURY</div>
        <div className="text-lg font-bold text-accent">${resources.money.toLocaleString()}</div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
