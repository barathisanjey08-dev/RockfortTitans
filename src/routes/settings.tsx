import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/glass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Academic Settings — The Core Calculator" },
      {
        name: "description",
        content:
          "Configure your class, semester dates, recovery deadline, working days, holidays and weekly timetable.",
      },
      { property: "og:title", content: "Academic Settings — The Core Calculator" },
      {
        property: "og:description",
        content: "Set the timetable and deadlines that drive every calculation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CLASSES = ["Class 10", "Class 11", "Class 12", "Other"];
const SECTIONS = ["A", "B", "C", "D"];

function SettingsPage() {
  const { state, setState, reset } = useStore();
  const [holiday, setHoliday] = useState("");

  const cfg = (patch: Partial<typeof state.config>) =>
    setState((prev) => ({ ...prev, config: { ...prev.config, ...patch } }));

  const setPeriods = (day: number, subjectId: string, raw: string) => {
    const value = Math.max(0, Math.min(10, Math.floor(Number(raw) || 0)));
    setState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [String(day)]: { ...(prev.timetable[String(day)] ?? {}), [subjectId]: value },
      },
    }));
  };

  return (
    <AppShell>
      <GlassCard>
        <h1 className="font-display text-xl font-semibold">Class &amp; section</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Class</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CLASSES.map((c) => (
                <button
                  key={c}
                  onClick={() => setState((p) => ({ ...p, className: c }))}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    state.className === c
                      ? "border-primary/60 bg-primary/15"
                      : "border-glass-border text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Label htmlFor="custom-class" className="mt-3 block text-xs text-muted-foreground">
              Custom class name
            </Label>
            <Input
              id="custom-class"
              value={state.className}
              onChange={(e) => setState((p) => ({ ...p, className: e.target.value }))}
              className="mt-1 h-9 max-w-xs bg-glass"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Section</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setState((p) => ({ ...p, section: s }))}
                  className={`h-9 w-9 rounded-full border text-sm transition-colors ${
                    state.section === s
                      ? "border-primary/60 bg-primary/15"
                      : "border-glass-border text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Label htmlFor="custom-section" className="mt-3 block text-xs text-muted-foreground">
              Custom section
            </Label>
            <Input
              id="custom-section"
              value={state.section}
              onChange={(e) => setState((p) => ({ ...p, section: e.target.value }))}
              className="mt-1 h-9 max-w-[8rem] bg-glass"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold">Academic calendar</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DateField id="sem-start" label="Semester start" value={state.config.semesterStart} onChange={(v) => cfg({ semesterStart: v })} />
          <DateField id="sem-end" label="Semester end" value={state.config.semesterEnd} onChange={(v) => cfg({ semesterEnd: v })} />
          <DateField id="deadline" label="Recovery deadline" value={state.config.deadlineDate} onChange={(v) => cfg({ deadlineDate: v })} />
          <DateField id="planning" label="Plan until" value={state.config.planningDate} onChange={(v) => cfg({ planningDate: v })} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Working days
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((d, i) => {
                const on = state.config.workingDays.includes(i);
                return (
                  <button
                    key={d}
                    aria-pressed={on}
                    onClick={() =>
                      cfg({
                        workingDays: on
                          ? state.config.workingDays.filter((x) => x !== i)
                          : [...state.config.workingDays, i].sort(),
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      on ? "border-primary/60 bg-primary/15" : "border-glass-border text-muted-foreground"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="holiday" className="text-xs uppercase tracking-widest text-muted-foreground">
              Holidays
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="holiday"
                type="date"
                value={holiday}
                onChange={(e) => setHoliday(e.target.value)}
                className="h-9 max-w-[12rem] bg-glass [color-scheme:dark]"
              />
              <Button
                className="h-9"
                onClick={() => {
                  if (!holiday) return;
                  if (state.config.holidays.includes(holiday)) return;
                  cfg({ holidays: [...state.config.holidays, holiday].sort() });
                  setHoliday("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.config.holidays.map((h) => (
                <button
                  key={h}
                  onClick={() => cfg({ holidays: state.config.holidays.filter((x) => x !== h) })}
                  className="rounded-full border border-glass-border px-3 py-1 text-xs text-muted-foreground hover:text-critical"
                >
                  {h} ✕
                </button>
              ))}
              {state.config.holidays.length === 0 && (
                <p className="text-xs text-muted-foreground">No holidays added.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:max-w-md">
          <NumberField
            id="min-required"
            label="Minimum required %"
            value={state.config.minRequired}
            onChange={(v) => cfg({ minRequired: clamp(v) })}
          />
          <NumberField
            id="custom-target"
            label="Custom target %"
            value={state.config.customTarget}
            onChange={(v) => cfg({ customTarget: clamp(v) })}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold">Weekly timetable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Periods per subject per day. These counts decide how many classes remain before your
          planning date — not raw calendar days.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                <th className="px-3">Day</th>
                {state.subjects.map((s) => (
                  <th key={s.id} className="px-3">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d, i) => (
                <tr key={d} className={state.config.workingDays.includes(i) ? "" : "opacity-40"}>
                  <td className="rounded-l-xl border-y border-l border-glass-border bg-glass px-3 py-2 font-medium">
                    {d}
                  </td>
                  {state.subjects.map((s, idx) => (
                    <td
                      key={s.id}
                      className={`border-y border-glass-border bg-glass px-3 py-2 ${
                        idx === state.subjects.length - 1 ? "rounded-r-xl border-r" : ""
                      }`}
                    >
                      <label className="sr-only" htmlFor={`tt-${i}-${s.id}`}>
                        {s.name} periods on {d}
                      </label>
                      <Input
                        id={`tt-${i}-${s.id}`}
                        type="number"
                        min={0}
                        max={10}
                        value={String(state.timetable[String(i)]?.[s.id] ?? 0)}
                        onChange={(e) => setPeriods(i, s.id, e.target.value)}
                        className="h-8 w-16 bg-transparent"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="border-critical/40">
        <h2 className="font-display text-lg font-semibold">Reset data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Clears everything stored on this device and restores the sample setup.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4">
              Reset data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all attendance data?</AlertDialogTitle>
              <AlertDialogDescription>
                Your subjects, timetable and dates will be replaced with the defaults. This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  reset();
                  toast.success("Data reset.");
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </GlassCard>
    </AppShell>
  );
}

const clamp = (v: number) => Math.max(1, Math.min(100, v));

function DateField({
  id, label, value, onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 bg-glass [color-scheme:dark]"
      />
    </div>
  );
}

function NumberField({
  id, label, value, onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={100}
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 h-9 bg-glass"
      />
    </div>
  );
}
