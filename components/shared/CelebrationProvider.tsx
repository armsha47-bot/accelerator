"use client";

import { useEffect, useState } from "react";
import LevelUpModal from "./LevelUpModal";
import BadgeUnlockToast from "./BadgeUnlockToast";

/**
 * Global celebration layer. Listens for the "accelerator:celebrate" window event
 * (dispatched by useXP after an /api/award-xp response) and shows a level-up
 * modal + a queue of badge-unlock toasts. Mounted once in the app layout.
 */
export interface CelebrateDetail {
  leveledUp?: boolean;
  level?: number;
  newBadges?: string[];
}

export function dispatchCelebrate(detail: CelebrateDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("accelerator:celebrate", { detail }));
}

export default function CelebrationProvider() {
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<string[]>([]);

  useEffect(() => {
    function onCelebrate(e: Event) {
      const detail = (e as CustomEvent<CelebrateDetail>).detail;
      if (detail.leveledUp && detail.level) setLevelUp(detail.level);
      if (detail.newBadges?.length) setBadgeQueue((q) => [...q, ...detail.newBadges!]);
    }
    window.addEventListener("accelerator:celebrate", onCelebrate);
    return () => window.removeEventListener("accelerator:celebrate", onCelebrate);
  }, []);

  return (
    <>
      {levelUp && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
      {badgeQueue[0] && (
        <BadgeUnlockToast badgeKey={badgeQueue[0]} onDone={() => setBadgeQueue((q) => q.slice(1))} />
      )}
    </>
  );
}
