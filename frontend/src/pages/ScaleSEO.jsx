import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { api, formatApiErrorDetail } from "@/lib/api";
import AiStreamDialog from "@/components/AiStreamDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MagnifyingGlass, CircleNotch, Warning, CheckCircle, Sparkle, Plus, Trash, MagicWand } from "@phosphor-icons/react";

const SEV = { high: "text-red-400 border-red-500/30 bg-red-500/10", medium: "text-amber-400 border-amber-500/30 bg-amber-500/10", low: "text-[#A3A3A3] border-[#333] bg-white/5" };

export default function ScaleSEO() {
  const { business } = useAuth();
  const [url, setUrl] = useState(business?.website || "");
  const [audit, setAudit] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [ai, setAi] = useState(null); // {title, path, body}

  const loadLatest = () => api.get("/seo/audits").then((r) => { if (r.data.length) setAudit(r.data[0]); });
  useEffect(() => { loadLatest(); }, []);

  const scan = async () => {
    if (!url) return toast.error("Enter a website URL");
    setScanning(true);
    try { const { data } = await api.post("/seo/scan", { url }); setAudit(data); toast.success(`Scan complete — score ${data.score}`); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setScanning(false); }
  };

  const fixIt = (issue) => setAi({ title: `Fix: ${issue.label}`, path: "/ai/seo/recommend", body: { issue_label: issue.label, detail: issue.detail, recommendation: issue.recommendation } });

  return (
    <AppLayout title="ScaleSEO" subtitle="Get found by more customers">
      <Tabs defaultValue="scanner">
        <TabsList className="bg-[#121212] border border-[#262626]">
          <TabsTrigger value="scanner" data-testid="tab-scanner" className="data-[state=active]:bg-indigo-600">Site Health</TabsTrigger>
          <TabsTrigger value="generate" data-testid="tab-generate" className="data-[state=active]:bg-indigo-600">AI Page Builder</TabsTrigger>
          <TabsTrigger value="keywords" data-testid="tab-keywords" className="data-[state=active]:bg-indigo-600">Keywords</TabsTrigger>
          <TabsTrigger value="competitors" data-testid="tab-competitors" className="data-[state=active]:bg-indigo-600">Competitors</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="mt-6">
          <div className="flex gap-3 mb-6">
            <Input data-testid="seo-url-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourbusiness.com" className="bg-[#0A0A0A] border-[#333] max-w-md" />
            <Button data-testid="seo-scan-btn" onClick={scan} disabled={scanning} className="bg-indigo-600 hover:bg-indigo-700">
              {scanning ? <CircleNotch size={16} className="animate-spin" /> : <MagnifyingGlass size={16} />} Scan site
            </Button>
          </div>

          {!audit ? (
            <div className="text-center py-20 text-sm text-[#525252] border border-dashed border-[#262626] rounded-lg">Scan your website to see what's stopping customers from finding you.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-6 text-center" data-testid="seo-score-card">
                <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#737373]">SEO Health</span>
                <div className={`font-mono text-6xl font-medium mt-4 ${audit.score >= 70 ? "text-emerald-400" : audit.score >= 40 ? "text-amber-400" : "text-red-400"}`}>{audit.score}</div>
                <div className="text-xs text-[#737373] mt-1">out of 100</div>
                <div className="mt-4 text-sm text-[#A3A3A3]">We found <span className="text-white font-semibold">{audit.issues_count}</span> things to improve.</div>
                <div className="mt-1 text-xs text-[#525252] truncate">{audit.url}</div>
              </div>

              <div className="lg:col-span-2 space-y-3">
                {audit.checks.map((c) => (
                  <div key={c.id} data-testid={`seo-check-${c.id}`} className="bg-[#121212] border border-[#262626] rounded-lg p-4 flex items-start gap-3">
                    {c.status === "pass" ? <CheckCircle size={20} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" /> : <Warning size={20} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.label}</span>
                        {c.status === "fail" && <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${SEV[c.severity]}`}>{c.severity}</span>}
                      </div>
                      <div className="text-xs text-[#A3A3A3] mt-0.5">{c.detail}</div>
                    </div>
                    {c.status === "fail" && (
                      <Button size="sm" data-testid={`fix-${c.id}-btn`} onClick={() => fixIt(c)}
                        className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shrink-0 vx-sheen">
                        <Sparkle size={14} weight="fill" /> Fix this for me
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="generate" className="mt-6"><PageBuilder onGenerate={setAi} /></TabsContent>
        <TabsContent value="keywords" className="mt-6"><Keywords /></TabsContent>
        <TabsContent value="competitors" className="mt-6"><Competitors /></TabsContent>
      </Tabs>

      {ai && <AiStreamDialog open={!!ai} onOpenChange={(o) => !o && setAi(null)} title={ai.title} path={ai.path} body={ai.body} />}
    </AppLayout>
  );
}

function PageBuilder({ onGenerate }) {
  const [form, setForm] = useState({ page_type: "service", topic: "", keywords: "" });
  return (
    <div className="max-w-xl bg-[#121212] border border-[#262626] rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2"><MagicWand size={20} className="text-violet-400" weight="duotone" /><h3 className="font-heading font-bold">Generate an SEO page</h3></div>
      <p className="text-sm text-[#A3A3A3]">AI writes a complete, ready-to-publish page — title, copy, FAQs, meta and schema.</p>
      <div>
        <Label className="text-xs text-[#A3A3A3]">Page type</Label>
        <Select value={form.page_type} onValueChange={(v) => setForm({ ...form, page_type: v })}>
          <SelectTrigger data-testid="page-type" className="mt-1 bg-[#0A0A0A] border-[#333]"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#121212] border-[#333] text-white">
            <SelectItem value="service">Service page</SelectItem>
            <SelectItem value="local">Local landing page</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs text-[#A3A3A3]">Topic / service</Label><Input data-testid="page-topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Weekly pool cleaning" className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
      <div><Label className="text-xs text-[#A3A3A3]">Target keywords (optional)</Label><Input data-testid="page-keywords" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="pool cleaning austin" className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
      <Button data-testid="generate-page-btn" onClick={() => { if (!form.topic) return toast.error("Enter a topic"); onGenerate({ title: "AI Page Builder", path: "/ai/seo/generate-page", body: form }); }}
        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 font-semibold"><Sparkle size={16} weight="fill" /> Generate page</Button>
    </div>
  );
}

function Keywords() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ keyword: "", position: 0, volume: 0, difficulty: 0 });
  const load = () => api.get("/seo/keywords").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const add = async () => { if (!form.keyword) return toast.error("Enter a keyword"); await api.post("/seo/keywords", { keyword: form.keyword, position: Number(form.position), volume: Number(form.volume), difficulty: Number(form.difficulty) }); setForm({ keyword: "", position: 0, volume: 0, difficulty: 0 }); load(); };
  const remove = async (id) => { await api.delete(`/seo/keywords/${id}`); load(); };
  return (
    <div className="max-w-3xl">
      <div className="flex gap-2 mb-4 flex-wrap">
        <Input data-testid="kw-input" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="Keyword" className="bg-[#0A0A0A] border-[#333] flex-1 min-w-[160px]" />
        <Input data-testid="kw-position" type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Rank" className="bg-[#0A0A0A] border-[#333] w-24" />
        <Input data-testid="kw-volume" type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} placeholder="Volume" className="bg-[#0A0A0A] border-[#333] w-28" />
        <Button data-testid="kw-add" onClick={add} className="bg-indigo-600 hover:bg-indigo-700"><Plus size={16} /> Track</Button>
      </div>
      <div className="bg-[#121212] border border-[#262626] rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_100px_100px_40px] px-4 py-2 text-xs uppercase tracking-wider text-[#737373] border-b border-[#262626]"><span>Keyword</span><span>Rank</span><span>Volume</span><span>Difficulty</span><span /></div>
        {items.length === 0 && <div className="px-4 py-10 text-center text-sm text-[#525252]">No keywords tracked yet.</div>}
        {items.map((k) => (
          <div key={k.id} data-testid={`kw-row-${k.id}`} className="grid grid-cols-[1fr_80px_100px_100px_40px] px-4 py-3 border-b border-[#1c1c1c] items-center text-sm">
            <span>{k.keyword}</span><span className="font-mono">#{k.position || "—"}</span><span className="font-mono text-[#A3A3A3]">{k.volume || "—"}</span><span className="font-mono text-[#A3A3A3]">{k.difficulty || "—"}</span>
            <button data-testid={`kw-del-${k.id}`} onClick={() => remove(k.id)} className="text-[#525252] hover:text-red-400"><Trash size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Competitors() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", domain: "", score: 0, notes: "" });
  const load = () => api.get("/seo/competitors").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const add = async () => { if (!form.name) return toast.error("Enter a name"); await api.post("/seo/competitors", { ...form, score: Number(form.score) }); setForm({ name: "", domain: "", score: 0, notes: "" }); load(); };
  const remove = async (id) => { await api.delete(`/seo/competitors/${id}`); load(); };
  return (
    <div className="max-w-3xl">
      <div className="flex gap-2 mb-4 flex-wrap">
        <Input data-testid="comp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Competitor name" className="bg-[#0A0A0A] border-[#333] flex-1 min-w-[140px]" />
        <Input data-testid="comp-domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="domain.com" className="bg-[#0A0A0A] border-[#333] flex-1 min-w-[140px]" />
        <Input data-testid="comp-score" type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="Score" className="bg-[#0A0A0A] border-[#333] w-24" />
        <Button data-testid="comp-add" onClick={add} className="bg-indigo-600 hover:bg-indigo-700"><Plus size={16} /> Add</Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <div className="px-4 py-10 text-center text-sm text-[#525252] border border-dashed border-[#262626] rounded-lg">No competitors tracked yet.</div>}
        {items.map((c) => (
          <div key={c.id} data-testid={`comp-row-${c.id}`} className="bg-[#121212] border border-[#262626] rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1"><div className="font-medium">{c.name}</div><div className="text-xs text-[#737373]">{c.domain}</div></div>
            <div className="font-mono text-indigo-400">{c.score || "—"}</div>
            <button data-testid={`comp-del-${c.id}`} onClick={() => remove(c.id)} className="text-[#525252] hover:text-red-400"><Trash size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
