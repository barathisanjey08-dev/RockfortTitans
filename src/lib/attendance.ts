/**
 * Attendance mathematics engine — all numbers in the app come from here.
 */

export type Subject = {
  id: string;
  name: string;
  attended: number;
  conducted: number;
};

export type Timetable = Record<string, Record<string, number>>; // weekday index "0".."6" -> subjectId -> periods

export type AcademicConfig = {
  semesterStart: string; // ISO yyyy-mm-dd
  semesterEnd: string;
  deadlineDate: string; // "November" recovery deadline
  planningDate: string;
  workingDays: number[]; // 0=Sun .. 6=Sat
  holidays: string[]; // ISO dates
  minRequired: number; // e.g. 75
  customTarget: number; // e.g. 85
};

export type AppState = {
  className: string;
  section: string;
  subjects: Subject[];
  timetable: Timetable;
  config: AcademicConfig;
};

export type Status = "safe" | "caution" | "warning" | "critical";

export const STATUS_LABEL: Record<Status, string> = {
  safe: "SAFE",
  caution: "CAUTION",
  warning: "WARNING",
  critical: "CRITICAL",
};

export const toISO = (d: Date) => {
  const c = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return c.toISOString().slice(0, 10);
};

export const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const formatLong = (s: string) =>
  parseISO(s).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function percent(attended: number, conducted: number): number {
  if (conducted <= 0) return 0;
  return (attended / conducted) * 100;
}

export function statusOf(pct: number, minRequired: number): Status {
  if (pct >= 90) return "safe";
  if (pct >= minRequired) return "caution";
  if (pct >= minRequired - 10) return "warning";
  return "critical";
}

