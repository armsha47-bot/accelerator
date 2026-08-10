"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/**
 * First-launch tooltip tour. Spotlights a sequence of elements (by CSS selector)
 * with a dimmed backdrop + a tooltip card. Shown once — a localStorage flag gates
 * it. If a target isn't found, that step centers with no spotlight.
 */
export interface TourStep {
  selector: string;
  title: string;
  body: string;
}

const FLAG = "accel_tour_done";

export default function TutorialTour({ steps }: { steps: TourStep[] }) {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Give the page a beat to render its targets, then start if not seen.
    if (typeof window === "undefined") return;
    if (localStorage.getItem(FLAG)) return;
    const t = setTimeout(() => setActive(true), 700);
    return () => clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      const el = document.querySelector(steps[i]?.selector);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // Measure after the scroll settles.
        setTimeout(() => setRect(el.getBoundingClientRect()), 250);
      } else {
        setRect(null);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, i, steps]);

  if (!active || steps.length === 0) return null;

  const finish = () => {
    localStorage.setItem(FLAG, "1");
    setActive(false);
  };
  const next = () => (i + 1 < steps.length ? setI(i + 1) : finish());

  const step = steps[i];
  const pad = 8;
  const hole = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Place the tooltip below the target if there's room, else above / centered.
  const belowRoom = rect ? window.innerHeight - rect.bottom > 200 : true;
  const tipTop = rect ? (belowRoom ? rect.bottom + 16 : rect.top - 16) : window.innerHeight / 2;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Spotlight: a transparent hole punched with a giant box-shadow. */}
      {hole ? (
        <div
          className="absolute rounded-2xl transition-all duration-300"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/78" />
      )}

      {/* Tooltip card */}
      <div
        className="absolute left-1/2 w-[min(88vw,340px)] -translate-x-1/2 rounded-3xl border border-border bg-surface p-5 shadow-soft"
        style={{ top: tipTop, transform: `translate(-50%, ${rect && !belowRoom ? "-100%" : "0"})` }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="pill bg-white/10 text-ink">{i + 1}/{steps.length}</span>
          <h3 className="font-bold">{step.title}</h3>
        </div>
        <p className="text-sm text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-sm text-muted">Skip</button>
          <button onClick={next} className="btn-primary px-6 py-2">
            {i + 1 < steps.length ? "Next →" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
