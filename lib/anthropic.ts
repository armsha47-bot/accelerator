/**
 * Anthropic (Claude) helper. SERVER ONLY — never import into a Client Component,
 * the API key must not reach the browser.
 *
 * Model aliases follow the app spec:
 *   MODELS.fast    → quick tasks (plans, affirmations, recipes)
 *   MODELS.quality → chat + vision analysis (physique/posture/outfit/food)
 */
import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  fast: "claude-haiku-4-5-20251001",
  quality: "claude-opus-4-5",
} as const;

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/** Collapse a message's content blocks into plain text. */
export function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/**
 * Ask Claude for JSON and parse it defensively. Strips ```json fences and grabs
 * the outermost {...} or [...] so a stray preamble doesn't break parsing.
 */
export function parseJson<T>(raw: string): T {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  if (start > 0) s = s.slice(start);
  const lastObj = s.lastIndexOf("}");
  const lastArr = s.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end >= 0) s = s.slice(0, end + 1);
  return JSON.parse(s) as T;
}
