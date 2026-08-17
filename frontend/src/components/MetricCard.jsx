import { ArrowUp, ArrowDown } from "@phosphor-icons/react";

export default function MetricCard({ label, value, delta, prefix = "", suffix = "", icon: Icon, cta, onCta, testid }) {
  const positive = delta >= 0;
  return (
    <div data-testid={testid} className="group bg-[#121212] border border-[#262626] rounded-lg p-5 hover:border-[#3f3f46] hover:-translate-y-[1px] transition-[transform,border-color] duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#737373]">{label}</span>
        {Icon && <Icon size={18} className="text-[#525252] group-hover:text-indigo-400 transition-colors" />}
      </div>
      <div className="mt-3 font-mono text-3xl font-medium text-white tabular-nums">
        {value === 0 && cta ? <span className="text-lg text-[#525252]">—</span> : <>{prefix}{value}{suffix}</>}
      </div>
      {value === 0 && cta ? (
        <button onClick={onCta} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">{cta} →</button>
      ) : delta !== undefined ? (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
          {positive ? <ArrowUp size={12} weight="bold" /> : <ArrowDown size={12} weight="bold" />}
          {Math.abs(delta)}% vs last month
        </div>
      ) : <div className="mt-2 text-xs text-[#525252]">&nbsp;</div>}
    </div>
  );
}
