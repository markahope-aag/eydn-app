interface Props {
  label: string;
  value: string;
  valueClassName?: string;
}

export default function SummaryCard({ label, value, valueClassName = "text-plum" }: Props) {
  return (
    <div className="bg-lavender/50 rounded-xl p-3">
      <p className="text-[11px] text-muted mb-1">{label}</p>
      <p className={`text-[16px] font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}
