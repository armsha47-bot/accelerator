import type { Config } from "tailwindcss";

/**
 * Accelerator design system — dark, premium, rounded, fluid.
 * Colors and radii mirror the brand spec exactly.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Monochrome-first. Color only carries functional meaning.
        bg: "#080808", // near-black
        surface: "#111111", // cards
        elevated: "#1A1A1A", // elevated surface
        primary: "#6366F1", // indigo — the ONE primary CTA per screen
        green: "#22C55E", // completed, streaks, all-done
        gold: "#F59E0B", // XP, leaderboard, level-up
        red: "#EF4444", // alerts, injuries, overdue
        macroFat: "#EF4444",
        ink: "#F0F0F0", // primary text
        muted: "#888888", // secondary text
        border: "#2A2A2A",
        // macro colors
        macroProtein: "#60A5FA",
        macroCarbs: "#F59E0B",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(0,0,0,0.6)",
        glow: "0 0 24px rgba(255,255,255,0.28)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 6px currentColor)" },
          "50%": { filter: "drop-shadow(0 0 16px currentColor)" },
        },
        "rise-fade": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-40px)" },
        },
        "scale-bounce": {
          "0%": { transform: "scale(0.6)" },
          "60%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-in-top": {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spin4: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "rise-fade": "rise-fade 0.9s ease-out forwards",
        "scale-bounce": "scale-bounce 0.35s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-in-top": "slide-in-top 0.3s ease-out",
        "spin-slow": "spin4 4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
