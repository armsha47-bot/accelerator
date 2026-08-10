"use client";

/**
 * Tiny localStorage-backed store for DEMO mode so state (checked tasks, logged
 * food, water, etc.) survives page navigation — in real mode Supabase does this.
 * Keys are namespaced under "demo:".
 */
export function demoGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem("demo:" + key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function demoSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("demo:" + key, JSON.stringify(value));
  } catch {
    /* quota / disabled — ignore */
  }
}
