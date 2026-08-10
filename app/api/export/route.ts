/**
 * GET /api/export — bundles the signed-in user's data as a ZIP of CSVs and
 * streams it as a download.
 */
import { serverClient, adminClient } from "@/lib/supabase-server";
import { buildZip, toCsv } from "@/lib/zip";

const TABLES: { table: string; file: string }[] = [
  { table: "food_logs", file: "food_logs.csv" },
  { table: "workouts", file: "workouts.csv" },
  { table: "study_sessions", file: "study_sessions.csv" },
  { table: "sleep_logs", file: "sleep_logs.csv" },
  { table: "xp_transactions", file: "xp_history.csv" },
  { table: "habit_completions", file: "habit_completions.csv" },
];

export async function GET() {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const admin = adminClient();
  const files: { name: string; content: string }[] = [];
  for (const { table, file } of TABLES) {
    const { data } = await admin.from(table).select("*").eq("user_id", user.id);
    files.push({ name: file, content: toCsv((data ?? []) as any[]) });
  }

  const zip = buildZip(files);
  return new Response(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="accelerator-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
