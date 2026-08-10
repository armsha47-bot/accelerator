"use client";

import { useEffect, useState } from "react";

/**
 * Home layout preferences: section order + hidden sections. Persisted to
 * localStorage (source of truth for the client) so it works in demo and real
 * mode; the `home_preferences` table can sync this server-side later.
 */
export const HOME_SECTIONS = [
  { id: "week", label: "Week bubbles" },
  { id: "donut", label: "Completion ring" },
  { id: "xp", label: "XP progress" },
  { id: "plan", label: "Daily plan", locked: true }, // always visible
  { id: "habits", label: "Habits" },
  { id: "quests", label: "Weekly quests" },
  { id: "quote", label: "Motivational quote" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

const DEFAULT_ORDER: HomeSectionId[] = HOME_SECTIONS.map((s) => s.id);
const KEY = "accel_home_prefs";

export interface HomePrefs {
  order: HomeSectionId[];
  hidden: HomeSectionId[];
}

function load(): HomePrefs {
  if (typeof window === "undefined") return { order: DEFAULT_ORDER, hidden: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const saved: HomeSectionId[] = Array.isArray(raw.order) ? raw.order : [];
    // Merge with defaults so newly-added sections still appear.
    const order = [...saved.filter((id) => DEFAULT_ORDER.includes(id)), ...DEFAULT_ORDER.filter((id) => !saved.includes(id))];
    const hidden = (Array.isArray(raw.hidden) ? raw.hidden : []).filter((id: HomeSectionId) => id !== "plan");
    return { order, hidden };
  } catch {
    return { order: DEFAULT_ORDER, hidden: [] };
  }
}

export function useHomePrefs() {
  const [prefs, setPrefs] = useState<HomePrefs>({ order: DEFAULT_ORDER, hidden: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(load());
    setReady(true);
  }, []);

  function save(next: HomePrefs) {
    setPrefs(next);
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  }

  const setOrder = (order: HomeSectionId[]) => save({ ...prefs, order });
  const toggleHidden = (id: HomeSectionId) => {
    if (id === "plan") return;
    const hidden = prefs.hidden.includes(id) ? prefs.hidden.filter((x) => x !== id) : [...prefs.hidden, id];
    save({ ...prefs, hidden });
  };

  return { prefs, ready, setOrder, toggleHidden };
}
