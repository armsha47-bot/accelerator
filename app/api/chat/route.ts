/**
 * POST /api/chat  { message: string }
 * AI coach. Persists both sides to coach_messages, streams the reply back as
 * plain text chunks (text/event-stream-ish; the client reads the stream).
 */
import { serverClient, adminClient } from "@/lib/supabase-server";
import { aiStream, MODELS } from "@/lib/ai";

const SYSTEM = `You are Accelerator, a personal AI performance coach for Armaan, a 15-year-old soccer player (winger/CAM) who is also focused on academic excellence (especially math competitions), building confidence, and improving his nutrition (he is vegetarian). You know his goals, his schedule, and his mindset. Be direct, motivating, and specific — not generic. Reference his actual goals when relevant. Use markdown for structure when helpful. Keep replies tight.

SCHEDULE CONTROL: You can edit Armaan's daily task schedule when he asks (e.g. "clear my tasks", "build me a schedule", "add a study block this afternoon"). When and ONLY when he asks you to change/create/delete/organize tasks or his schedule, end your reply with exactly one fenced block:
\`\`\`schedule
{"clear": <true|false>, "tasks": [{"title": "short task name", "slot": "morning|afternoon|evening"}]}
\`\`\`
Set "clear" to true to wipe his existing custom tasks first (use this when he says things like "delete all tasks" or "start over"). List the tasks you want to add in "tasks" (can be empty if only clearing). Keep your normal conversational reply ABOVE the block and never mention the JSON or the block itself — the app applies it silently. Do NOT include the block for messages that aren't about changing his schedule.`;

export async function POST(req: Request) {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { message } = await req.json().catch(() => ({}));
  if (!message || typeof message !== "string") return new Response("bad request", { status: 400 });

  const admin = adminClient();

  // Load recent history for context.
  const { data: history } = await admin
    .from("coach_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const priorMessages = (history ?? []).reverse().map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content as string,
  }));

  await admin.from("coach_messages").insert({ user_id: user.id, role: "user", content: message });

  let readable: ReadableStream;
  try {
    readable = await aiStream(
      { system: SYSTEM, prompt: message, history: priorMessages, model: MODELS.quality, maxTokens: 1024 },
      async (full) => {
        await admin.from("coach_messages").insert({ user_id: user.id, role: "assistant", content: full });
      }
    );
  } catch {
    return new Response("The coach is unavailable right now. Try again in a moment.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
