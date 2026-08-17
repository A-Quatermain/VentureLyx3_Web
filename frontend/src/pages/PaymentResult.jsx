import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function PaymentResult() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const cancelled = location.pathname.includes("cancel");
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState(cancelled ? "cancelled" : "checking");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (cancelled || !sessionId) return;
    if (attempts >= 6) { setStatus("timeout"); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") setStatus("paid");
        else if (["failed", "expired"].includes(data.payment_status)) setStatus("failed");
        else setAttempts((a) => a + 1);
      } catch { setAttempts((a) => a + 1); }
    }, 1800);
    return () => clearTimeout(t);
  }, [attempts, cancelled, sessionId]);

  const cfg = {
    checking: { icon: CircleNotch, cls: "text-indigo-400 animate-spin", title: "Confirming your payment…", desc: "Hang tight while we check with Stripe." },
    paid: { icon: CheckCircle, cls: "text-emerald-400", title: "Payment successful", desc: "Your invoice is now marked as paid." },
    failed: { icon: XCircle, cls: "text-red-400", title: "Payment failed", desc: "Something went wrong. Please try again." },
    cancelled: { icon: XCircle, cls: "text-amber-400", title: "Payment cancelled", desc: "No charge was made." },
    timeout: { icon: CircleNotch, cls: "text-amber-400", title: "Still processing", desc: "This is taking longer than usual. Check your invoices shortly." },
  }[status];
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] vx-grid-bg px-4">
      <div className="text-center max-w-md vx-fade-up" data-testid="payment-result">
        <Icon size={56} weight="fill" className={`mx-auto ${cfg.cls}`} />
        <h1 className="font-heading font-extrabold text-2xl tracking-tight mt-6">{cfg.title}</h1>
        <p className="text-sm text-[#A3A3A3] mt-2">{cfg.desc}</p>
        <Button data-testid="back-to-invoices-btn" onClick={() => navigate("/app/operate")} className="mt-8 bg-indigo-600 hover:bg-indigo-700">Back to invoices</Button>
      </div>
    </div>
  );
}
