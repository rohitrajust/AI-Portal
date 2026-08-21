"use client";

import Link from "next/link";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { DebateMessage } from "@/lib/types";


const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function appendMessagesSequentially(
  messages: DebateMessage[],
  setMessages: Dispatch<SetStateAction<DebateMessage[]>>
) {
  for (const message of messages) {
    setMessages((current) => [...current, message]);
    await sleep(120);
  }
}

function normalizeDebateRaw(raw: string) {
  const trimmed = raw.trim();
  if (/^[\[{]/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.messages)) {
        const messages = parsed.messages.map((message: DebateMessage) => ({
          role: "assistant",
          speaker: message.speaker ?? "Assistant",
          content: message.content ?? String(message),
        }));
        return { text: "", winner: parsed.winner ?? parsed.result ?? null, messages };
      }
      const text = parsed.analysis ?? parsed.response ?? parsed.verdict ?? parsed.content ?? trimmed;
      const winner = parsed.winner ?? parsed.verdict ?? null;
      return { text, winner };
    } catch {
      return { text: raw, winner: null };
    }
  }
  return { text: raw, winner: null };
}

function splitBySpeakerMarkers(text: string): DebateMessage[] {
  const labelRegex = /^(Model A|Model B|Assistant A|Assistant B|Team A|Team B|A|B)(?:\s*\([^)]*\))?\s*[:\-–—]\s*/im;
  const splitRegex = /(?=(?:^|\n)\s*(?:Model A|Model B|Assistant A|Assistant B|Team A|Team B|A|B)(?:\s*\([^)]*\))?\s*[:\-–—])/gim;
  const segments = text
    .split(splitRegex)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.map((segment) => {
    const labelMatch = segment.match(labelRegex);
    const speaker = labelMatch ? labelMatch[1].trim() : undefined;
    const content = labelMatch ? segment.slice(labelMatch[0].length).trim() : segment;
    return {
      role: "assistant",
      speaker: speaker || "Assistant",
      content,
    };
  });
}

function splitByModelLabelFallback(text: string): DebateMessage[] {
  const regex = /(?:^|\n)\s*(Model A|Model B|A|B)(?:\s*\([^)]*\))?\s*[:\-–—]/gi;
  const markers: { speaker: string; index: number }[] = [];
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(text)) !== null) {
    markers.push({ speaker: match[1], index: match.index });
  }

  if (markers.length === 0) {
    return [];
  }

  const messages: DebateMessage[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const content = text.slice(start, end).trim();
    const cleaned = content.replace(/^(Model A|Model B|A|B)\s*[:\-–—]?\s*/i, "").trim();
    if (cleaned) {
      messages.push({ role: "assistant", speaker: markers[i].speaker, content: cleaned });
    }
  }

  return messages;
}

type SSEEvent =
  | { type: "thinking"; speaker: string }
  | { type: "turn"; turn: { speaker?: string; text?: string } }
  | { type: "verdict"; verdict?: string }
  | { type: "done" };

function parseSSE(raw: string) {
  const events: SSEEvent[] = [];
  const parts = raw.split(/\r?\n\r?\n/);
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    const lines = part
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.replace(/^data:\s*/, "");
      if (!data || data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        if (typeof parsed === "object" && parsed !== null && typeof (parsed as any).type === "string") {
          events.push(parsed as SSEEvent);
        }
      } catch {
        // ignore invalid event data
      }
    }
  }

  return { events, remainder };
}

function parseDebateResponse(raw: string) {
  const normalized = normalizeDebateRaw(raw);

  if (normalized.messages) {
    return { messages: normalized.messages, winner: normalized.winner ?? null };
  }

  const winnerMatch = normalized.text.match(/(?:^|\n)(?:Winner|Final Verdict|Result)\s*[:\-]\s*(?:Winner\s*[:\-]\s*)?(Model A|Model B|[^\n:.]+)/im);
  const winner = normalized.winner ?? (winnerMatch ? winnerMatch[1].trim() : null);
  let body = normalized.text;

  if (winnerMatch) {
    let endIndex = winnerMatch.index + winnerMatch[0].length;
    const trailingReasonMatch = normalized.text.slice(endIndex).match(/^\s*Reasoning\s*[:\-]\s*/i);
    if (trailingReasonMatch) {
      endIndex += trailingReasonMatch[0].length;
    }
    body = normalized.text.slice(endIndex).trim();
  }

  let messages = splitBySpeakerMarkers(body);
  const hasExplicitSpeaker = messages.some((message) => message.speaker && message.speaker !== "Assistant");
  if ((!hasExplicitSpeaker || messages.length === 0) && body.length > 0) {
    messages = splitByModelLabelFallback(body);
  }

  if (messages.length > 0) {
    return { messages, winner };
  }

  const paragraphs = body
    .split(/\n{2,}|\r\n{2,}/)
    .map((paragraph: string) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return {
      messages: paragraphs.map((paragraph: string, index: number) => ({
        role: "assistant",
        speaker: index % 2 === 0 ? "Model A" : "Model B",
        content: paragraph,
      })),
      winner,
    };
  }

  const lines = body
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return {
      messages: lines.map((line: string, index: number) => ({
        role: "assistant",
        speaker: index % 2 === 0 ? "Model A" : "Model B",
        content: line,
      })),
      winner,
    };
  }

  return {
    messages: [{ role: "assistant", speaker: "Assistant", content: body }],
    winner,
  };
}

