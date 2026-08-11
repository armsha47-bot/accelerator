"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/train", label: "Train", icon: DumbbellIcon },
  { href: "/nutrition", label: "Nutrition", icon: AppleIcon },
  { href: "/leaderboard", label: "Ranks", icon: TrophyIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3">
      <div
        className="flex items-center justify-around rounded-t-3xl border border-border bg-surface/90 px-2 pt-2 shadow-soft backdrop-blur-lg"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-medium transition-all",
                active ? "text-ink glow-text" : "text-muted active:scale-95"
              )}
            >
              <span className={active ? "glow-svg" : undefined}>
                <Icon active={active} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { active?: boolean };
const stroke = (a?: boolean) => (a ? "#F0F0F0" : "#888888");

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}
function DumbbellIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7v10M4 9v6M18 7v10M20 9v6M6 12h12" />
    </svg>
  );
}
function AppleIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7c-1.5-2-5-2-6.5 0S4 15 8 19c1.5 1.5 3 .5 4-0 1 .5 2.5 1.5 4 0 4-4 4.5-9 2.5-12S13.5 5 12 7Z" />
      <path d="M12 7c0-2 1-3 2.5-3.5" />
    </svg>
  );
}
function TrophyIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 15h4M9 20h6M12 15v5" />
    </svg>
  );
}
function UserIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
