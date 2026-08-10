"use client";

/**
 * LevelCrest — 20 highly-detailed heraldic rank crests (Recruit → Apex). Each is
 * a layered SVG: aura, rotating rune ring, wings, an ornate double-bordered
 * shield with engraved filigree + corner rivets, a faceted center gem with an
 * animated sparkle, a crown, and a banner — scaling in richness with rank. A
 * diagonal light "shimmer" sweeps the shield. Animations pause off-screen.
 */
import { useEffect, useRef, useState } from "react";
import { CREST_NAMES } from "@/lib/level-utils";

interface Props {
  level: number;
  size?: number;
  className?: string;
  animate?: boolean;
}

interface Gem {
  facets: number;
  from: string;
  to: string;
  glow: string;
  glowPx: number;
}

interface Spec {
  fill: string; // gradient key
  border: string;
  metal: string; // border metal gradient key
  gem?: Gem;
  wings?: "none" | "small" | "full";
  crown?: number;
  bolts?: boolean;
  swords?: boolean;
  radiant?: boolean; // rotating rune ring
  filigree: string;
  banner?: boolean;
  pulse?: boolean;
  rings: number; // concentric medallion rings
  sparkles: number; // sparkle points on the gem
}

const SHIELD = "M50 5 L91 18 Q94 19 94 24 L94 60 Q94 92 52 116 Q50 117 48 116 Q6 92 6 60 L6 24 Q6 19 9 18 Z";

const SHIELD_FILL: Record<string, [string, string, string]> = {
  recruit: ["#C3C7CF", "#8A8F99", "#5A5F68"],
  initiate: ["#E4E4E4", "#B0B0B0", "#7C7C7C"],
  copper: ["#D08a4e", "#B87333", "#6E4420"],
  iron: ["#8A97A3", "#5C6874", "#333B44"],
  jade: ["#2FA06B", "#1C7A50", "#0C3D28"],
  obsidian: ["#2A2440", "#171226", "#070510"],
  sapphire: ["#4A74D6", "#2C4EA8", "#152A66"],
  steel: ["#A6B6C4", "#6E8090", "#3C4A57"],
  amethyst: ["#8B5CD6", "#5F2F9E", "#2E1150"],
  ruby: ["#C93B4A", "#93202E", "#4A0F16"],
  emerald: ["#2FB574", "#14814F", "#063D28"],
  onyx: ["#2C2C3A", "#1A1A24", "#0A0A10"],
  topaz: ["#E4B23C", "#B8801E", "#5A3B0E"],
  aqua: ["#43C4D8", "#2494AC", "#0E4C5A"],
  diamond: ["#7FA7E8", "#3E5FA0", "#182a52"],
  void: ["#3A1D62", "#1E0E38", "#08010F"],
  celestial: ["#2C4C8F", "#152C66", "#000018"],
  inferno: ["#E0521E", "#A0300F", "#4A0F0F"],
  sovereign: ["#C9A227", "#8A6A12", "#2E2408"],
  apex: ["#F4F6FF", "#AFB8DA", "#3A3E58"],
};

const METAL: Record<string, [string, string, string]> = {
  steel: ["#EDEDED", "#9AA3AD", "#4C535B"],
  gold: ["#FFE7A0", "#F0B429", "#8A5A0F"],
  dark: ["#5A5A6E", "#2C2C3A", "#101018"],
  bronze: ["#F0C08A", "#B87333", "#6E4420"],
};

const GEMS: Record<string, [string, string]> = {
  copper: ["#F0B57A", "#7A4D24"], iron: ["#BFD0DE", "#3A4A55"], jade: ["#4AFF9E", "#065A34"],
  obsidian: ["#8A4CE0", "#0A0016"], sapphire: ["#8FC0FF", "#1E3A8A"], steel: ["#E2ECF6", "#475569"],
  amethyst: ["#D6A6FF", "#4A177A"], ruby: ["#FF9A9A", "#7F1D1D"], emerald: ["#6BF0B0", "#064E3B"],
  onyx: ["#E8E8F0", "#0A0A0F"], topaz: ["#FFE07A", "#8A5A0E"], aqua: ["#9BF0FF", "#0E7490"],
  diamond: ["#EAF0FF", "#7FA0E0"], void: ["#B080FF", "#12002A"], celestial: ["#8FB4FF", "#000022"],
  inferno: ["#FFC48A", "#7F1D1D"], sovereign: ["#FFF0B0", "#8A5A0E"], apex: ["#FFFFFF", "#C7D2FE"],
};

