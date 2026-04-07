interface Props {
  name: string;
  amount: number;
  barPct: number;
  color: string;
  formatCurrency: (_n: number) => string;
}

export default function BudgetBreakdownBar({ name, amount, barPct, color, formatCurrency }: Props) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[13px] text-plum">{name}</span>
        <span className="text-[13px] font-semibold text-plum">{formatCurrency(amount)}</span>
      </div>
      <div className="h-1.5 bg-lavender rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${barPct}%`, backgroundColor: color }}
          role="meter"
          aria-valuenow={barPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={name}
        />
      </div>
    </div>
  );
}
