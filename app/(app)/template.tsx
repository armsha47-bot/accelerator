"use client";

import { motion } from "framer-motion";

/**
 * App-group page transition. A `template.tsx` re-mounts on every navigation, so
 * this fade-and-slide plays each time the route changes.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