function gem(name: string, facets: number, glow: string, glowPx: number): Gem {
  return { facets, from: GEMS[name][0], to: GEMS[name][1], glow, glowPx };
}

// prettier-ignore
const SPECS: Spec[] = [
  { fill: "recruit", metal: "steel", border: "#5A5F68", filigree: "#D8DCE2", wings: "none", rings: 1, sparkles: 0 }, // 1
  { fill: "initiate", metal: "steel", border: "#7C7C7C", filigree: "#EDEDED", wings: "none", rings: 1, sparkles: 0 }, // 2
  { fill: "copper", metal: "bronze", border: "#6E4420", filigree: "#F0C08A", gem: gem("copper", 6, "#B87333", 5), rings: 1, sparkles: 1 }, // 3
  { fill: "iron", metal: "steel", border: "#333B44", filigree: "#B7C2CD", gem: gem("iron", 8, "#9FB0C0", 6), rings: 2, sparkles: 1 }, // 4
  { fill: "jade", metal: "steel", border: "#0C3D28", filigree: "#5FE0A0", gem: gem("jade", 8, "#22C55E", 9), rings: 2, sparkles: 2, pulse: true }, // 5
  { fill: "obsidian", metal: "dark", border: "#2A1A44", filigree: "#9A6BE0", gem: gem("obsidian", 10, "#7C3AED", 9), rings: 2, sparkles: 2, pulse: true }, // 6
  { fill: "sapphire", metal: "gold", border: "#152A66", filigree: "#F0B429", gem: gem("sapphire", 12, "#3B82F6", 11), rings: 3, sparkles: 3, pulse: true }, // 7
  { fill: "steel", metal: "steel", border: "#3C4A57", filigree: "#E2ECF6", gem: gem("steel", 12, "#94A3B8", 11), swords: true, rings: 3, sparkles: 3, pulse: true }, // 8
  { fill: "amethyst", metal: "gold", border: "#2E1150", filigree: "#F0B429", gem: gem("amethyst", 14, "#A855F7", 13), wings: "small", rings: 3, sparkles: 4, pulse: true }, // 9
  { fill: "ruby", metal: "gold", border: "#4A0F16", filigree: "#F0B429", gem: gem("ruby", 16, "#EF4444", 15), bolts: true, rings: 3, sparkles: 4, pulse: true }, // 10
  { fill: "emerald", metal: "gold", border: "#063D28", filigree: "#34D399", gem: gem("emerald", 16, "#10B981", 15), wings: "small", rings: 3, sparkles: 4, pulse: true }, // 11
  { fill: "onyx", metal: "steel", border: "#0A0A10", filigree: "#E8E8F0", gem: gem("onyx", 18, "#FFFFFF", 13), rings: 4, sparkles: 5, pulse: true }, // 12
  { fill: "topaz", metal: "gold", border: "#5A3B0E", filigree: "#F0B429", gem: gem("topaz", 18, "#F59E0B", 15), crown: 3, rings: 4, sparkles: 5, pulse: true }, // 13
  { fill: "aqua", metal: "steel", border: "#0E4C5A", filigree: "#67E8F9", gem: gem("aqua", 18, "#06B6D4", 15), crown: 5, wings: "small", rings: 4, sparkles: 5, pulse: true }, // 14
  { fill: "diamond", metal: "steel", border: "#182a52", filigree: "#EAF0FF", gem: gem("diamond", 20, "#FFFFFF", 18), crown: 5, rings: 4, sparkles: 6, pulse: true }, // 15
  { fill: "void", metal: "gold", border: "#7C3AED", filigree: "#B080FF", gem: gem("void", 20, "#7C3AED", 16), wings: "small", rings: 5, sparkles: 6, pulse: true }, // 16
  { fill: "celestial", metal: "gold", border: "#3B82F6", filigree: "#8FB4FF", gem: gem("celestial", 22, "#3B82F6", 16), wings: "full", radiant: true, rings: 5, sparkles: 7, pulse: true }, // 17
  { fill: "inferno", metal: "gold", border: "#4A0F0F", filigree: "#F97316", gem: gem("inferno", 22, "#F97316", 20), wings: "full", crown: 7, bolts: true, rings: 5, sparkles: 7, pulse: true }, // 18
  { fill: "sovereign", metal: "gold", border: "#2E2408", filigree: "#F0B429", gem: gem("sovereign", 24, "#F59E0B", 22), wings: "full", crown: 9, banner: true, radiant: true, rings: 6, sparkles: 8, pulse: true }, // 19
  { fill: "apex", metal: "gold", border: "#FFFFFF", filigree: "#FFFFFF", gem: gem("apex", 28, "#FFFFFF", 24), wings: "full", crown: 9, banner: true, radiant: true, bolts: true, rings: 6, sparkles: 10, pulse: true }, // 20
];

