import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  type AppState,
  type Overview,
  type Subject,
  buildOverview,
  toISO,
} from "./attendance";

const STORAGE_KEY = "core-calculator-state-v1";

function defaultState(): AppState {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
  const nov = new Date(today.getFullYear() + (today.getMonth() > 10 ? 1 : 0), 10, 30);
  const planning = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());

  const subjects: Subject[] = [
    { id: "physics", name: "Physics", attended: 41, conducted: 50 },
    { id: "mathematics", name: "Mathematics", attended: 44, conducted: 52 },
    { id: "chemistry", name: "Chemistry", attended: 36, conducted: 48 },
    { id: "english", name: "English", attended: 30, conducted: 34 },
    { id: "computer-science", name: "Computer Science", attended: 28, conducted: 40 },
  ];

  const timetable = {
    "1": { physics: 1, chemistry: 2, mathematics: 1 },
    "2": { mathematics: 2, physics: 1, english: 1 },
    "3": { chemistry: 1, "computer-science": 2, mathematics: 1 },
    "4": { physics: 2, english: 1, "computer-science": 1 },
    "5": { mathematics: 1, chemistry: 1, physics: 1, english: 1 },
  };

  return {
    className: "Class 12",
    section: "A",
    subjects,
    timetable,
    config: {
      semesterStart: toISO(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      semesterEnd: toISO(end),
      deadlineDate: toISO(nov),
      planningDate: toISO(planning > end ? end : planning),
      workingDays: [1, 2, 3, 4, 5],
      holidays: [],
      minRequired: 75,
      customTarget: 85,
    },
  };
}

type Ctx = {
  state: AppState;
  today: Date;
  overview: Overview;
  hydrated: boolean;
  setState: (updater: (prev: AppState) => AppState) => void;
  reset: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setRaw] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        if (parsed?.subjects && parsed?.config) setRaw(parsed);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setToday(new Date());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state, hydrated]);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setRaw((prev) => updater(prev));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRaw(defaultState());
  }, []);

  const overview = useMemo(() => buildOverview(state, today), [state, today]);

  return (
    <StoreContext.Provider value={{ state, today, overview, hydrated, setState, reset }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
