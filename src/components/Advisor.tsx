import { useEffect, useRef, useState } from "react";
import { Brain, Send, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatLong } from "@/lib/attendance";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "Can I take leave?",
  "How many classes can I miss?",
  "Can I reach 90%?",
  "Check November recovery",
  "Show my weakest subject",
  "Calculate my safe limit",
];

export function Advisor() {
  const { state, overview, today } = useStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I can see your live attendance data. Ask me about leave, safe misses, targets or recovery.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const snapshot = () =>
    JSON.stringify({
      today: formatLong(today.toISOString().slice(0, 10)),
      planningDate: formatLong(state.config.planningDate),
      recoveryDeadline: formatLong(state.config.deadlineDate),
      minimumRequiredPercent: state.config.minRequired,
      customTargetPercent: state.config.customTarget,
      classAndSection: `${state.className} ${state.section}`,
      overall: {
        attended: overview.attended,
        conducted: overview.conducted,
        currentPercent: +overview.current.toFixed(2),
        classesRemainingUntilPlanningDate: overview.remaining,
        maxPossiblePercent: +overview.maxPossible.toFixed(2),
        mustAttendForMinimum: overview.minTarget.required,
        safeMisses: overview.minTarget.safeMisses,
        canReach90: overview.target90.possible,
        mustAttendFor90: overview.target90.required,
        irreversibleDetention: overview.detention,
        recoveryBeforeDeadline: overview.deadline,
      },
      subjects: overview.subjects.map((s) => ({
        name: s.subject.name,
        attended: s.subject.attended,
        conducted: s.subject.conducted,
        missed: s.missed,
        currentPercent: +s.current.toFixed(2),
        status: s.status,
        remainingClasses: s.remaining,
        maxPossiblePercent: +s.maxPossible.toFixed(2),
        mustAttendForMinimum: s.minTarget.required,
        safeMisses: s.minTarget.safeMisses,
        mustAttendFor90: s.target90.required,
        canReach90: s.target90.possible,
        irreversibleDetention: s.detention,
      })),
    });

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          snapshot: snapshot(),
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: err || "Sorry, I couldn't answer that right now.",
          };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              answer += evt.delta;
            } else if (evt.type === "response.output_text.done" && !answer && evt.text) {
              answer = evt.text;
            }
          } catch {
            /* ignore partial frames */
          }
        }
        const current = answer;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: current };
          return copy;
        });
      }

      if (!answer) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "I didn't get a response. Please try again.",
          };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Connection problem — please try again.",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Attendance Advisor" : "Open Attendance Advisor"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-glass-border text-primary-foreground shadow-[0_0_35px_-4px_var(--primary)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={{ background: "var(--gradient-hero)" }}
      >
        {open ? <X className="h-6 w-6" /> : <Brain className="h-6 w-6" />}
      </button>

      {open && (
        <div className="animate-rise fixed bottom-24 right-4 z-50 flex h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col glass-strong">
          <header className="border-b border-glass-border p-4">
            <h2 className="font-display text-lg font-semibold">Attendance Advisor</h2>
            <p className="text-xs text-muted-foreground">Ask me anything about your attendance.</p>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-glass text-foreground",
                  )}
                >
                  {m.content || (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Thinking" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-glass-border px-3 py-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={busy}
                className="rounded-full border border-glass-border px-2.5 py-1 text-[0.7rem] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-glass-border p-3"
          >
            <label htmlFor="advisor-input" className="sr-only">
              Message the Attendance Advisor
            </label>
            <input
              id="advisor-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Can I miss 3 Chemistry classes?"
              className="h-10 flex-1 rounded-full border border-glass-border bg-glass px-4 text-sm outline-none focus-visible:border-primary/60"
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full" disabled={busy}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