export function ArenaPage() {
  const [topic, setTopic] = useState("Compare a Flask service and a FastAPI service for a production AI app.");
  const [rounds, setRounds] = useState<number>(5);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the Next.js proxy endpoint to avoid CORS in the browser.
  const endpoint = useMemo(() => "/api/debate/stream", []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!topic.trim()) {
      setError("Please enter a debate topic.");
      return;
    }

    setError(null);
    setWinner(null);
    setIsLoading(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: topic.trim() },
    ]);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: topic.trim(), rounds }),
      });

      if (!response.ok) {
        throw new Error(`Backend request failed with ${response.status}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = "";

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = !!readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
          }

          const { events, remainder } = parseSSE(buffer);
          buffer = remainder;

          for (const event of events) {
            if (event.type === "turn" && event.turn && typeof event.turn === "object") {
              const turn = event.turn as { speaker?: string; text?: string };
              setMessages((current) => [
                ...current,
                {
                  role: "assistant",
                  speaker: turn.speaker ?? "Assistant",
                  content: turn.text ?? "",
                },
              ]);
            }

            if (event.type === "verdict") {
              setWinner(typeof event.verdict === "string" ? event.verdict : null);
            }
          }
        }

        if (buffer.trim()) {
          const { events } = parseSSE(buffer);
          for (const event of events) {
            if (event.type === "turn" && event.turn && typeof event.turn === "object") {
              const turn = event.turn as { speaker?: string; text?: string };
              setMessages((current) => [
                ...current,
                {
                  role: "assistant",
                  speaker: turn.speaker ?? "Assistant",
                  content: turn.text ?? "",
                },
              ]);
            }
            if (event.type === "verdict") {
              setWinner(typeof event.verdict === "string" ? event.verdict : null);
            }
          }
        }
      } else {
        const text = await response.text();
        const parsed = parseDebateResponse(text);
        setWinner(parsed.winner);
        await appendMessagesSequentially(parsed.messages, setMessages);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Request failed: ${message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-s bg-[#f8fafc] px-6 py-10 text-[#020511] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8 shadow-sm shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0097ac]">
            AI Model Arena
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Debate your deployed applications from one place
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
          <label className="text-sm font-medium text-[#4b5563]" htmlFor="topic">
            Debate topic
          </label>
          <textarea
            id="topic"
            rows={4}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-[#d1d5db] bg-[#f8fafc] px-4 py-3 text-[#020511] outline-none ring-0 focus:border-[#0097ac]"
            placeholder="Type your debate prompt"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="w-full max-w-xs">
              <label className="text-sm font-medium text-[#4b5563]" htmlFor="rounds">
                Rounds
              </label>
              <input
                id="rounds"
                type="number"
                min={1}
                max={20}
                value={rounds}
                onChange={(event) => setRounds(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#d1d5db] bg-[#f8fafc] px-4 py-3 text-[#020511] outline-none ring-0 focus:border-[#0097ac]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-[#0097ac] px-5 py-2.5 font-semibold text-[#ffffff] transition hover:bg-[#008b97] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Sending..." : "Run debate"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-[rgba(0,151,172,0.16)] px-5 py-2.5 text-sm font-medium text-[#006e74] transition hover:border-[#0097ac] hover:text-[#0097ac]"
            >
              Back to dashboard
            </Link>
          </div>

          {error ? <p className="mt-4 text-sm text-[#006e74]">{error}</p> : null}
        </form>

        <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
          <h2 className="text-xl font-semibold text-[#020511]">Conversation</h2>
          {winner ? (
            <div className="mt-4 rounded-3xl border border-[#0097ac]/20 bg-[#ecfeff] p-4 text-base font-semibold text-[#0f515c]">
              Winner: {winner}
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            {messages.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#d1d5db] p-4 text-sm text-[#4b5563]">
                No messages yet. Submit a topic to start the conversation.
              </p>
            ) : (
              messages.map((message, index) => {
                const isModelB =
                  message.role === "assistant" &&
                  typeof message.speaker === "string" &&
                  message.speaker.toLowerCase().includes("model b");

                const bubbleClasses =
                  message.role === "assistant"
                    ? isModelB
                      ? "rounded-3xl border border-[#7dd3fc] bg-[#dbeafe] text-[#020511]"
                      : "rounded-3xl border border-[#67e8f9] bg-[#ecfeff] text-[#020511]"
                    : "rounded-3xl border border-[#d1d5db] bg-[#f8fafc] text-[#020511]";

                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${
                      message.role === "assistant"
                        ? isModelB
                          ? "justify-end"
                          : "justify-start"
                        : "justify-start"
                    }`}
                  >
                    <div className={`${bubbleClasses} max-w-[80%] px-4 py-3 text-sm leading-7`}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#334155]">
                        {message.role === "assistant"
                          ? message.speaker || "Assistant"
                          : "You"}
                      </p>
                      <p>{message.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
