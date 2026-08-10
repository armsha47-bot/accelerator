/**
 * POST /api/confidence  { mode: 'affirmation'|'hype', context?: string }
 * Generates a daily affirmation or a personalized hype speech.
 */
import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase-server";
import { anthropic, MODELS, textOf } from "@/lib/anthropic";

export async function POST(req: Request) {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { mode, context } = (await req.json().catch(() => ({}))) as {
    mode?: "affirmation" | "hype";
    context?: string;
  };

  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("name, goals").eq("id", user.id).single();
  const name = profile?.name ?? "Armaan";
  const goals = (profile?.goals ?? []).join(", ");

  const prompt =
    mode === "hype"
      ? `Write a 150-200 word personalized pump-up speech for ${name}, a 15-year-old soccer player (winger/CAM) focused on ${goals}. ${context ? `He is about to: ${context}.` : ""} Direct, specific, no fluff — like a great coach right before the biggest game. Second person ("you"). No preamble, just the speech.`
      : `Write ONE powerful daily affirmation (1-2 sentences) for ${name}, personalized to his goals (${goals}). First person ("I"). No preamble, no quotes around it.`;

  try {
    const msg = await anthropic().messages.create({
      model: MODELS.fast,
      max_tokens: mode === "hype" ? 400 : 120,
      messages: [{ role: "user", content: prompt }],
    });
    return NextResponse.json({ text: textOf(msg) });
  } catch {
    return NextResponse.json(
      { text: mode === "hype" ? "You've done the work. Trust it. Go take what's yours." : "I show up, I do the work, and I get better every single day." },
      { status: 200 }
    );
  }
}
