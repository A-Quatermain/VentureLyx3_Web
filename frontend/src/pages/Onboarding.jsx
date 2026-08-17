import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Rocket } from "@phosphor-icons/react";

const INDUSTRIES = ["Home Services", "Pool Service & Repair", "HVAC", "Landscaping", "Cleaning",
  "Construction", "Retail / E-commerce", "Restaurant / Food", "Health & Wellness", "Professional Services", "Other"];

export default function Onboarding() {
  const { setBusiness, refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", website: "", industry: "", service_area: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.industry || !form.service_area) { toast.error("Fill in the required fields"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/business/onboard", form);
      setBusiness(data);
      await refresh();
      toast.success("Your business is set up!");
      navigate("/app/command");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] vx-grid-bg px-4 py-10">
      <div className="w-full max-w-lg vx-fade-up">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4">
            <Rocket size={24} weight="fill" />
          </div>
          <h1 className="font-heading font-extrabold text-3xl tracking-tight text-white">Tell us about your business</h1>
          <p className="text-sm text-[#737373] mt-2">We'll tailor your Command Center and AI to your business.</p>
        </div>
        <form onSubmit={submit} className="bg-[#121212] border border-[#262626] rounded-xl p-8 space-y-5">
          <div>
            <Label className="text-[#A3A3A3] text-xs uppercase tracking-wider">Business name *</Label>
            <Input data-testid="onboard-name" value={form.name} onChange={set("name")} placeholder="e.g. Blue Ridge Pools" required
              className="mt-1.5 bg-[#0A0A0A] border-[#333] text-white" />
          </div>
          <div>
            <Label className="text-[#A3A3A3] text-xs uppercase tracking-wider">Website</Label>
            <Input data-testid="onboard-website" value={form.website} onChange={set("website")} placeholder="yourbusiness.com"
              className="mt-1.5 bg-[#0A0A0A] border-[#333] text-white" />
          </div>
          <div>
            <Label className="text-[#A3A3A3] text-xs uppercase tracking-wider">Industry *</Label>
            <Select value={form.industry} onValueChange={set("industry")}>
              <SelectTrigger data-testid="onboard-industry" className="mt-1.5 bg-[#0A0A0A] border-[#333] text-white"><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent className="bg-[#121212] border-[#333] text-white">
                {INDUSTRIES.map((i) => <SelectItem key={i} value={i} className="focus:bg-[#1f1f1f]">{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#A3A3A3] text-xs uppercase tracking-wider">Service area *</Label>
            <Input data-testid="onboard-area" value={form.service_area} onChange={set("service_area")} placeholder="e.g. Austin, TX" required
              className="mt-1.5 bg-[#0A0A0A] border-[#333] text-white" />
          </div>
          <Button data-testid="onboard-submit" type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold">
            {loading ? "Setting up…" : "Launch my Command Center"}
          </Button>
        </form>
      </div>
    </div>
  );
}
