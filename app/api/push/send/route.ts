/**
 * POST /api/push/send  { title?, body? }
 * Sends a test notification to the signed-in user's own devices.
 */
import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase-server";
import { sendToUser } from "@/lib/push-server";

export async function POST(req: Request) {
  const supabase = serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { title, body } = await req.json().catch(() => ({}));
  try {
    const sent = await sendToUser(user.id, {
      title: title || "Accelerator",
      body: body || "🎯 This is a test — your reminders are working.",
      url: "/",
    });
    return NextResponse.json({ sent });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "send failed" }, { status: 500 });
  }
}
