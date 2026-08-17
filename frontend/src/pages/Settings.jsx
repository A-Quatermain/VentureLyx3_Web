import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkle, Robot, Lightning } from "@phosphor-icons/react";

const PROVIDERS = [
  { id: "auto", name: "Auto (Recommended)", desc: "We pick the best model per task and fall back automatically.", icon: Lightning },
  { id: "anthropic", name: "Claude", desc: "Anthropic Claude for all AI generation.", icon: Sparkle },
  { id: "openai", name: "ChatGPT", desc: "OpenAI GPT for all AI generation.", icon: Robot },
];

export default function Settings() {
  const { business, setBusiness, refresh } = useAuth();
  const [form, setForm] = useState({ name: business?.name || "", website: business?.website || "", industry: business?.industry || "", service_area: business?.service_area || "" });
  const [pref, setPref] = useState(business?.ai_provider_pref || "auto");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { const { data } = await api.put("/business", { ...form, ai_provider_pref: pref }); setBusiness(data); await refresh(); toast.success("Settings saved"); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <AppLayout title="Settings" subtitle="Business & AI preferences">
      <div className="max-w-2xl space-y-8">
        <section className="bg-[#121212] border border-[#262626] rounded-lg p-6">
          <h3 className="font-heading font-bold text-lg mb-4">Business details</h3>
          <div className="space-y-4">
            <div><Label className="text-xs text-[#A3A3A3]">Business name</Label><Input data-testid="settings-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
            <div><Label className="text-xs text-[#A3A3A3]">Website</Label><Input data-testid="settings-website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-[#A3A3A3]">Industry</Label><Input data-testid="settings-industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              <div><Label className="text-xs text-[#A3A3A3]">Service area</Label><Input data-testid="settings-area" value={form.service_area} onChange={(e) => setForm({ ...form, service_area: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
            </div>
          </div>
        </section>

        <section className="bg-[#121212] border border-[#262626] rounded-lg p-6">
          <h3 className="font-heading font-bold text-lg mb-1">AI model preference</h3>
          <p className="text-sm text-[#737373] mb-4">Choose which AI powers your content, SEO and review replies.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button key={p.id} data-testid={`ai-pref-${p.id}`} onClick={() => setPref(p.id)}
                className={`text-left p-4 rounded-lg border transition-colors ${pref === p.id ? "border-indigo-500 bg-indigo-500/10" : "border-[#262626] bg-[#0A0A0A] hover:border-[#3f3f46]"}`}>
                <p.icon size={22} weight="duotone" className={pref === p.id ? "text-indigo-400" : "text-[#737373]"} />
                <div className="font-medium text-sm mt-2">{p.name}</div>
                <div className="text-xs text-[#737373] mt-1 leading-snug">{p.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <Button data-testid="save-settings-btn" onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 font-semibold">{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </AppLayout>
  );
}
