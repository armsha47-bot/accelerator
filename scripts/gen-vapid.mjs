/**
 * Generate a VAPID keypair for Web Push. Run: `node scripts/gen-vapid.mjs`
 * Copy the output into .env.local (and Vercel env).
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("VAPID_SUBJECT=mailto:you@example.com");
