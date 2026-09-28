import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Target, TrendingUp, Users } from "lucide-react";

import { AppShell, DetentionBanner } from "@/components/AppShell";
import { AnimatedNumber, GlassCard, ProgressRing, StatusPill } from "@/components/glass";
import { useStore } from "@/lib/store";
import { STATUS_LABEL, formatLong, type TargetResult } from "@/lib/attendance";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — The Core Calculator" },
      {
        name: "description",
        content:
          "Live attendance health, classes remaining, safe misses and recovery status for every subject.",
      },
      { property: "og:title", content: "Attendance Dashboard — The Core Calculator" },
      {
        property: "og:description",
        content: "See your attendance health and recovery status in five seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function TargetCard({
  title, subtitle, result, current, remaining,
}: {
  title: string;
  subtitle: string;
  result: TargetResult;
  current: number;
  remaining: number;
}) {
  return (
    <GlassCard tilt>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-xl font-bold">{result.target}%</h3>
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Current" value={`${current.toFixed(1)}%`} />
        {result.possible ? (
          <>
            <Row label="Must attend" value={`${result.required} / ${remaining}`} />
            <Row label="Can miss" value={`${result.safeMisses}`} />
            <Row
              label="Projected"
              value={`${(result.projectedAtRequired ?? 0).toFixed(1)}%`}
            />
          </>
        ) : (
          <p className="rounded-xl border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
            Not reachable by your planning date — the best you can finish on is{" "}
            {result.projectedIfPerfect.toFixed(1)}%.
          </p>
        )}
      </dl>
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-display font-semibold">{value}</dd>
    </div>
  );
}

function DashboardPage() {
  const { overview, state } = useStore();

  const message = overview.detention
    ? "Perfect attendance from this point cannot recover your percentage before the deadline."
    : overview.current >= 90
      ? "90% club. Keep it steady."
      : overview.minTarget.safeMisses > 2
        ? `You've got room for ${overview.minTarget.safeMisses} more misses.`
        : overview.current >= state.config.minRequired
          ? "Careful. Your margin is shrinking."
          : "Attendance is recoverable — but every class counts now.";

  return (
    <AppShell>
      <DetentionBanner />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          icon={<TrendingUp className="h-4 w-4" />}
          label="Current attendance"
          value={<AnimatedNumber value={overview.current} decimals={1} suffix="%" />}
        />
        <Summary
          icon={<CalendarClock className="h-4 w-4" />}
          label="Classes remaining"
          value={<AnimatedNumber value={overview.remaining} />}
          hint={`until ${formatLong(state.config.planningDate)}`}
        />
        <Summary
          icon={<Target className="h-4 w-4" />}
          label="Safe misses"
          value={<AnimatedNumber value={overview.minTarget.possible ? overview.minTarget.safeMisses : 0} />}
          hint={`at ${state.config.minRequired}% minimum`}
        />
        <Summary
          icon={<Users className="h-4 w-4" />}
          label="Recovery status"
          value={
            <span className={overview.detention ? "text-critical" : "text-safe"}>
              {overview.detention ? "UNRECOVERABLE" : "RECOVERABLE"}
            </span>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <GlassCard className="flex flex-col items-center justify-center gap-3">
          <ProgressRing
            value={overview.current}
            status={overview.status}
            size={230}
            label="Overall attendance"
            sublabel={STATUS_LABEL[overview.status]}
          />
          <p className="max-w-[16rem] text-center text-sm text-muted-foreground">{message}</p>
        </GlassCard>

        <div className="grid gap-4 md:grid-cols-3">
          <TargetCard
            title="Minimum safe zone"
            subtitle="The threshold you must not drop below."
            result={overview.minTarget}
            current={overview.current}
            remaining={overview.remaining}
          />
          <TargetCard
            title="Excellent"
            subtitle="Scholarship-grade attendance."
            result={overview.target90}
            current={overview.current}
            remaining={overview.remaining}
          />
          <TargetCard
            title="Custom target"
            subtitle="Change it in Settings."
            result={overview.customTarget}
            current={overview.current}
            remaining={overview.remaining}
          />
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Subjects</h2>
          <Link to="/attendance" className="text-xs text-primary hover:underline">
            Edit attendance
          </Link>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {overview.subjects.map((s) => (
            <li
              key={s.subject.id}
              className="flex items-center gap-4 rounded-2xl border border-glass-border bg-glass px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{s.subject.name}</p>
                  <StatusPill status={s.status}>{STATUS_LABEL[s.status]}</StatusPill>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-glass-strong">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${Math.min(100, s.current)}%`,
                      background: "var(--gradient-hero)",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {s.current.toFixed(1)}% · {s.subject.attended}/{s.subject.conducted} attended ·{" "}
                  {s.remaining} left ·{" "}
                  {s.minTarget.possible
                    ? `attend ${s.minTarget.required}, miss up to ${s.minTarget.safeMisses}`
                    : "cannot reach the minimum"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </GlassCard>
    </AppShell>
  );
}

function Summary({
  icon, label, value, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <GlassCard tilt className="p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[0.65rem] uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </GlassCard>
  );
}
