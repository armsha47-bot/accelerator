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
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
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

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto">
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

      <div className="fixed inset-x-0 bottom-20 mx-auto flex max-w-md gap-2 px-4">
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
