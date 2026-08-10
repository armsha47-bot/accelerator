"use client";

import { useEffect } from "react";
import { BADGE_BY_KEY } from "@/lib/badges";

export default function BadgeUnlockToast({ badgeKey, onDone }: { badgeKey: string; onDone: () => void }) {
  const badge = BADGE_BY_KEY[badgeKey];
  useEffect(() => {
    const id = setTimeout(onDone, 3500);
    return () => clearTimeout(id);
  }, [onDone]);
  if (!badge) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[58] flex justify-center px-4">
      <div className="animate-slide-in-top flex items-center gap-3 rounded-2xl border border-gold/40 bg-surface px-5 py-3 shadow-soft">
        <span className="grid h-10 w-10 animate-scale-bounce place-items-center rounded-full bg-elevated text-2xl shadow-glow">
          {badge.emoji}
        </span>
        <div>
          <p className="text-xs text-muted">Badge unlocked</p>
          <p className="font-semibold">{badge.label}</p>
        </div>
      </div>
    </div>
  );
}
