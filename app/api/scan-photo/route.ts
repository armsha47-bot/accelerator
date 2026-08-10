/**
 * POST /api/scan-photo  { image: base64DataUrl, kind: 'physique'|'posture'|'outfit'|'food' }
 * Sends the image to Claude vision and returns structured JSON. For physique
 * scans it also persists a physique_logs row (score + analysis).
 */
import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase-server";
import { anthropic, MODELS, textOf, parseJson } from "@/lib/anthropic";
import { todayISO } from "@/lib/xp-utils";

type Kind = "physique" | "posture" | "outfit" | "food";

const PROMPTS: Record<Kind, string> = {
  physique:
    'Analyze visible muscle development and body composition supportively (this is a 15-year-old athlete). Return ONLY JSON: {"score": <1-10>, "summary": "one sentence", "tips": ["tip1","tip2","tip3"]}.',
  posture:
    'Analyze this side-profile posture: head position, shoulder alignment, spine curvature, hip tilt. Return ONLY JSON: {"score": <1-10>, "summary": "one sentence", "tips": ["correction1","correction2","correction3"]}.',
  outfit:
    'Rate this outfit on style, fit, and color coordination. Return ONLY JSON: {"score": <1-10>, "summary": "one sentence", "tips": ["feedback1","feedback2","feedback3"]}.',
  food:
    'Identify every food item visible and estimate macros for the whole plate. Return ONLY JSON: {"items":[{"food_name":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"portion":"1 serving"}]}.',
};

export async function POST(req: Request) {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { image, kind } = (await req.json().catch(() => ({}))) as { image?: string; kind?: Kind };
  if (!image || !kind || !PROMPTS[kind]) {
    return NextResponse.json({ error: "image and valid kind required" }, { status: 400 });
  }

  // Split "data:image/jpeg;base64,AAAA" into media type + data.
  const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return NextResponse.json({ error: "image must be a base64 data URL" }, { status: 400 });
  const [, mediaType, data] = match;

  let result: any;
  try {
    const msg = await anthropic().messages.create({
      model: MODELS.quality,
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as any, data } },
            { type: "text", text: PROMPTS[kind] },
          ],
        },
      ],
    });
    result = parseJson<any>(textOf(msg));
  } catch (e) {
    return NextResponse.json({ error: "analysis failed" }, { status: 502 });
  }

  if (kind === "physique") {
    const admin = adminClient();
    await admin.from("physique_logs").insert({
      user_id: user.id,
      date: todayISO(),
      scan_type: "physique",
      score: result.score ?? null,
      analysis: `${result.summary ?? ""}\n\n${(result.tips ?? []).map((t: string) => `• ${t}`).join("\n")}`,
    });
  }

  return NextResponse.json({ result });
}
