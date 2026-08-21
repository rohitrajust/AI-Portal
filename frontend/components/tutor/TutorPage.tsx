"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  isAskingFirst?: boolean;
};

type TutorResponse = {
  reply: string;
  topic?: string;
  phase?: string;
  mastery?: number;
  confidence?: number;
  ledger?: Record<string, number>;
  error?: string;
};

export function TutorPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [ledger, setLedger] = useState<Record<string, number>>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;

    setError(null);
    setMessages((current) => [...current, { role: "user", content: text }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });

      const data: TutorResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply,
          isAskingFirst: (data.phase ?? "").toLowerCase().includes("ask"),
        },
      ]);

      if (data.ledger) setLedger(data.ledger);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  async function startNewSession() {
    setError(null);
    try {
      await fetch("/api/tutor", {
        method: "DELETE",
        credentials: "include",
      });
      setMessages([]);
      setLedger({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !isLoading) {
      sendMessage();
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-10 text-[#020511] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8 shadow-sm shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div>
            <h1 className="text-3xl font-semibold">AI Tutor</h1>
            <p className="mt-1 text-[#4b5563]">Learn through guided questioning</p>
          </div>
          <button
            onClick={startNewSession}
            className="rounded-full bg-[#0097ac] px-5 py-2.5 text-sm font-semibold text-[#ffffff] transition hover:bg-[#008b97]"
          >
            New Session
          </button>
        </div>

        <Link href="/" className="text-sm text-[#006e74] hover:text-[#0097ac]">
          ← Back to dashboard
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6 shadow-sm shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="rounded-2xl border border-[#0097ac]/40 bg-[#ecfeff] p-5 text-sm leading-7 text-[#020511]">
                  👋 Welcome to <strong>AI Tutor</strong>.
                  <br />
                  Ask any question related to AI, Programming, Cloud, Databases,
                  System Design or Software Engineering.
                  <br />
                  The tutor will first ask what you think a term means, then
                  correct and explain it step-by-step.
                </div>
              )}

              {messages.map((turn, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      turn.role === "user"
                        ? "self-end bg-[#0097ac] text-[#ffffff]"
                        : "self-start bg-[#f8fafc] text-[#020511]"
                    }`}
                  >
                    {turn.content}
                  </div>
                  {turn.isAskingFirst && (
                    <span className="self-start rounded-full bg-[#0097ac]/20 px-3 py-1 text-xs font-semibold text-[#006e74]">
                      ASKING YOU FIRST
                    </span>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="self-start rounded-2xl bg-[#f1f5f9] px-4 py-2.5 text-sm italic text-[#6b7280]">
                  Tutor is thinking...
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-[#006e74]">{error}</p>}

            <div className="mt-6 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 rounded-full border border-[#d1d5db] bg-[#f8fafc] px-4 py-2.5 text-sm text-[#020511] outline-none focus:border-[#0097ac]"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading}
                className="rounded-full bg-[#006e74] px-5 py-2.5 text-sm font-semibold text-[#ffffff] transition hover:bg-[#008b97] disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6 shadow-sm shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
            <h2 className="text-lg font-semibold text-[#020511]">Learning Progress</h2>
            <p className="mt-1 text-sm text-[#4b5563]">
              Concept mastery during this session
            </p>

            <div className="mt-5 flex flex-col gap-4">
              {Object.keys(ledger).length === 0 ? (
                <p className="text-sm text-[#6b7280]">No topics tracked yet.</p>
              ) : (
                Object.entries(ledger).map(([topic, mastery]) => (
                  <div key={topic}>
                    <div className="flex justify-between text-sm">
                      <span>{topic}</span>
                      <span>{mastery}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-[#f1f5f9]">
                      <div
                        className="h-2 rounded-full bg-[#0097ac]"
                        style={{ width: `${mastery}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}