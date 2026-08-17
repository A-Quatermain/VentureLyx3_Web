import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { House, Blueprint, Package, Briefcase, TrendUp, RocketLaunch, Robot, Gear, Lock, SignOut } from "@phosphor-icons/react";

const NAV = [
  { to: "/app/command", label: "Command Center", icon: House },
  { to: "/app/build", label: "Build", icon: Blueprint, locked: true },
  { to: "/app/source", label: "Source", icon: Package, locked: true },
  { to: "/app/operate", label: "Operate", icon: Briefcase },
  { to: "/app/scaleseo", label: "ScaleSEO", icon: TrendUp },
  { to: "/app/grow", label: "Grow", icon: RocketLaunch, locked: true },
  { to: "/app/ai-team", label: "AI Team", icon: Robot, locked: true },
];

export function Sidebar() {
  const { user, business, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-[#262626] bg-[#0A0A0A] h-screen sticky top-0 flex flex-col" data-testid="app-sidebar">
      <div className="px-6 h-16 flex items-center border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-heading font-extrabold text-sm">V</div>
          <span className="font-heading font-extrabold text-lg tracking-tight">Venturelyx</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, locked }) =>
          locked ? (
            <div key={to} data-testid={`nav-locked-${label.toLowerCase().replace(/\s/g, "-")}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[#737373] opacity-60 cursor-not-allowed select-none"
              title="Coming soon">
              <Icon size={20} weight="regular" />
              <span className="text-sm font-medium">{label}</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#737373]">
                <Lock size={11} weight="fill" /> Soon
              </span>
            </div>
          ) : (
            <NavLink key={to} to={to} data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-indigo-600/15 text-white border border-indigo-500/30" : "text-[#A3A3A3] hover:text-white hover:bg-[#171717] border border-transparent"
                }`}>
              <Icon size={20} weight="regular" />
              {label}
            </NavLink>
          )
        )}
      </nav>

      <div className="border-t border-[#262626] p-3 space-y-1">
        <NavLink to="/app/settings" data-testid="nav-settings"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-[#171717] text-white" : "text-[#A3A3A3] hover:text-white hover:bg-[#171717]"}`}>
          <Gear size={20} /> Settings
        </NavLink>
        <div className="px-3 py-2">
          <div className="text-sm font-medium truncate">{business?.name || user?.name}</div>
          <div className="text-xs text-[#737373] truncate">{user?.email}</div>
        </div>
        <button data-testid="logout-btn" onClick={async () => { await logout(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-[#A3A3A3] hover:text-white hover:bg-[#171717] transition-colors">
          <SignOut size={20} /> Log out
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout({ children, title, subtitle, actions }) {
  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-[#262626] bg-[#050505]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6 md:px-8">
          <div>
            <h1 className="font-heading font-extrabold text-xl tracking-tight leading-none">{title}</h1>
            {subtitle && <p className="text-xs text-[#737373] mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">{actions}</div>
        </header>
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto vx-fade-up">{children}</div>
      </main>
    </div>
  );
}
