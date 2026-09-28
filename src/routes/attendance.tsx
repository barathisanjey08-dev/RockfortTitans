import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, DetentionBanner } from "@/components/AppShell";
import { GlassCard, ProgressRing, StatusPill } from "@/components/glass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/attendance";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Subject Attendance — The Core Calculator" },
      {
        name: "description",
        content:
          "Enter classes conducted and attended for each subject and instantly see required classes and safe misses.",
      },
      { property: "og:title", content: "Subject Attendance — The Core Calculator" },
      {
        property: "og:description",
        content: "Track every subject and see exactly what you must attend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const { state, setState, overview } = useStore();
  const [newSubject, setNewSubject] = useState("");

  const update = (id: string, field: "attended" | "conducted", raw: string) => {
    const value = Math.max(0, Math.floor(Number(raw) || 0));
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, [field]: value };
        if (next.attended > next.conducted) {
          if (field === "attended") next.attended = next.conducted;
          else next.attended = next.conducted;
        }
        return next;
      }),
    }));
  };

  const setByPercent = (id: string, raw: string) => {
    const pct = Math.max(0, Math.min(100, Number(raw) || 0));
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s.id === id ? { ...s, attended: Math.round((pct / 100) * s.conducted) } : s,
      ),
    }));
  };

  const addSubject = () => {
    const name = newSubject.trim();
    if (!name) { toast.error("Give the subject a name first."); return; }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (state.subjects.some((s) => s.id === id)) { toast.error("That subject already exists."); return; }
    setState((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { id, name, attended: 0, conducted: 0 }],
    }));
    setNewSubject("");
    toast.success(`${name} added. Set its periods in Settings → timetable.`);
  };

  const removeSubject = (id: string) => {
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
      timetable: Object.fromEntries(
        Object.entries(prev.timetable).map(([day, subs]) => [
          day,
          Object.fromEntries(Object.entries(subs).filter(([sid]) => sid !== id)),
        ]),
      ),
    }));
  };

  return (
    <AppShell>
      <DetentionBanner />

      <GlassCard>
        <h1 className="font-display text-xl font-semibold">Subject attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter conducted and attended classes. Everything recalculates instantly and is saved on
          this device.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Label htmlFor="new-subject" className="sr-only">
            New subject name
          </Label>
          <Input
            id="new-subject"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Add a subject (e.g. Biology)"
            className="h-10 max-w-xs bg-glass"
          />
          <Button onClick={addSubject} className="h-10 gap-2">
            <Plus className="h-4 w-4" /> Add subject
          </Button>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overview.subjects.map((a) => (
          <GlassCard key={a.subject.id} tilt className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">{a.subject.name}</h2>
                <StatusPill status={a.status}>{STATUS_LABEL[a.status]}</StatusPill>
              </div>
              <button
                onClick={() => removeSubject(a.subject.id)}
                aria-label={`Remove ${a.subject.name}`}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:text-critical"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <ProgressRing value={a.current} status={a.status} size={118} stroke={10} />
              <dl className="flex-1 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Missed</dt>
                  <dd className="font-semibold">{a.missed}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Remaining</dt>
                  <dd className="font-semibold">{a.remaining}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Max possible</dt>
                  <dd className="font-semibold">{a.maxPossible.toFixed(1)}%</dd>
                </div>
              </dl>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Field
                id={`${a.subject.id}-conducted`}
                label="Conducted"
                value={a.subject.conducted}
                onChange={(v) => update(a.subject.id, "conducted", v)}
              />
              <Field
                id={`${a.subject.id}-attended`}
                label="Attended"
                value={a.subject.attended}
                onChange={(v) => update(a.subject.id, "attended", v)}
              />
              <Field
                id={`${a.subject.id}-percent`}
                label="Percent"
                value={Number(a.current.toFixed(0))}
                onChange={(v) => setByPercent(a.subject.id, v)}
              />
            </div>

            <div className="rounded-xl border border-glass-border bg-glass px-3 py-2 text-xs">
              {a.detention ? (
                <p className="text-critical">
                  Even attending all {a.remaining} remaining classes only reaches{" "}
                  {a.maxPossible.toFixed(1)}%.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Attend <span className="font-semibold text-foreground">{a.minTarget.required}</span>{" "}
                  of {a.remaining} for {a.minTarget.target}% ·{" "}
                  {a.target90.possible
                    ? `${a.target90.required} of ${a.remaining} for 90%`
                    : "90% out of reach"}
                </p>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}

function Field({
  id, label, value, onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 bg-glass"
      />
    </div>
  );
}
