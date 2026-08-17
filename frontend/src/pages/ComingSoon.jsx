import AppLayout from "@/components/AppLayout";
import { useParams } from "react-router-dom";
import { Blueprint, Package, RocketLaunch, Robot, Lock } from "@phosphor-icons/react";

const MODULES = {
  build: { icon: Blueprint, title: "Build", desc: "Idea validation, market research, business blueprints, branding, and website generation — everything to launch your business, powered by AI." },
  source: { icon: Package, title: "Source", desc: "Supplier discovery, manufacturer matching, RFQs, cost comparisons, and a full vendor database to source what you sell." },
  grow: { icon: RocketLaunch, title: "Grow", desc: "Lead generation, email & SMS campaigns, funnels, social, and advertising — turn visitors into paying customers." },
  "ai-team": { icon: Robot, title: "AI Team", desc: "Your AI receptionist, sales assistant, SEO specialist, operations and marketing assistants — a full team working 24/7." },
};

export default function ComingSoon() {
  const { module } = useParams();
  const info = MODULES[module] || { icon: Lock, title: "Coming soon", desc: "This module is on the way." };
  const Icon = info.icon;
  return (
    <AppLayout title={info.title} subtitle="Coming soon">
      <div className="max-w-xl mx-auto text-center py-24" data-testid="coming-soon">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#121212] border border-[#262626] grayscale opacity-70 flex items-center justify-center mb-6 relative">
          <Icon size={32} className="text-[#737373]" weight="duotone" />
          <span className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-[#0A0A0A] border border-[#333] flex items-center justify-center">
            <Lock size={12} className="text-[#737373]" weight="fill" />
          </span>
        </div>
        <h2 className="font-heading font-extrabold text-3xl tracking-tight text-white">{info.title}</h2>
        <span className="inline-block mt-2 text-[10px] font-mono uppercase tracking-widest text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 rounded-full">Coming in V2</span>
        <p className="mt-6 text-[#A3A3A3] leading-relaxed">{info.desc}</p>
      </div>
    </AppLayout>
  );
}
