import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { GlassCard, StatusPill } from "@/components/glass";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";
import { percent, simulateMiss, statusOf, targetFor } from "@/lib/attendance";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "OD & Leave Simulator — The Core Calculator" },
      {
        name: "description",
        content:
          "Simulate on-duty, medical or normal leave and see the exact before/after impact on each subject.",
      },
      { property: "og:title", content: "OD & Leave Simulator — The Core Calculator" },
      {
        property: "og:description",
        content: "Find out whether you can afford that leave before you take it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SimulatorPage,
});

const LEAVE_TYPES = [
  { id: "od", label: "On-Duty (OD)", counted: true, note: "Counted as present." },
  { id: "medical", label: "Medical Leave", counted: true, note: "Counted as present if approved." },
  { id: "approved", label: "Approved Leave", counted: false, note: "Marked absent." },
  { id: "absence", label: "Normal Absence", counted: false, note: "Marked absent." },
] as const;

function SimulatorPage() {
  const { state, overview } = useStore();
  const [typeId, setTypeId] = useState<(typeof LEAVE_TYPES)[number]["id"]>("absence");
  const [days, setDays] = useState(3);
  const [selected, setSelected] = useState<string[]>([]);

  const leaveType = LEAVE_TYPES.find((t) => t.id === typeId)!;
  const affected = selected.length ? selected : overview.subjects.map((s) => s.subject.id);

  const results = useMemo(
    () =>
      overview.subjects
        .filter((s) => affected.includes(s.subject.id))
        .map((s) => {
          const perDay = s.remaining > 0 && overview.remaining > 0 ? s.remaining / Math.max(1, workingDaysLeft(overview.remaining)) : 0;
          const classesMissed = Math.min(s.remaining, Math.round(perDay * days) || (days > 0 && s.remaining > 0 ? 1 : 0));
          return { a: s, ...simulateMiss(s, classesMissed, leaveType.counted) };
        }),
    [overview, affected, days, leaveType.counted],
  );

  const totalMissed = results.reduce((n, r) => n + r.miss, 0);
  const newAttended = overview.attended + (leaveType.counted ? totalMissed : 0);
  const newConducted = overview.conducted + totalMissed;
  const overallAfter = percent(newAttended, newConducted);
  const stillRecoverable = targetFor(
    newAttended,
    newConducted,
    Math.max(0, overview.remaining - totalMissed),
    state.config.minRequired,
  ).possible;

  const verdict = !stillRecoverable
    ? { label: "NOT RECOMMENDED", tone: "critical" as const }
    : overallAfter < state.config.minRequired
      ? { label: "RISKY", tone: "warning" as const }
      : { label: "SAFE", tone: "safe" as const };

  return (
    <AppShell>
      <GlassCard>
        <h1 className="font-display text-xl font-semibold">OD / Medical leave simulator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          &ldquo;Can I afford this leave?&rdquo; — pick a type, a length and the subjects affected.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <fieldset>
            <legend className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Leave type
            </legend>
            <div className="mt-2 grid gap-2">
              {LEAVE_TYPES.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    typeId === t.id ? "border-primary/60 bg-glass-strong" : "border-glass-border bg-glass"
                  }`}
                >
                  <input
                    type="radio"
                    name="leave-type"
                    checked={typeId === t.id}
                    onChange={() => setTypeId(t.id)}
                    className="accent-[var(--primary)]"
                  />
                  <span className="flex-1">{t.label}</span>
                  <span className="text-[0.65rem] text-muted-foreground">{t.note}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <Label className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Days of leave — {days}
            </Label>
            <Slider
              className="mt-4"
              value={[days]}
              min={1}
              max={15}
              step={1}
              onValueChange={([v]) => setDays(v ?? 1)}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Estimated {totalMissed} periods missed across the selected subjects.
            </p>
          </div>

          <fieldset>
            <legend className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Affected subjects
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {overview.subjects.map((s) => {
                const on = selected.includes(s.subject.id);
                return (
                  <button
                    key={s.subject.id}
                    onClick={() =>
                      setSelected((prev) =>
                        on ? prev.filter((i) => i !== s.subject.id) : [...prev, s.subject.id],
                      )
                    }
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      on ? "border-primary/60 bg-primary/15 text-foreground" : "border-glass-border text-muted-foreground"
                    }`}
                  >
                    {s.subject.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[0.7rem] text-muted-foreground">
              None selected = all subjects affected.
            </p>
          </fieldset>
        </div>
      </GlassCard>

      <GlassCard
        className={verdict.tone === "critical" ? "border-critical/50" : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Verdict for {days} day{days > 1 ? "s" : ""} of {leaveType.label}
            </p>
            <h2 className="font-display text-2xl font-bold">{verdict.label}</h2>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div>
              <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">Before</p>
              <p className="font-display text-2xl font-bold">{overview.current.toFixed(1)}%</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">After</p>
              <p
                className="font-display text-2xl font-bold"
                style={{ color: overallAfter < state.config.minRequired ? "var(--critical)" : "var(--safe)" }}
              >
                {overallAfter.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {stillRecoverable
            ? `Recovery stays possible: you would need to attend ${
                targetFor(newAttended, newConducted, Math.max(0, overview.remaining - totalMissed), state.config.minRequired).required
              } of the ${Math.max(0, overview.remaining - totalMissed)} classes left afterwards.`
            : `After this leave, even perfect attendance cannot return you to ${state.config.minRequired}% by your planning date.`}
        </p>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((r) => (
          <GlassCard key={r.a.subject.id} tilt>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">{r.a.subject.name}</h3>
              <StatusPill status={statusOf(r.after, state.config.minRequired)}>
                {r.belowThreshold ? "BELOW LIMIT" : "OK"}
              </StatusPill>
            </div>
            <div className="mt-4 flex items-end gap-3">
              <span className="font-display text-xl">{r.before.toFixed(1)}%</span>
              <ArrowRight className="mb-1 h-4 w-4 text-muted-foreground" aria-hidden />
              <span
                className="font-display text-2xl font-bold"
                style={{ color: r.belowThreshold ? "var(--critical)" : "var(--safe)" }}
              >
                {r.after.toFixed(1)}%
              </span>
              <span className="mb-1 text-xs text-muted-foreground">
                {r.delta >= 0 ? "+" : ""}
                {r.delta.toFixed(1)} pts
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {r.miss} period{r.miss === 1 ? "" : "s"} missed ·{" "}
              {r.stillRecoverable ? "recovery still possible" : "recovery becomes impossible"}
            </p>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}

/** Rough conversion of remaining periods into remaining school days for per-day estimates. */
function workingDaysLeft(totalRemainingPeriods: number) {
  return Math.max(1, Math.round(totalRemainingPeriods / 5));
}
