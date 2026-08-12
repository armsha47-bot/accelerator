/**
 * Google Gemini helper. SERVER ONLY — never import into a Client Component; the
 * API key must not reach the browser. Free key: https://aistudio.google.com/apikey
 * Set GEMINI_API_KEY.
 *
 *   MODELS.fast    → quick tasks (plans, affirmations, recipes)
 *   MODELS.quality → chat + vision analysis (physique/posture/outfit/food)
 *
 * Gemini 2.0 Flash is multimodal and covers everything on the free tier, so both
 * aliases point at it; split them later if you want a heavier model for vision.
 */
// NOTE: new Google accounts must use the v1 endpoint (v1beta blocks the models
// for "new users"). gemini-3.6-flash is current, multimodal, and free-tier.
const BASE = "https://generativelanguage.googleapis.com/v1";

export const MODELS = {
  fast: "gemini-3.6-flash",
  quality: "gemini-3.6-flash",
} as const;

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY is not set.");
  return k;
}

export interface AiImage {
  mimeType: string;
  data: string; // base64, no "data:" prefix
}
export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}
export interface GenOpts {
  prompt: string;
  system?: string;
  images?: AiImage[];
  history?: AiMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

function requestBody(opts: GenOpts) {
  const contents: any[] = [];
  for (const m of opts.history ?? []) {
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
  }
  const parts: any[] = [{ text: opts.prompt }];
  for (const img of opts.images ?? []) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  contents.push({ role: "user", parts });
  return {
    contents,
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: { maxOutputTokens: opts.maxTokens ?? 1024, temperature: opts.temperature ?? 0.7 },
  };
}

/** One-shot text generation. */
export async function aiText(opts: GenOpts): Promise<string> {
  const model = opts.model ?? MODELS.fast;
  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${key()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(opts)),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "").trim();
}

/** Ask for JSON and parse defensively. */
export async function aiJson<T>(opts: GenOpts): Promise<T> {
  return parseJson<T>(await aiText(opts));
}

/**
 * Streaming text (for the coach chat). Returns a ReadableStream of UTF-8 text
 * chunks; onDone receives the full text once the stream ends (to persist it).
 */
export async function aiStream(opts: GenOpts, onDone?: (full: string) => Promise<void>): Promise<ReadableStream> {
  const model = opts.model ?? MODELS.quality;
  const res = await fetch(`${BASE}/models/${model}:streamGenerateContent?alt=sse&key=${key()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(opts)),
  });
  if (!res.ok || !res.body) throw new Error(`Gemini stream ${res.status}: ${res.ok ? "no body" : await res.text()}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let full = "";
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (onDone) await onDone(full);
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep the trailing partial line
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const json = t.slice(5).trim();
        if (!json || json === "[DONE]") continue;
        try {
          const obj = JSON.parse(json);
          const text = obj.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
          if (text) {
            full += text;
            controller.enqueue(encoder.encode(text));
          }
        } catch {
          /* partial JSON across chunks — ignore */
        }
      }
    },
  });
}

/**
 * Parse JSON out of a model reply defensively. Strips ```json fences and grabs
 * the outermost {...} or [...] so a stray preamble doesn't break parsing.
 */
export function parseJson<T>(raw: string): T {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start = firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  if (start > 0) s = s.slice(start);
  const lastObj = s.lastIndexOf("}");
  const lastArr = s.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end >= 0) s = s.slice(0, end + 1);
  return JSON.parse(s) as T;
}
