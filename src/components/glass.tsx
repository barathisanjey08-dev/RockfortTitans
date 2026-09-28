import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { Status } from "@/lib/attendance";

export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-backdrop opacity-60" />
      <div className="animate-float absolute -left-40 top-[-10%] h-[38rem] w-[38rem] rounded-full bg-primary/25 blur-[120px]" />
      <div
        className="animate-float absolute right-[-15%] top-[20%] h-[34rem] w-[34rem] rounded-full bg-accent/25 blur-[130px]"
        style={{ animationDelay: "-5s" }}
      />
      <div
        className="animate-float absolute bottom-[-20%] left-[25%] h-[30rem] w-[30rem] rounded-full bg-violet/20 blur-[140px]"
        style={{ animationDelay: "-9s" }}
      />
    </div>
  );
}

export function GlassCard({
  className,
  tilt = false,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { tilt?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt || !ref.current || window.matchMedia("(pointer: coarse)").matches) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-4px)`;
    ref.current.style.setProperty("--glare-x", `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty("--glare-y", `${(y + 0.5) * 100}%`);
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        "glass glass-hover relative overflow-hidden p-5 md:p-6",
        tilt && "will-change-transform",
        className,
      )}
      {...rest}
    >
      {tilt && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
          style={{
            background:
              "radial-gradient(400px circle at var(--glare-x,50%) var(--glare-y,50%), oklch(1 0 0 / 8%), transparent 60%)",
          }}
        />
      )}
      {children}
    </div>
  );
}

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const duration = 700;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (value - from) * eased;
      setShown(next);
      fromRef.current = next;
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      {Number.isFinite(shown) ? shown.toFixed(decimals) : "0"}
      {suffix}
    </span>
  );
}

const statusColor: Record<Status, string> = {
  safe: "var(--safe)",
  caution: "var(--caution)",
  warning: "var(--warn)",
  critical: "var(--critical)",
};

export function ProgressRing({
  value,
  status,
  size = 200,
  stroke = 14,
  label,
  sublabel,
}: {
  value: number;
  status: Status;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const [progress, setProgress] = useState(0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    const id = requestAnimationFrame(() => setProgress(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={statusColor[status]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (progress / 100) * c}
          style={{
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease",
            filter: `drop-shadow(0 0 10px ${statusColor[status]})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-4xl font-bold md:text-5xl">
          <AnimatedNumber value={value} decimals={1} suffix="%" />
        </span>
        {label && (
          <span className="mt-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
            {label}
          </span>
        )}
        {sublabel && (
          <span
            className="mt-2 rounded-full px-3 py-0.5 text-xs font-semibold"
            style={{
              color: statusColor[status],
              background: `color-mix(in oklab, ${statusColor[status]} 16%, transparent)`,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ status, children }: { status: Status; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        color: statusColor[status],
        background: `color-mix(in oklab, ${statusColor[status]} 15%, transparent)`,
        border: `1px solid color-mix(in oklab, ${statusColor[status]} 35%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: statusColor[status] }}
        aria-hidden
      />
      {children}
    </span>
  );
}

export const statusVar = statusColor;