/** Count remaining periods per subject between `from` (exclusive) and `to` (inclusive). */
export function remainingClasses(
  timetable: Timetable,
  config: AcademicConfig,
  from: Date,
  toDate: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  const end = parseISO(toDate);
  const holidays = new Set(config.holidays);
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  cursor.setDate(cursor.getDate() + 1);
  let guard = 0;
  while (cursor <= end && guard < 1000) {
    guard++;
    const iso = toISO(cursor);
    if (config.workingDays.includes(cursor.getDay()) && !holidays.has(iso)) {
      const day = timetable[String(cursor.getDay())] ?? {};
      for (const [sid, periods] of Object.entries(day)) {
        out[sid] = (out[sid] ?? 0) + (Number(periods) || 0);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export type TargetResult = {
  target: number;
  /** minimum future classes that must be attended; null when impossible */
  required: number | null;
  possible: boolean;
  safeMisses: number;
  projectedIfPerfect: number;
  /** projected % if exactly `required` classes are attended */
  projectedAtRequired: number | null;
};

export function targetFor(
  attended: number,
  conducted: number,
  remaining: number,
  targetPct: number,
): TargetResult {
  const t = targetPct / 100;
  const total = conducted + remaining;
  const projectedIfPerfect = total > 0 ? ((attended + remaining) / total) * 100 : 0;

  if (total <= 0) {
    return {
      target: targetPct,
      required: null,
      possible: false,
      safeMisses: 0,
      projectedIfPerfect: 0,
      projectedAtRequired: null,
    };
  }

  const rawNeeded = Math.ceil(t * total - attended - 1e-9);
  const required = Math.max(0, rawNeeded);
  const possible = required <= remaining;

  return {
    target: targetPct,
    required: possible ? required : null,
    possible,
    safeMisses: possible ? remaining - required : 0,
    projectedIfPerfect,
    projectedAtRequired: possible ? ((attended + required) / total) * 100 : null,
  };
}

export type SubjectAnalysis = {
  subject: Subject;
  missed: number;
  current: number;
  status: Status;
  remaining: number;
  maxPossible: number;
  minTarget: TargetResult;
  target90: TargetResult;
  customTarget: TargetResult;
  detention: boolean;
};

export function analyseSubject(
  subject: Subject,
  remaining: number,
  config: AcademicConfig,
): SubjectAnalysis {
  const conducted = Math.max(0, Math.floor(subject.conducted));
  const attended = Math.min(conducted, Math.max(0, Math.floor(subject.attended)));
  const current = percent(attended, conducted);
  const total = conducted + remaining;
  const maxPossible = total > 0 ? ((attended + remaining) / total) * 100 : current;
  const minTarget = targetFor(attended, conducted, remaining, config.minRequired);

  return {
    subject: { ...subject, attended, conducted },
    missed: conducted - attended,
    current,
    status: statusOf(current, config.minRequired),
    remaining,
    maxPossible,
    minTarget,
    target90: targetFor(attended, conducted, remaining, 90),
    customTarget: targetFor(attended, conducted, remaining, config.customTarget),
    detention: conducted > 0 && !minTarget.possible,
  };
}

export type Overview = {
  subjects: SubjectAnalysis[];
  attended: number;
  conducted: number;
  remaining: number;
  current: number;
  maxPossible: number;
  status: Status;
  minTarget: TargetResult;
  target90: TargetResult;
  customTarget: TargetResult;
  detention: boolean;
  detentionSubjects: SubjectAnalysis[];
  /** recovery check against the configured deadline (e.g. November) */
  deadline: {
    date: string;
    remaining: number;
    maxPossible: number;
    required: number;
    gap: number;
    recoverable: boolean;
  };
};

export function buildOverview(state: AppState, today: Date): Overview {
  const { config, timetable, subjects } = state;
  const remainingMap = remainingClasses(timetable, config, today, config.planningDate);
  const analyses = subjects.map((s) => analyseSubject(s, remainingMap[s.id] ?? 0, config));

  const attended = analyses.reduce((n, a) => n + a.subject.attended, 0);
  const conducted = analyses.reduce((n, a) => n + a.subject.conducted, 0);
  const remaining = analyses.reduce((n, a) => n + a.remaining, 0);
  const current = percent(attended, conducted);
  const total = conducted + remaining;
  const maxPossible = total > 0 ? ((attended + remaining) / total) * 100 : current;
  const minTarget = targetFor(attended, conducted, remaining, config.minRequired);

  const deadlineMap = remainingClasses(timetable, config, today, config.deadlineDate);
  const deadlineRemaining = subjects.reduce((n, s) => n + (deadlineMap[s.id] ?? 0), 0);
  const deadlineTotal = conducted + deadlineRemaining;
  const deadlineMax =
    deadlineTotal > 0 ? ((attended + deadlineRemaining) / deadlineTotal) * 100 : current;

  return {
    subjects: analyses,
    attended,
    conducted,
    remaining,
    current,
    maxPossible,
    status: statusOf(current, config.minRequired),
    minTarget,
    target90: targetFor(attended, conducted, remaining, 90),
    customTarget: targetFor(attended, conducted, remaining, config.customTarget),
    detention: conducted > 0 && !minTarget.possible,
    detentionSubjects: analyses.filter((a) => a.detention),
    deadline: {
      date: config.deadlineDate,
      remaining: deadlineRemaining,
      maxPossible: deadlineMax,
      required: config.minRequired,
      gap: Math.max(0, config.minRequired - deadlineMax),
      recoverable: conducted === 0 || deadlineMax >= config.minRequired - 1e-9,
    },
  };
}

/** Effect of missing `missCount` future classes of a subject. */
export function simulateMiss(a: SubjectAnalysis, missCount: number, treatAsPresent: boolean) {
  const miss = Math.max(0, Math.min(missCount, a.remaining));
  const conducted = a.subject.conducted + (treatAsPresent ? miss : miss);
  const attended = a.subject.attended + (treatAsPresent ? miss : 0);
  const after = percent(attended, conducted);
  return {
    miss,
    before: a.current,
    after,
    delta: after - a.current,
    belowThreshold: after < a.minTarget.target,
    // can they still recover using the classes left after the leave?
    stillRecoverable: targetFor(attended, conducted, Math.max(0, a.remaining - miss), a.minTarget.target)
      .possible,
  };
}