function Facets({ g, cx, cy, r }: { g: Gem; cx: number; cy: number; r: number }) {
  const n = Math.max(4, g.facets);
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    outer.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
    inner.push(`${(cx + Math.cos(a) * r * 0.55).toFixed(1)},${(cy + Math.sin(a) * r * 0.55).toFixed(1)}`);
  }
  const gid = `g${cx}${cy}${g.from.replace("#", "")}`;
  return (
    <g>
      <defs>
        <radialGradient id={gid} cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="22%" stopColor={g.from} />
          <stop offset="70%" stopColor={g.from} />
          <stop offset="100%" stopColor={g.to} />
        </radialGradient>
      </defs>
      <polygon points={outer.join(" ")} fill={`url(#${gid})`} stroke={g.to} strokeWidth="0.7" />
      {/* facet lines from center */}
      {outer.map((p, i) => (
        <line key={"o" + i} x1={cx} y1={cy} x2={p.split(",")[0]} y2={p.split(",")[1]} stroke={g.to} strokeWidth="0.3" opacity="0.45" />
      ))}
      {/* inner ring facets */}
      <polygon points={inner.join(" ")} fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
      {/* light-catch highlight */}
      <polygon points={`${cx - r * 0.32},${cy - r * 0.32} ${cx - r * 0.02},${cy - r * 0.5} ${cx + r * 0.12},${cy - r * 0.12}`} fill="#ffffff" opacity="0.9" />
    </g>
  );
}

function Sparkle({ x, y, s, delay, anim }: { x: number; y: number; s: number; delay: number; anim: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className={anim ? "crest-sparkle" : undefined} style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}>
      <path d={`M0 ${-s} L${s * 0.28} 0 L0 ${s} L${-s * 0.28} 0 Z`} fill="#ffffff" />
      <path d={`M${-s} 0 L0 ${s * 0.28} L${s} 0 L0 ${-s * 0.28} Z`} fill="#ffffff" />
    </g>
  );
}

function Wings({ color, full, anim }: { color: string; full: boolean; anim: boolean }) {
  const feather = (mx: number) => (
    <g fill={color} opacity="0.92">
      {[0, 1, 2, 3, 4].map((k) => (
        <path
          key={k}
          d={`M${mx} ${32 + k * 7} q ${mx < 50 ? -26 : 26} ${2 + k * 2} ${mx < 50 ? -42 - k * 4 : 42 + k * 4} ${16 + k * 4} q ${mx < 50 ? 18 : -18} ${-6 - k} ${mx < 50 ? 34 : -34} ${-9 - k * 2} Z`}
        />
      ))}
    </g>
  );
  const body = !full ? (
    <g fill={color} opacity="0.85">
      <path d="M8 36 Q-18 42 -22 66 Q-2 58 10 60 Z" />
      <path d="M92 36 Q118 42 122 66 Q102 58 90 60 Z" />
    </g>
  ) : (
    <>
      {feather(8)}
      {feather(92)}
    </>
  );
  return (
    <g className={anim ? "crest-flap" : undefined} style={{ transformOrigin: "50px 42px" }}>
      {body}
    </g>
  );
}

