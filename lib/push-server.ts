/**
 * Server-side Web Push. SERVER ONLY. Wraps `web-push` with VAPID config and a
 * helper that sends a notification to all of a user's subscriptions, pruning any
 * that have expired (410/404).
 */
import webpush from "web-push";
import { adminClient } from "./supabase-server";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:accelerator@example.com";
  if (!pub || !priv) throw new Error("VAPID keys are not set.");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  configure();
  const admin = adminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s: any) => {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        sent++;
      } catch (err: any) {
        // Subscription gone — remove it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    })
  );
  return sent;
}
