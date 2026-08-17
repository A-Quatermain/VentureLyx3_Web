import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash, CreditCard, CircleNotch } from "@phosphor-icons/react";

const STAGES = [
  { id: "new", label: "New" }, { id: "contacted", label: "Contacted" }, { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" }, { id: "won", label: "Won" }, { id: "lost", label: "Lost" },
];

export default function Operate() {
  return (
    <AppLayout title="Operate" subtitle="CRM, jobs & invoices">
      <Tabs defaultValue="leads">
        <TabsList className="bg-[#121212] border border-[#262626]">
          <TabsTrigger value="leads" data-testid="tab-leads" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Pipeline</TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Jobs</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="leads" className="mt-6"><Pipeline /></TabsContent>
        <TabsContent value="jobs" className="mt-6"><Jobs /></TabsContent>
        <TabsContent value="invoices" className="mt-6"><Invoices /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ---------------- Pipeline ---------------- */
function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", value: 0, source: "manual", stage: "new" });

  const load = () => api.get("/operate/leads").then((r) => setLeads(r.data));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name) return toast.error("Name is required");
    try { await api.post("/operate/leads", { ...form, value: Number(form.value) }); setOpen(false); setForm({ name: "", email: "", value: 0, source: "manual", stage: "new" }); load(); toast.success("Lead added"); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const move = async (lead, stage) => { await api.put(`/operate/leads/${lead.id}`, { stage }); load(); };
  const remove = async (id) => { await api.delete(`/operate/leads/${id}`); load(); };

  const total = leads.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + (l.value || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[#A3A3A3]">Open pipeline value: <span className="font-mono text-emerald-400">${total.toLocaleString()}</span></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="add-lead-btn" className="bg-indigo-600 hover:bg-indigo-700"><Plus size={16} /> Add lead</Button></DialogTrigger>
          <DialogContent className="bg-[#121212] border-[#262626] text-white">
            <DialogHeader><DialogTitle className="font-heading">New lead</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-[#A3A3A3]">Name</Label><Input data-testid="lead-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              <div><Label className="text-xs text-[#A3A3A3]">Email</Label><Input data-testid="lead-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-[#A3A3A3]">Value ($)</Label><Input data-testid="lead-value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
                <div><Label className="text-xs text-[#A3A3A3]">Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                    <SelectTrigger className="mt-1 bg-[#0A0A0A] border-[#333]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#121212] border-[#333] text-white">{STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button data-testid="save-lead-btn" onClick={add} className="bg-indigo-600 hover:bg-indigo-700">Add lead</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage.id);
          return (
            <div key={stage.id} data-testid={`stage-${stage.id}`} className="min-w-[280px] w-[280px] bg-[#0A0A0A] rounded-lg border border-[#262626] flex flex-col">
              <div className="px-4 py-3 border-b border-[#262626] flex items-center justify-between">
                <span className="text-sm font-semibold">{stage.label}</span>
                <span className="text-xs font-mono text-[#737373]">{items.length}</span>
              </div>
              <div className="p-3 space-y-2 min-h-[120px]">
                {items.map((l) => (
                  <div key={l.id} data-testid={`lead-card-${l.id}`} className="bg-[#171717] border border-[#333] p-3 rounded-md hover:border-slate-500 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-sm">{l.name}</div>
                      <button data-testid={`delete-lead-${l.id}`} onClick={() => remove(l.id)} className="text-[#525252] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={14} /></button>
                    </div>
                    {l.email && <div className="text-xs text-[#737373] mt-0.5 truncate">{l.email}</div>}
                    <div className="font-mono text-emerald-400 text-sm mt-2">${(l.value || 0).toLocaleString()}</div>
                    <Select value={l.stage} onValueChange={(v) => move(l, v)}>
                      <SelectTrigger className="mt-2 h-7 text-xs bg-[#0A0A0A] border-[#333]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#121212] border-[#333] text-white">{STAGES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Jobs ---------------- */
const JOB_STATUS = ["scheduled", "in_progress", "completed"];
function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", customer_name: "", status: "scheduled", scheduled_date: "", value: 0 });
  const load = () => api.get("/operate/jobs").then((r) => setJobs(r.data));
  useEffect(() => { load(); }, []);
  const add = async () => { if (!form.title) return toast.error("Title required"); await api.post("/operate/jobs", { ...form, value: Number(form.value) }); setOpen(false); setForm({ title: "", customer_name: "", status: "scheduled", scheduled_date: "", value: 0 }); load(); toast.success("Job created"); };
  const update = async (job, status) => { await api.put(`/operate/jobs/${job.id}`, { ...job, status }); load(); };
  const remove = async (id) => { await api.delete(`/operate/jobs/${id}`); load(); };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="add-job-btn" className="bg-indigo-600 hover:bg-indigo-700"><Plus size={16} /> New job</Button></DialogTrigger>
          <DialogContent className="bg-[#121212] border-[#262626] text-white">
            <DialogHeader><DialogTitle className="font-heading">New job</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-[#A3A3A3]">Title</Label><Input data-testid="job-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              <div><Label className="text-xs text-[#A3A3A3]">Customer</Label><Input data-testid="job-customer" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-[#A3A3A3]">Date</Label><Input data-testid="job-date" type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
                <div><Label className="text-xs text-[#A3A3A3]">Value ($)</Label><Input data-testid="job-value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              </div>
            </div>
            <DialogFooter><Button data-testid="save-job-btn" onClick={add} className="bg-indigo-600 hover:bg-indigo-700">Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        {jobs.length === 0 && <Empty text="No jobs scheduled yet." />}
        {jobs.map((j) => (
          <div key={j.id} data-testid={`job-row-${j.id}`} className="bg-[#121212] border border-[#262626] rounded-lg p-4 flex items-center gap-4 hover:border-[#3f3f46] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-medium">{j.title}</div>
              <div className="text-xs text-[#737373]">{j.customer_name} · {j.scheduled_date || "unscheduled"}</div>
            </div>
            <div className="font-mono text-emerald-400 text-sm">${(j.value || 0).toLocaleString()}</div>
            <Select value={j.status} onValueChange={(v) => update(j, v)}>
              <SelectTrigger className="w-36 h-8 text-xs bg-[#0A0A0A] border-[#333]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#121212] border-[#333] text-white">{JOB_STATUS.map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
            <button data-testid={`delete-job-${j.id}`} onClick={() => remove(j.id)} className="text-[#525252] hover:text-red-400"><Trash size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Invoices ---------------- */
function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [open, setOpen] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [form, setForm] = useState({ customer_name: "", customer_email: "", items: [{ description: "", amount: 0 }] });
  const load = () => api.get("/operate/invoices").then((r) => setInvoices(r.data));
  useEffect(() => { load(); }, []);

  const setItem = (i, k, v) => { const items = [...form.items]; items[i] = { ...items[i], [k]: v }; setForm({ ...form, items }); };
  const addItem = () => setForm({ ...form, items: [...form.items, { description: "", amount: 0 }] });
  const total = form.items.reduce((s, it) => s + Number(it.amount || 0), 0);

  const create = async () => {
    if (!form.customer_name) return toast.error("Customer name required");
    const items = form.items.filter((i) => i.description).map((i) => ({ description: i.description, amount: Number(i.amount) }));
    if (!items.length) return toast.error("Add at least one line item");
    try { await api.post("/operate/invoices", { ...form, items }); setOpen(false); setForm({ customer_name: "", customer_email: "", items: [{ description: "", amount: 0 }] }); load(); toast.success("Invoice created"); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const pay = async (inv) => {
    setPayingId(inv.id);
    try {
      const { data } = await api.post("/payments/checkout", { invoice_id: inv.id, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); setPayingId(null); }
  };
  const remove = async (id) => { await api.delete(`/operate/invoices/${id}`); load(); };

  const badge = { paid: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", sent: "text-amber-400 bg-amber-500/10 border-amber-500/30", draft: "text-[#A3A3A3] bg-white/5 border-[#333]" };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="add-invoice-btn" className="bg-indigo-600 hover:bg-indigo-700"><Plus size={16} /> New invoice</Button></DialogTrigger>
          <DialogContent className="bg-[#121212] border-[#262626] text-white max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">New invoice</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-[#A3A3A3]">Customer</Label><Input data-testid="invoice-customer" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
                <div><Label className="text-xs text-[#A3A3A3]">Email</Label><Input data-testid="invoice-email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              </div>
              <Label className="text-xs text-[#A3A3A3]">Line items</Label>
              {form.items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <Input data-testid={`invoice-item-desc-${i}`} placeholder="Description" value={it.description} onChange={(e) => setItem(i, "description", e.target.value)} className="bg-[#0A0A0A] border-[#333]" />
                  <Input data-testid={`invoice-item-amount-${i}`} type="number" placeholder="0" value={it.amount} onChange={(e) => setItem(i, "amount", e.target.value)} className="w-28 bg-[#0A0A0A] border-[#333]" />
                </div>
              ))}
              <button onClick={addItem} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add line item</button>
              <div className="text-right font-mono text-lg pt-2 border-t border-[#262626]">Total: <span className="text-emerald-400">${total.toFixed(2)}</span></div>
            </div>
            <DialogFooter><Button data-testid="save-invoice-btn" onClick={create} className="bg-indigo-600 hover:bg-indigo-700">Create invoice</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        {invoices.length === 0 && <Empty text="No invoices yet." />}
        {invoices.map((inv) => (
          <div key={inv.id} data-testid={`invoice-row-${inv.id}`} className="bg-[#121212] border border-[#262626] rounded-lg p-4 flex items-center gap-4 hover:border-[#3f3f46] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2"><span className="font-mono text-xs text-[#737373]">{inv.number}</span> {inv.customer_name}</div>
              <div className="text-xs text-[#737373] truncate">{inv.items.map((i) => i.description).join(", ")}</div>
            </div>
            <div className="font-mono text-white">${inv.amount.toFixed(2)}</div>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${badge[inv.status]}`}>{inv.status}</span>
            {inv.status !== "paid" && (
              <Button size="sm" data-testid={`pay-invoice-${inv.id}`} disabled={payingId === inv.id} onClick={() => pay(inv)} className="bg-indigo-600 hover:bg-indigo-700">
                {payingId === inv.id ? <CircleNotch size={14} className="animate-spin" /> : <CreditCard size={14} />} Pay
              </Button>
            )}
            <button data-testid={`delete-invoice-${inv.id}`} onClick={() => remove(inv.id)} className="text-[#525252] hover:text-red-400"><Trash size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ text }) { return <div className="text-center py-16 text-sm text-[#525252] border border-dashed border-[#262626] rounded-lg">{text}</div>; }
