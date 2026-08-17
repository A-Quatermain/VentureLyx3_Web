import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { api, formatApiErrorDetail } from "@/lib/api";
import AiStreamDialog from "@/components/AiStreamDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Star, Sparkle, Plus, Check, PaperPlaneTilt } from "@phosphor-icons/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function Stars({ n }) {
  return <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} weight={i <= n ? "fill" : "regular"} className={i <= n ? "text-amber-400" : "text-[#404040]"} />)}</div>;
}

export default function Reviews() {
  const [data, setData] = useState({ reviews: [], count: 0, rating: 0, trend: [] });
  const [addOpen, setAddOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [form, setForm] = useState({ author: "", rating: 5, text: "", source: "Google" });
  const [req, setReq] = useState({ customer_name: "", channel: "email", contact: "" });
  const [ai, setAi] = useState(null);

  const load = () => api.get("/reviews").then((r) => setData(r.data));
  useEffect(() => { load(); }, []);

  const add = async () => { if (!form.author) return toast.error("Author required"); await api.post("/reviews", { ...form, rating: Number(form.rating) }); setAddOpen(false); setForm({ author: "", rating: 5, text: "", source: "Google" }); load(); toast.success("Review added"); };
  const sendReq = async () => { if (!req.customer_name) return toast.error("Name required"); await api.post("/reviews/requests", req); setReqOpen(false); setReq({ customer_name: "", channel: "email", contact: "" }); toast.success("Review request logged"); };

  const draft = (rev) => setAi({ rev, title: `Reply to ${rev.author}`, path: "/ai/reviews/respond", body: { author: rev.author, rating: rev.rating, text: rev.text } });
  const saveResponse = async (text) => { await api.put(`/reviews/${ai.rev.id}/response`, { response: text }); load(); toast.success("Response saved"); };

  return (
    <AppLayout title="Reviews" subtitle="Reputation & AI responses" actions={
      <div className="flex gap-2">
        <Dialog open={reqOpen} onOpenChange={setReqOpen}>
          <DialogTrigger asChild><Button variant="secondary" size="sm" data-testid="request-review-btn"><PaperPlaneTilt size={15} /> Request review</Button></DialogTrigger>
          <DialogContent className="bg-[#121212] border-[#262626] text-white">
            <DialogHeader><DialogTitle className="font-heading">Request a review</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-[#A3A3A3]">Customer name</Label><Input data-testid="req-name" value={req.customer_name} onChange={(e) => setReq({ ...req, customer_name: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              <div><Label className="text-xs text-[#A3A3A3]">Contact (email/phone)</Label><Input data-testid="req-contact" value={req.contact} onChange={(e) => setReq({ ...req, contact: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
            </div>
            <DialogFooter><Button data-testid="send-request-btn" onClick={sendReq} className="bg-indigo-600 hover:bg-indigo-700">Send request</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button size="sm" data-testid="add-review-btn" className="bg-indigo-600 hover:bg-indigo-700"><Plus size={15} /> Add review</Button></DialogTrigger>
          <DialogContent className="bg-[#121212] border-[#262626] text-white">
            <DialogHeader><DialogTitle className="font-heading">Add a review</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-[#A3A3A3]">Author</Label><Input data-testid="review-author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
              <div><Label className="text-xs text-[#A3A3A3]">Rating</Label>
                <Select value={String(form.rating)} onValueChange={(v) => setForm({ ...form, rating: v })}>
                  <SelectTrigger data-testid="review-rating" className="mt-1 bg-[#0A0A0A] border-[#333]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#121212] border-[#333] text-white">{[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} stars</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-[#A3A3A3]">Review text</Label><Textarea data-testid="review-text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="mt-1 bg-[#0A0A0A] border-[#333]" /></div>
            </div>
            <DialogFooter><Button data-testid="save-review-btn" onClick={add} className="bg-indigo-600 hover:bg-indigo-700">Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    }>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-[#121212] border border-[#262626] rounded-lg p-6" data-testid="rating-summary">
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#737373]">Average Rating</span>
          <div className="flex items-end gap-2 mt-3"><span className="font-mono text-5xl font-medium text-amber-400">{data.rating || 0}</span><span className="text-[#737373] mb-2">/ 5</span></div>
          <div className="mt-2"><Stars n={Math.round(data.rating)} /></div>
          <div className="text-xs text-[#737373] mt-3">{data.count} reviews</div>
        </div>
        <div className="lg:col-span-2 bg-[#121212] border border-[#262626] rounded-lg p-6">
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#737373]">Monthly Trend</span>
          <div className="mt-4 h-[140px]">
            {data.trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <XAxis dataKey="month" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#525252" fontSize={11} domain={[0, 5]} tickLine={false} axisLine={false} width={20} />
                  <Tooltip contentStyle={{ background: "#121212", border: "1px solid #262626", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                  <Line type="monotone" dataKey="avg" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: "#8B5CF6", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-sm text-[#525252]">Add reviews over time to see trends.</div>}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.reviews.length === 0 && <div className="text-center py-16 text-sm text-[#525252] border border-dashed border-[#262626] rounded-lg">No reviews yet. Add one or request from customers.</div>}
        {data.reviews.map((r) => (
          <div key={r.id} data-testid={`review-${r.id}`} className="bg-[#121212] border border-[#262626] rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium">{r.author}</span><Stars n={r.rating} /><span className="text-xs text-[#525252] font-mono">{r.source}</span></div>
                <p className="text-sm text-[#A3A3A3] mt-2">{r.text}</p>
              </div>
              {!r.responded ? (
                <Button size="sm" data-testid={`respond-${r.id}`} onClick={() => draft(r)}
                  className="shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"><Sparkle size={14} weight="fill" /> Draft reply</Button>
              ) : <span className="shrink-0 text-xs text-emerald-400 flex items-center gap-1"><Check size={14} /> Replied</span>}
            </div>
            {r.responded && r.ai_response && (
              <div className="mt-3 pl-4 border-l-2 border-indigo-500/40 bg-[#0C101F] rounded-r-md p-3">
                <div className="text-[10px] font-mono uppercase text-violet-300 mb-1">Your reply</div>
                <p className="text-sm text-[#E5E7EB]">{r.ai_response}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {ai && <AiStreamDialog open={!!ai} onOpenChange={(o) => !o && setAi(null)} title={ai.title} path={ai.path} body={ai.body} onApprove={saveResponse} approveLabel="Approve & Save" />}
    </AppLayout>
  );
}
