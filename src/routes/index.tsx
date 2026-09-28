import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Gauge, LineChart, ShieldCheck } from "lucide-react";

import { Aurora, GlassCard, ProgressRing } from "@/components/glass";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Core Calculator — Attendance Planner for Students" },
      {
        name: "description",
        content:
          "Calculate your attendance, predict your percentage, simulate leave and know exactly how many classes you can miss before detention.",
      },
      { property: "og:title", content: "The Core Calculator — Attendance Planner" },
      {
        property: "og:description",
        content: "Know your attendance. Predict your future. Stay out of detention.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Gauge,
    title: "Exact maths, no guesswork",
    body: "Every number comes from your real attendance and a configurable timetable — never a placeholder.",
  },
  {
    icon: ShieldCheck,
    title: "Detention early-warning",
    body: "The moment recovery becomes mathematically impossible, you'll know — loudly.",
  },
  {
    icon: LineChart,
    title: "Leave & OD simulator",
    body: "See your percentage before and after a 3-day leave, subject by subject.",
  },
  {
    icon: Brain,
    title: "Attendance Advisor",
    body: "Ask in plain English: 'Can I reach 90%?' and get an answer built on your own data.",
  },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora />

      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-24 text-center md:pt-32">
        <span className="animate-rise rounded-full border border-glass-border bg-glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Attendance intelligence
        </span>

        <h1
          className="animate-rise mt-7 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl md:text-7xl"
          style={{ animationDelay: "60ms" }}
        >
          <span className="text-gradient animate-shimmer">THE CORE CALCULATOR</span>
        </h1>

        <p
          className="animate-rise mt-5 max-w-2xl text-base text-muted-foreground md:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          Know your attendance. Predict your future. Stay out of detention.
        </p>

        <div
          className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_40px_-8px_var(--primary)] transition-transform hover:scale-[1.03]"
            style={{ background: "var(--gradient-hero)" }}
          >
            ENTER DASHBOARD
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-glass-border bg-glass px-7 py-3 text-sm font-semibold transition-colors hover:border-primary/50"
          >
            HOW IT WORKS
          </a>
        </div>

        <div className="animate-rise mt-16" style={{ animationDelay: "240ms" }}>
          <ProgressRing value={78.4} status="caution" size={230} label="Sample projection" sublabel="CAUTION" />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 pb-28">
        <h2 className="font-display text-2xl font-bold md:text-3xl">How it works</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Enter your classes attended and conducted, set a planning date, and the engine counts the
          exact periods left from your weekly timetable — then tells you what you must attend.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <GlassCard key={f.title} tilt>
              <f.icon className="h-6 w-6 text-primary" aria-hidden />
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </GlassCard>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Your attendance data stays on your device unless you explicitly choose to share it.
        </p>
      </section>
    </div>
  );
}
