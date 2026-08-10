/**
 * The Accelerator brand mark — a glowing white infinity on a black rounded tile.
 * Mirrors the PWA app icon. Use anywhere the logo appears (login, onboarding).
 */
export default function InfinityMark({ size = 64, tile = true }: { size?: number; tile?: boolean }) {
  const glyph = (
    <svg
      width={tile ? size * 0.68 : size}
      height={tile ? size * 0.68 : size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F8F8FF"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: "drop-shadow(0 0 5px rgba(248,248,255,0.85))" }}
    >
      <path d="M9.83 9.17a4 4 0 1 0 0 5.66a10 10 0 0 0 2.17 -2.83a10 10 0 0 1 2.17 -2.83a4 4 0 1 1 0 5.66a10 10 0 0 1 -2.17 -2.83a10 10 0 0 0 -2.17 -2.83" />
    </svg>
  );
  if (!tile) return glyph;
  return (
    <span
      className="grid place-items-center rounded-3xl bg-bg"
      style={{ width: size, height: size, boxShadow: "0 0 24px rgba(248,248,255,0.12)" }}
    >
      {glyph}
    </span>
  );
}
