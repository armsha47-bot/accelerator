"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import LevelCrest from "./LevelCrest";
import { CREST_NAMES } from "@/lib/level-utils";
import { shareAchievement } from "@/lib/share";

export default function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  useEffect(() => {
    const end = Date.now() + 900;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#FFFFFF", "#F59E0B", "#22C55E"] });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#FFFFFF", "#F59E0B", "#22C55E"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/85 p-6" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.2, 1], opacity: 1 }}
        transition={{ duration: 0.5, times: [0, 0.7, 1], type: "spring", stiffness: 300, damping: 20 }}
        className="w-full max-w-xs rounded-3xl border border-border bg-surface p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-gold glow-text">Level up</p>
        <div className="my-4 flex justify-center">
          <LevelCrest level={level} size={130} animate />
        </div>
        <h2 className="text-2xl font-bold glow-text">Level {level}</h2>
        <p className="text-muted">{CREST_NAMES[level - 1]} Crest unlocked</p>
        <div className="mt-6 space-y-2">
          <button className="btn-ghost w-full" onClick={() => shareAchievement({ title: `Level ${level}`, subtitle: `${CREST_NAMES[level - 1]} Crest`, level })}>
            Share achievement
          </button>
          <button className="btn-primary w-full" onClick={onClose}>
            Keep going
          </button>
        </div>
      </motion.div>
    </div>
  );
}