function Laurels({ color }: { color: string }) {
  const branch = (mx: number, dir: number) => (
    <g stroke={color} strokeWidth="2.4" fill="none" opacity="0.85" strokeLinecap="round">
      <path d={`M${mx} 104 Q${mx + dir * 8} 78 ${mx + dir * 4} 44`} />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const y = 96 - k * 10;
        const x = mx + dir * (8 - k * 0.7);
        return <path key={k} d={`M${x} ${y} q ${dir * 9} ${-2} ${dir * 11} ${-9}`} fill={color} stroke="none" opacity="0.85" />;
      })}
    </g>
  );
  return (
    <g>
      {branch(14, -1)}
      {branch(86, 1)}
    </g>
  );
}

function Beams({ color, anim }: { color: string; anim: boolean }) {
  return (
    <g className={anim ? "crest-spin-slow2" : undefined} style={{ transformOrigin: "50px 58px", opacity: 0.35 }}>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const x1 = 50 + Math.cos(a) * 40;
        const y1 = 58 + Math.sin(a) * 40;
        const x2 = 50 + Math.cos(a) * 96;
        const y2 = 58 + Math.sin(a) * 96;
        const px = 50 + Math.cos(a + 0.06) * 40;
        const py = 58 + Math.sin(a + 0.06) * 40;
        return <path key={i} d={`M${x1} ${y1} L${x2} ${y2} L${px} ${py} Z`} fill={color} />;
      })}
    </g>
  );
}

function Halo({ color, anim }: { color: string; anim: boolean }) {
  return (
    <g className={anim ? "crest-bob" : undefined}>
      <g className={anim ? "crest-spin" : undefined} style={{ transformOrigin: "50px -14px" }}>
        <circle cx="50" cy="-14" r="16" fill="none" stroke={color} strokeWidth="2" opacity="0.8" style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <circle key={i} cx={50 + Math.cos(a) * 16} cy={-14 + Math.sin(a) * 16} r="1.4" fill="#fff" />;
        })}
      </g>
    </g>
  );
}

function Orbits({ n, color, anim }: { n: number; color: string; anim: boolean }) {
  return (
    <g className={anim ? "crest-spin" : undefined} style={{ transformOrigin: "50px 58px" }}>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const x = 50 + Math.cos(a) * 84;
        const y = 58 + Math.sin(a) * 84;
        const s = 2.2;
        return (
          <path key={i} d={`M${x} ${y - s} L${x + s * 0.3} ${y} L${x} ${y + s} L${x - s * 0.3} ${y} Z M${x - s} ${y} L${x} ${y + s * 0.3} L${x + s} ${y} L${x} ${y - s * 0.3} Z`} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        );
      })}
    </g>
  );
}

function Shards({ n, color, anim }: { n: number; color: string; anim: boolean }) {
  return (
    <g className={anim ? "crest-orbit-rev" : undefined} style={{ transformOrigin: "50px 58px" }}>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + 0.4;
        const x = 50 + Math.cos(a) * 70;
        const y = 58 + Math.sin(a) * 70;
        return <path key={i} d={`M${x} ${y - 4} L${x + 2.6} ${y} L${x} ${y + 4} L${x - 2.6} ${y} Z`} fill={color} opacity="0.9" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
      })}
    </g>
  );
}

function Pedestal({ metal, glow }: { metal: string; glow: string }) {
  return (
    <g>
      <ellipse cx="50" cy="132" rx="34" ry="6" fill={glow} opacity="0.25" />
      <path d="M28 124 L72 124 L78 132 L22 132 Z" fill={metal} />
      <path d="M22 132 L78 132 L82 140 L18 140 Z" fill={metal} opacity="0.85" />
    </g>
  );
}

function Crown({ points, color }: { points: number; color: string }) {
  const n = Math.max(3, points);
  const w = 60;
  const x0 = 50 - w / 2;
  return (
    <g transform="translate(0,2)">
      <path d={`M${x0} 6 L${x0 + w} 6 L${x0 + w} 1 L${x0} 1 Z`} fill={color} />
      {Array.from({ length: n }).map((_, i) => {
        const x = x0 + (i / (n - 1)) * w;
        const h = i === Math.floor(n / 2) ? 16 : 10;
        return (
          <g key={i}>
            <polygon points={`${x - 3.5},6 ${x},${6 - h} ${x + 3.5},6`} fill={color} />
            <circle cx={x} cy={6 - h} r="1.6" fill="#fff" opacity="0.9" />
          </g>
        );
      })}
    </g>
  );
}

