/**
 * POST /api/chat  { message: string }
 * AI coach. Persists both sides to coach_messages, streams the reply back as
 * plain text chunks (text/event-stream-ish; the client reads the stream).
 */
import { serverClient, adminClient } from "@/lib/supabase-server";
import { anthropic, MODELS } from "@/lib/anthropic";

const SYSTEM = `You are Accelerator, a personal AI performance coach for Armaan, a 15-year-old soccer player (winger/CAM) who is also focused on academic excellence (especially math competitions), building confidence, and improving his nutrition (he is vegetarian). You know his goals, his schedule, and his mindset. Be direct, motivating, and specific — not generic. Reference his actual goals when relevant. Use markdown for structure when helpful. Keep replies tight.`;

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

  const stream = await anthropic().messages.stream({
    model: MODELS.quality,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [...priorMessages, { role: "user", content: message }],
  });

  const encoder = new TextEncoder();
  let full = "";
  const readable = new ReadableStream({
    async start(controller) {
      stream.on("text", (t) => {
        full += t;
        controller.enqueue(encoder.encode(t));
      });
      await stream.finalMessage();
      await admin.from("coach_messages").insert({ user_id: user.id, role: "assistant", content: full });
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
