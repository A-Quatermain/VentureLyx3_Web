import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import MetricCard from "@/components/MetricCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { CurrencyDollar, UsersThree, Target, TrendUp, Star, Briefcase, Receipt, Sparkle, ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const IMPACT = { high: "text-red-400 border-red-500/30 bg-red-500/10", medium: "text-amber-400 border-amber-500/30 bg-amber-500/10", low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };

export default function CommandCenter() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [m, setM] = useState(null);
  const [nba, setNba] = useState(null);
  const [nbaLoading, setNbaLoading] = useState(true);

  useEffect(() => {
    api.get("/command/metrics").then((r) => setM(r.data));
    api.get("/command/next-best-action").then((r) => setNba(r.data)).finally(() => setNbaLoading(false));
  }, []);

  const score = m?.growth_score ?? 0;
  const gaugeData = [{ name: "score", value: score, fill: score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444" }];

  return (
    <AppLayout title="Command Center" subtitle={business?.name}>
      {!m ? <SkeletonGrid /> : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Growth Score */}
          <div className="lg:col-span-2 lg:row-span-2 bg-[#121212] border border-[#262626] rounded-lg p-6 flex flex-col" data-testid="growth-score-card">
            <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#737373]">Growth Score</span>
            <div className="flex-1 flex items-center justify-center relative min-h-[240px]">
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={gaugeData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: "#1f1f1f" }} dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-5xl font-medium text-white tabular-nums">{score}</span>
                <span className="text-xs text-[#737373] mt-1">out of 100</span>
              </div>
            </div>
            <p className="text-sm text-[#A3A3A3] text-center">
              {score >= 70 ? "You're growing strong. Keep the momentum." : score >= 40 ? "Solid foundation — a few fixes will push you higher." : "Let's get the basics in place to unlock growth."}
            </p>
          </div>

          {/* AI Next Best Action */}
          <div className="lg:col-span-2 lg:row-span-2 bg-[#0C101F] border border-indigo-500/25 rounded-lg p-6 shadow-[0_0_30px_rgba(79,70,229,0.08)]" data-testid="next-best-action-card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkle size={18} weight="fill" className="text-violet-400" />
              <span className="text-xs font-semibold tracking-[0.15em] uppercase text-violet-300">AI Next Best Actions</span>
            </div>
            {nbaLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#737373] py-8"><CircleNotch size={16} className="animate-spin" /> Analysing your business…</div>
            ) : (
              <div className="space-y-3">
                {nba?.actions?.map((a, i) => (
                  <button key={i} data-testid={`nba-item-${i}`} onClick={() => navigate(`/app/${a.module === "command" ? "scaleseo" : a.module}`)}
                    className="w-full text-left group bg-[#050810] border border-indigo-500/15 hover:border-indigo-500/40 rounded-md p-4 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-white text-sm">{a.title}</div>
                        <div className="text-xs text-[#A3A3A3] mt-1 leading-relaxed">{a.why}</div>
                      </div>
                      <span className={`shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${IMPACT[a.impact] || IMPACT.medium}`}>{a.impact}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-indigo-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Fix this for me <ArrowRight size={12} weight="bold" />
                    </div>
                  </button>
                ))}
                {nba?.generated_by && <p className="text-[10px] font-mono text-[#525252] pt-1">generated by {nba.generated_by}</p>}
              </div>
            )}
          </div>

          <MetricCard testid="metric-revenue" label="Revenue" prefix="$" value={m.revenue.toLocaleString()} delta={12} icon={CurrencyDollar} />
          <MetricCard testid="metric-leads" label="Open Leads" value={m.leads} delta={8} icon={Target} cta="Add a lead" onCta={() => navigate("/app/operate")} />
          <MetricCard testid="metric-customers" label="Customers" value={m.customers} delta={5} icon={UsersThree} />
          <MetricCard testid="metric-pipeline" label="Pipeline Value" prefix="$" value={m.pipeline_value.toLocaleString()} delta={15} icon={TrendUp} />
          <MetricCard testid="metric-seo" label="SEO Score" value={m.seo_score} icon={TrendUp} cta="Scan your site" onCta={() => navigate("/app/scaleseo")} />
          <MetricCard testid="metric-reviews" label="Rating" value={m.rating} suffix=" ★" icon={Star} cta="Add reviews" onCta={() => navigate("/app/reviews")} />
          <MetricCard testid="metric-jobs" label="Open Jobs" value={m.jobs_open} icon={Briefcase} cta="Schedule a job" onCta={() => navigate("/app/operate")} />
          <MetricCard testid="metric-invoices" label="Outstanding" prefix="$" value={m.invoices_outstanding.toLocaleString()} icon={Receipt} cta="Create invoice" onCta={() => navigate("/app/operate")} />
        </div>
      )}
    </AppLayout>
  );
}

function SkeletonGrid() {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 bg-[#121212] border border-[#262626] rounded-lg animate-pulse" />)}</div>;
}
