import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, DetentionBanner } from "@/components/AppShell";
import { GlassCard, statusVar } from "@/components/glass";
import { useStore } from "@/lib/store";
import { percent } from "@/lib/attendance";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — The Core Calculator" },
      {
        name: "description",
        content:
          "Attendance by subject, attended vs missed breakdown and projection charts for different miss scenarios.",
      },
      { property: "og:title", content: "Attendance Analytics — The Core Calculator" },
      {
        property: "og:description",
        content: "Visualise where your attendance is heading before it gets there.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const tooltipStyle = {
  background: "oklch(0.2 0.05 268)",
  border: "1px solid var(--glass-border)",
  borderRadius: 14,
  color: "var(--foreground)",
  fontSize: 12,
};

function AnalyticsPage() {
  const { overview, state } = useStore();

  const bySubject = overview.subjects.map((s) => ({
    name: s.subject.name,
    percent: +s.current.toFixed(1),
    fill: statusVar[s.status],
  }));

  const donut = [
    { name: "Attended", value: overview.attended, fill: "var(--safe)" },
    { name: "Missed", value: Math.max(0, overview.conducted - overview.attended), fill: "var(--critical)" },
  ];

  const projection = useMemo(() => {
    const steps = 12;
    const scenarios = [0, 1, 3, 5];
    const rows: Array<Record<string, number>> = [];
    for (let i = 0; i <= steps; i++) {
      const done = Math.round((overview.remaining * i) / steps);
      const row: Record<string, number> = { step: done };
      for (const miss of scenarios) {
        const missedSoFar = Math.min(miss, done);
        row[`miss${miss}`] = +percent(
          overview.attended + (done - missedSoFar),
          overview.conducted + done,
        ).toFixed(2);
      }
      rows.push(row);
    }
    return rows;
  }, [overview]);

  const weakest = [...overview.subjects].sort((a, b) => a.current - b.current)[0];

  return (
    <AppShell>
      <DetentionBanner />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="font-display text-lg font-semibold">Attendance by subject</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {bySubject.map((b) => `${b.name} ${b.percent}%`).join(" · ")}
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySubject} layout="vertical" margin={{ left: 12, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="var(--glass-border)" />
                <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Attendance"]} />
                <Bar dataKey="percent" radius={[0, 8, 8, 0]} animationDuration={800}>
                  {bySubject.map((b) => (
                    <Cell key={b.name} fill={b.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="font-display text-lg font-semibold">Attendance health</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.attended} attended and {overview.conducted - overview.attended} missed out of{" "}
            {overview.conducted} classes conducted.
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                  animationDuration={800}
                >
                  {donut.map((d) => (
                    <Cell key={d.name} fill={d.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold">Projection</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          How your percentage moves across the {overview.remaining} classes remaining if you attend
          everything, or miss 1, 3 or 5 of them. Perfect attendance ends at{" "}
          {overview.maxPossible.toFixed(1)}%.
        </p>
        <div className="mt-4 h-80 w-full min-w-0 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%" minWidth={320}>
            <LineChart data={projection} margin={{ left: 4, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--glass-border)" />
              <XAxis
                dataKey="step"
                stroke="var(--muted-foreground)"
                fontSize={11}
                label={{ value: "Classes elapsed", position: "insideBottom", offset: -4, fontSize: 11 }}
              />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, ""]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="miss0" name="Attend all" stroke="var(--safe)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="miss1" name="Miss 1" stroke="var(--cyan)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="miss3" name="Miss 3" stroke="var(--caution)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="miss5" name="Miss 5" stroke="var(--critical)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {weakest && (
          <p className="mt-4 rounded-xl border border-glass-border bg-glass px-4 py-3 text-sm text-muted-foreground">
            Weakest subject: <span className="font-semibold text-foreground">{weakest.subject.name}</span>{" "}
            at {weakest.current.toFixed(1)}% — minimum required is {state.config.minRequired}%.
          </p>
        )}
      </GlassCard>
    </AppShell>
  );
}
