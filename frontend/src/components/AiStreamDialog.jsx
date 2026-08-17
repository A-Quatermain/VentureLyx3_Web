import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { streamPost } from "@/lib/api";
import { Sparkle, Check, ArrowClockwise, Copy } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function AiStreamDialog({ open, onOpenChange, title, path, body, onApprove, approveLabel = "Approve & Save" }) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const runIdRef = useRef(0);

  const run = async () => {
    const myId = ++runIdRef.current;
    setText(""); setDone(false); setStreaming(true);
    try {
      await streamPost(path, body, (chunk) => {
        if (runIdRef.current === myId) setText((t) => t + chunk);
      });
    } catch {
      if (runIdRef.current === myId) toast.error("The AI couldn't complete that. Please try again.");
    } finally {
      if (runIdRef.current === myId) { setStreaming(false); setDone(true); }
    }
  };

  useEffect(() => { if (open) run(); /* eslint-disable-next-line */ }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [text]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0C101F] border border-indigo-500/25 text-white max-w-2xl shadow-[0_0_40px_rgba(79,70,229,0.15)]" data-testid="ai-stream-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-lg">
            <Sparkle size={20} weight="fill" className="text-violet-400" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg bg-[#050810] border border-indigo-500/15 p-4 max-h-[46vh] overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap text-[#E5E7EB]" data-testid="ai-output">
          {text || <span className="text-[#737373]">Thinking…</span>}
          {streaming && <span className="vx-cursor" />}
          <div ref={bottomRef} />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-[#737373]">You review and approve every AI output before it's used.</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" data-testid="ai-copy-btn" disabled={!text}
              onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}>
              <Copy size={15} /> Copy
            </Button>
            <Button variant="secondary" size="sm" data-testid="ai-regenerate-btn" disabled={streaming} onClick={run}>
              <ArrowClockwise size={15} /> Regenerate
            </Button>
            {onApprove && (
              <Button size="sm" data-testid="ai-approve-btn" disabled={streaming || !done || !text}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                onClick={() => { onApprove(text); onOpenChange(false); }}>
                <Check size={15} /> {approveLabel}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
