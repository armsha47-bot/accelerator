"use client";

import { motion } from "framer-motion";

/**
 * A short radial particle burst (used when a day bubble turns green). Render it
 * absolutely-positioned over the element; it removes itself after the animation
 * via the parent's AnimatePresence / timeout.
 */
export default function ParticleBurst({ color = "#22C55E", count = 6, size = 4 }: { color?: string; count?: number; size?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dx = Math.cos(angle) * 22;
        const dy = Math.sin(angle) * 22;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ position: "absolute", width: size, height: size, borderRadius: 999, background: color, boxShadow: `0 0 6px ${color}` }}
          />
        );
      })}
    </div>
  );
}
