"use client";

/**
 * Generates a shareable achievement image on a canvas (dark bg, crest glyph,
 * achievement text, app name) and shares it via the Web Share API, falling back
 * to a download. No network — everything is drawn client-side.
 */
export async function shareAchievement({
  title,
  subtitle,
  level,
}: {
  title: string;
  subtitle: string;
  level?: number;
}) {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#13131A");
  grad.addColorStop(1, "#0A0A0F");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Glow ring
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 - 60, 200, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(99,102,241,0.5)";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Level number as the crest stand-in (canvas can't easily rasterize the SVG)
  ctx.fillStyle = "#6366F1";
  ctx.font = "bold 200px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(level ? String(level) : "★", size / 2, size / 2 - 60);

  ctx.fillStyle = "#F8F8FF";
  ctx.font = "bold 72px Inter, sans-serif";
  ctx.fillText(title, size / 2, size / 2 + 220);

  ctx.fillStyle = "#9CA3AF";
  ctx.font = "40px Inter, sans-serif";
  ctx.fillText(subtitle, size / 2, size / 2 + 300);

  ctx.fillStyle = "#F59E0B";
  ctx.font = "bold 44px Inter, sans-serif";
  ctx.fillText("ACCELERATOR", size / 2, size - 80);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;
  const file = new File([blob], "accelerator-achievement.png", { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Accelerator" });
      return;
    } catch {
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "accelerator-achievement.png";
  a.click();
  URL.revokeObjectURL(url);
}