export default function LevelCrest({ level, size = 96, className, animate = false }: Props) {
  const lvl = Math.max(1, Math.min(20, level));
  const s = SPECS[lvl - 1];
  const title = `${CREST_NAMES[lvl - 1]} Crest — Level ${lvl}`;
  const [f1, f2, f3] = SHIELD_FILL[s.fill];
  const [m1, m2, m3] = METAL[s.metal];

  const ref = useRef<SVGSVGElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const A = animate || onScreen;

  const uid = `c${lvl}`;
  const gemR = lvl >= 12 ? 15 : 13;

  // External ornaments escalate with rank — they spill OUTSIDE the shield.
  const dec = {
    orbit: lvl >= 12 ? Math.min(10, lvl - 8) : 0,
    laurels: lvl >= 13,
    beams: lvl >= 15,
    halo: lvl >= 16,
    shards: lvl >= 17 ? Math.min(6, lvl - 14) : 0,
    pedestal: lvl >= 18,
  };

  // Sparkle positions ringed around the gem.
  const sparkles = Array.from({ length: s.sparkles }).map((_, i) => {
    const a = (i / Math.max(1, s.sparkles)) * Math.PI * 2 + 0.5;
    const rr = gemR + 6 + (i % 2) * 4;
    return { x: 50 + Math.cos(a) * rr, y: 58 + Math.sin(a) * rr, s: 2 + (i % 3), delay: (i * 0.3) % 1.5 };
  });

  return (
    <svg
      ref={ref}
      width={size}
      height={size * 1.16}
      viewBox="-52 -46 204 202"
      className={`${className ?? ""} ${A ? "crest-float" : ""}`}
      style={{ overflow: "visible" }}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={f1} />
          <stop offset="45%" stopColor={f2} />
          <stop offset="100%" stopColor={f3} />
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={m1} />
          <stop offset="45%" stopColor={m2} />
          <stop offset="100%" stopColor={m3} />
        </linearGradient>
        <radialGradient id={`${uid}-aura`} cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor={s.gem?.glow ?? s.filigree} stopOpacity="0.5" />
          <stop offset="100%" stopColor={s.gem?.glow ?? s.filigree} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <path d={SHIELD} />
        </clipPath>
      </defs>

      {/* ── External ornaments (outside the shield), farthest first ── */}
      {dec.beams && <Beams color={s.gem?.glow ?? s.filigree} anim={A} />}
      {dec.orbit > 0 && <Orbits n={dec.orbit} color={s.filigree} anim={A} />}
      {dec.shards > 0 && <Shards n={dec.shards} color={s.gem?.glow ?? s.filigree} anim={A} />}

      {/* Aura */}
      <ellipse cx="50" cy="58" rx="66" ry="70" fill={`url(#${uid}-aura)`} className={A && s.pulse ? "crest-gem-pulse" : undefined} />

      {/* Rotating rune ring (high tiers) */}
      {s.radiant && (
        <g className={A ? "crest-spin" : undefined} style={{ transformOrigin: "50px 58px" }}>
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const x = 50 + Math.cos(a) * 74;
            const y = 58 + Math.sin(a) * 74;
            return <rect key={i} x={x - 1} y={y - 3} width="2" height="6" rx="1" fill={s.filigree} opacity="0.6" transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />;
          })}
        </g>
      )}

      {dec.halo && <Halo color={s.filigree} anim={A} />}
      {dec.laurels && <Laurels color={s.filigree} />}

      {/* the whole crest breathes */}
      <g className={A ? "crest-breathe" : undefined} style={{ transformOrigin: "50px 60px", filter: `drop-shadow(0 0 ${s.gem?.glowPx ?? 6}px ${s.gem?.glow ?? s.border})` }}>
        {dec.pedestal && <Pedestal metal={`url(#${uid}-metal)`} glow={s.gem?.glow ?? s.filigree} />}
        {s.wings && s.wings !== "none" && <Wings color={s.filigree} full={s.wings === "full"} anim={A} />}
        {s.crown && (
          <g className={A ? "crest-bob" : undefined}>
            <Crown points={s.crown} color={s.filigree} />
          </g>
        )}

        {/* crossed swords / bolts behind */}
        {s.swords && (
          <g stroke="#B7C2CD" strokeWidth="3" strokeLinecap="round" opacity="0.7">
            <line x1="18" y1="22" x2="82" y2="98" />
            <line x1="82" y1="22" x2="18" y2="98" />
          </g>
        )}
        {s.bolts && (
          <g fill={s.filigree} opacity="0.85" className={A ? "crest-sparkle" : undefined} style={{ transformOrigin: "50px 60px" }}>
            <path d="M16 16 L34 54 L24 54 L40 98 L26 60 L36 60 Z" transform="rotate(-13 50 60)" />
            <path d="M84 16 L66 54 L76 54 L60 98 L74 60 L64 60 Z" transform="rotate(13 50 60)" />
          </g>
        )}

        {/* Shield: outer metal frame → inner plate */}
        <path d={SHIELD} fill={`url(#${uid}-metal)`} transform="scale(1.08)" style={{ transformOrigin: "50px 60px" }} />
        <path d={SHIELD} fill={`url(#${uid}-fill)`} stroke={m2} strokeWidth="1.5" />
        {/* inner border line */}
        <path d={SHIELD} fill="none" stroke={s.filigree} strokeWidth="1" opacity="0.5" transform="scale(0.9)" style={{ transformOrigin: "50px 60px" }} />
        {lvl >= 10 && <path d={SHIELD} fill="none" stroke={s.filigree} strokeWidth="0.6" opacity="0.35" transform="scale(0.8)" style={{ transformOrigin: "50px 60px" }} />}

        {/* Engraved filigree on the face */}
        <g stroke={s.filigree} strokeWidth="0.7" fill="none" opacity="0.4" clipPath={`url(#${uid}-clip)`}>
          <path d="M28 26 Q50 38 72 26" />
          <path d="M24 40 Q50 30 76 40" />
          <path d="M30 88 Q50 78 70 88" />
          {lvl >= 7 && <path d="M20 58 Q50 66 80 58" />}
        </g>

        {/* Corner rivets */}
        {[[16, 24], [84, 24], [50, 108]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.4" fill={m1} stroke={m3} strokeWidth="0.6" />
        ))}

        {/* Shimmer sweep clipped to the shield */}
        {A && (
          <g clipPath={`url(#${uid}-clip)`}>
            <rect className="crest-shimmer" x="-40" y="0" width="34" height="120" fill={`url(#${uid}-shine)`} transform="rotate(18 50 60)" />
          </g>
        )}

        {/* Center medallion: concentric rings + gem */}
        {Array.from({ length: s.rings }).map((_, i) => (
          <circle key={i} cx="50" cy="58" r={gemR + 4 + i * 3.2} fill="none" stroke={s.filigree} strokeWidth={i === 0 ? 1.4 : 0.7} opacity={0.6 - i * 0.08} />
        ))}
        {s.gem ? (
          <g className={A && s.pulse ? "crest-gem-pulse" : undefined} style={{ transformOrigin: "50px 58px" }}>
            <Facets g={s.gem} cx={50} cy={58} r={gemR} />
          </g>
        ) : (
          <circle cx="50" cy="58" r="6" fill="none" stroke={s.filigree} strokeWidth="1.4" opacity="0.8" />
        )}

        {/* Sparkles */}
        {sparkles.map((sp, i) => (
          <Sparkle key={i} x={sp.x} y={sp.y} s={sp.s} delay={sp.delay} anim={A} />
        ))}

        {/* Banner */}
        {s.banner && (
          <g>
            <path d="M20 104 Q50 116 80 104 L86 116 L80 130 Q50 120 20 130 L14 116 Z" fill={s.filigree} opacity="0.92" />
            <path d="M20 104 Q50 116 80 104 L80 108 Q50 120 20 108 Z" fill="#000" opacity="0.2" />
          </g>
        )}
      </g>
    </svg>
  );
}
