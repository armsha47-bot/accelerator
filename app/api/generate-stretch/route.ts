/**
 * POST /api/generate-stretch
 * Builds a personalized stretch routine from the user's most recent workout's
 * exercises. Returns [{name, duration_seconds, instructions, target_muscle}].
 */
import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase-server";
import { aiJson, MODELS } from "@/lib/ai";

export async function POST() {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: lastWorkout } = await admin
    .from("workouts")
    .select("id")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let exercises: string[] = [];
  if (lastWorkout) {
    const { data: ex } = await admin
      .from("workout_exercises")
      .select("exercise_name")
      .eq("workout_id", lastWorkout.id);
    exercises = (ex ?? []).map((e) => e.exercise_name);
  }

  const prompt = `Create a targeted post-workout stretch routine for these exercises: ${
    exercises.join(", ") || "a full-body soccer session"
  }. Return ONLY a JSON array of 6-8 stretches: [{"name":"","duration_seconds":30,"instructions":"","target_muscle":""}].`;

  try {
    const stretches = await aiJson<any[]>({ model: MODELS.fast, maxTokens: 900, prompt });
    return NextResponse.json({ stretches });
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
