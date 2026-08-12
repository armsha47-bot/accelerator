"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import PageWrapper from "@/components/layout/PageWrapper";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function CoachPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("coach_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages((data ?? []) as Msg[]);
    })();
  }, [supabase]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Wipe the whole conversation when leaving the coach (privacy). Runs on unmount.
  useEffect(() => {
    return () => {
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) await supabase.from("coach_messages").delete().eq("user_id", user.id);
      })();
    };
  }, [supabase]);

  // Apply a schedule action the coach embedded (clear + add custom tasks).
  async function applySchedule(action: { clear?: boolean; tasks?: { title: string; slot?: string }[] }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (action.clear) await supabase.from("custom_tasks").delete().eq("user_id", user.id);
    const rows = (action.tasks ?? [])
      .filter((t) => t.title?.trim())
      .map((t) => ({
        user_id: user.id,
        title: t.title.trim(),
        time_slot: ["morning", "afternoon", "evening"].includes(t.slot ?? "") ? t.slot : "morning",
        category: "mindset",
        xp_reward: 15,
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        active: true,
      }));
    if (rows.length) await supabase.from("custom_tasks").insert(rows);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        // Hide the raw schedule block from view while streaming.
        const shown = acc.replace(/```schedule[\s\S]*$/, "").trim();
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: shown || acc };
          return copy;
        });
      }

      // If the coach embedded a schedule action, apply it + confirm.
      const block = acc.match(/```schedule\s*([\s\S]*?)```/);
      if (block) {
        const cleaned = acc.replace(/```schedule[\s\S]*?```/, "").trim();
        let note = "";
        try {
          await applySchedule(JSON.parse(block[1].trim()));
          note = "\n\n✅ *Schedule updated — check the Home tab.*";
        } catch {
          note = "\n\n⚠️ *Couldn't apply that change.*";
        }
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: (cleaned || "Done.") + note };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Something went wrong. Try again." };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageWrapper className="flex flex-col pb-24">
      <h1 className="mb-3 text-2xl font-bold">AI Coach</h1>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-28">
        {messages.length === 0 && (
          <div className="card text-sm text-muted">
            I&apos;m your coach. Ask me about your training, your plan, a big game, a test — anything. Let&apos;s get to work.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user" ? "ml-auto bg-white text-bg" : "bg-surface text-ink"
            }`}
          >
            {m.content || (busy && i === messages.length - 1 ? <TypingDots /> : "")}
          </div>
        ))}
      </div>

      <div
        className="fixed inset-x-0 mx-auto flex max-w-md gap-2 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 6.5rem)" }}
      >
        <input
          className="input flex-1"
          placeholder="Message your coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn-primary px-5" onClick={send} disabled={busy}>
          →
        </button>
      </div>
    </PageWrapper>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: "120ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: "240ms" }} />
    </span>
  );
}
