"use client";

/**
 * Dependency-free SVG charts: BarChart, LineChart, Heatmap. Rounded tops on bars,
 * smooth curves on lines — matching the app's soft aesthetic.
 */

export function BarChart({
  data,
  height = 140,
  color = "#F0F0F0",
  labels,
  barColor,
}: {
  data: number[];
  height?: number;
  color?: string;
  labels?: string[];
  barColor?: (v: number, i: number) => string;
}) {
  const max = Math.max(1, ...data);
  const w = 100 / (data.length || 1);
  return (
    <svg viewBox={`0 0 100 ${height / 2}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      {data.map((v, i) => {
        const h = (v / max) * (height / 2 - 8);
        const x = i * w + w * 0.2;
        const bw = w * 0.6;
        return (
          <rect
            key={i}
            x={x}
            y={height / 2 - h}
            width={bw}
            height={h}
            rx={Math.min(bw / 2, 2)}
            fill={barColor ? barColor(v, i) : color}
          />
        );
      })}
    </svg>
  );
}

export function LineChart({ data, height = 140, color = "#F0F0F0" }: { data: number[]; height?: number; color?: string }) {
  if (data.length < 2) return <div className="text-sm text-muted">Not enough data yet.</div>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - 8 - ((v - min) / range) * (height - 16);
    return [x, y] as const;
  });
  // Smooth-ish path via quadratic midpoints.
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[i - 1];
    const mx = (px + x) / 2;
    d += ` Q ${px} ${py} ${mx} ${(py + y) / 2}`;
  }
  d += ` T ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill={color} />
      ))}
    </svg>
  );
}

export function Heatmap({ days, color = "#22C55E" }: { days: { date: string; value: number }[]; color?: string }) {
  // value 0..1 → opacity. Grid of weeks.
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1">
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${Math.round(d.value * 100)}%`}
          className="h-3.5 w-3.5 rounded-[3px]"
          style={{ background: d.value > 0 ? color : "#2A2A3A", opacity: d.value > 0 ? 0.3 + d.value * 0.7 : 1 }}
        />
      ))}
    </div>
  );
}
