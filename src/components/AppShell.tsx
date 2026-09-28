import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarDays, Menu } from "lucide-react";
import { useState } from "react";

import { Advisor } from "@/components/Advisor";
import { Aurora } from "@/components/glass";
import { useStore } from "@/lib/store";
import { formatLong, toISO } from "@/lib/attendance";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/attendance", label: "Attendance" },
  { to: "/simulator", label: "Simulator" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
] as const;

export function DetentionBanner() {
  const { overview, state } = useStore();
  if (!overview.detention && overview.deadline.recoverable && overview.detentionSubjects.length === 0)
    return null;

  const deadlineBlocked = !overview.deadline.recoverable;

  return (
    <div
      role="alert"
      className="animate-pulse-danger relative overflow-hidden rounded-2xl border border-critical/50 bg-critical/10 p-5 md:p-7"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
        <AlertTriangle className="h-10 w-10 shrink-0 text-critical" aria-hidden />
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-critical md:text-4xl">
            IRREVERSIBLE DETENTION
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-foreground/85">
            Even perfect attendance from this point forward cannot bring
            {overview.detention ? " your overall attendance" : " you"} back above the required{" "}
            {state.config.minRequired}% before the selected deadline.
          </p>
          {deadlineBlocked && (
            <p className="mt-1 text-sm font-semibold text-critical">
              Recovery before {formatLong(overview.deadline.date)} is mathematically impossible.
            </p>
          )}
          {overview.detentionSubjects.length > 0 && (
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              Affected subjects:{" "}
              {overview.detentionSubjects.map((s) => s.subject.name).join(" · ")}
            </p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            {[
              ["Current", `${overview.current.toFixed(1)}%`],
              ["Max possible", `${overview.deadline.maxPossible.toFixed(1)}%`],
              ["Required", `${state.config.minRequired}%`],
              ["Gap", `${overview.deadline.gap.toFixed(1)} pts`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-glass-border bg-glass px-3 py-2">
                <dt className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{k}</dt>
                <dd className="font-display text-lg font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, setState, today } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const setPlanning = (value: string) =>
    setState((prev) => ({ ...prev, config: { ...prev.config, planningDate: value } }));

  return (
    <div className="relative min-h-screen">
      <Aurora />

      <header className="sticky top-0 z-40 border-b border-glass-border bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="font-display text-sm font-bold uppercase tracking-[0.2em]">
            <span className="text-gradient">The Core Calculator</span>
          </Link>

          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "bg-glass-strong text-foreground" }}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <span className="hidden rounded-full border border-glass-border bg-glass px-3 py-1.5 text-xs text-muted-foreground md:inline">
              TODAY — {formatLong(toISO(today))}
            </span>
            <label className="flex items-center gap-2 rounded-full border border-glass-border bg-glass px-3 py-1.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="sr-only">Planning date</span>
              <input
                type="date"
                value={state.config.planningDate}
                min={toISO(today)}
                onChange={(e) => setPlanning(e.target.value)}
                className="bg-transparent text-xs outline-none [color-scheme:dark]"
              />
            </label>
            <button
              className="lg:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav aria-label="Mobile" className="grid gap-1 border-t border-glass-border px-4 py-3 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                activeProps={{ className: "bg-glass-strong text-foreground" }}
                className="rounded-xl px-3 py-2 text-sm text-muted-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6">
        <p className="mb-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {state.className} · Section {state.section}
        </p>
        <main className={cn("space-y-6")}>{children}</main>
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Your attendance data stays on your device unless you explicitly choose to share it.
        </footer>
      </div>

      <Advisor />
    </div>
  );
}
