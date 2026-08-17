import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { TrendUp, Briefcase, Sparkle, ArrowRight, Lightning, ChartLineUp, Star } from "@phosphor-icons/react";

const FEATURES = [
  { icon: Briefcase, title: "Operate", desc: "CRM pipeline, jobs, and invoices with Stripe checkout — run the whole business in one place." },
  { icon: TrendUp, title: "ScaleSEO", desc: "Scan your site, find what's stopping customers from finding you, and let AI fix it." },
  { icon: Star, title: "Reviews", desc: "Track your reputation and reply to every review with owner-approved AI drafts." },
  { icon: ChartLineUp, title: "Command Center", desc: "One Growth Score across every module, plus your next best action — decided by AI." },
];

export default function Landing() {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user) navigate(business ? "/app/command" : "/onboarding"); }, [user, business, navigate]);

  return (
    <div className="min-h-screen bg-[#050505] text-white vx-grid-bg">
      <header className="h-16 flex items-center justify-between px-6 md:px-10 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-heading font-extrabold text-sm">V</div>
          <span className="font-heading font-extrabold text-lg tracking-tight">Venturelyx</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"><Button variant="secondary" size="sm" data-testid="nav-login-btn">Log in</Button></Link>
          <Link to="/register"><Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" data-testid="nav-register-btn">Get started</Button></Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-mono text-indigo-300 mb-8">
          <Lightning size={13} weight="fill" /> Powered by Claude + ChatGPT
        </div>
        <h1 className="font-heading font-extrabold text-4xl md:text-6xl tracking-tighter leading-[1.05]">
          We build businesses,<br /><span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">not websites.</span>
        </h1>
        <p className="mt-6 text-base md:text-lg text-[#A3A3A3] max-w-2xl mx-auto leading-relaxed">
          The operating system that takes your small business from idea to launch to scale — CRM, SEO, reviews, and revenue, all reporting into one Command Center with an AI team behind it.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" data-testid="hero-cta-btn" className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-8 vx-sheen">
              Start building free <ArrowRight size={18} weight="bold" />
            </Button>
          </Link>
          <Link to="/login"><Button size="lg" variant="secondary" data-testid="hero-login-btn">I have an account</Button></Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-28 grid grid-cols-1 md:grid-cols-2 gap-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-[#121212] border border-[#262626] rounded-xl p-6 hover:border-indigo-500/40 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <f.icon size={22} className="text-indigo-400" weight="duotone" />
            </div>
            <h3 className="font-heading font-bold text-lg tracking-tight">{f.title}</h3>
            <p className="mt-2 text-sm text-[#A3A3A3] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-[#262626] py-8 text-center text-xs text-[#525252] font-mono">
        Venturelyx — Business Launch & Growth Operating System
      </footer>
    </div>
  );
}
