"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognitionEvent = {
  results: Array<Array<{ transcript: string }>>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
}


export function TranslatorPage() {
  const [input, setInput] = useState("私は日本語を英語に翻訳したいです。");
  const [recognizedText, setRecognizedText] = useState("");
  const [translation, setTranslation] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const endpoint = useMemo(() => "/api/translator", []);

  async function translateText(text: string) {
    setError(null);
    setIsLoading(true);
    setTranslation("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Backend request failed with ${response.status}: ${bodyText}`);
      }

      const data = await response.json();
      const translatedText =
        typeof data === "string"
          ? data
          : data.translation ?? data.translated_text ?? data.result ?? JSON.stringify(data);

      setTranslation(translatedText);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSpeechResult(transcript: string) {
    const cleaned = transcript.trim();
    setRecognizedText(cleaned);
    setInput(cleaned);
    if (cleaned) {
      translateText(cleaned);
    }
  }

  function handleSpeechError(message: string) {
    setError(message);
    setIsListening(false);
    recognitionRef.current = null;
  }

  function toggleListening() {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    if (typeof window === "undefined") {
      handleSpeechError("Speech recognition is only available in the browser.");
      return;
    }

      const win = window as WindowWithSpeech;
    const SpeechRecognition = win.webkitSpeechRecognition || win.SpeechRecognition;

    if (!SpeechRecognition) {
      handleSpeechError("Browser does not support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      handleSpeechResult(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      handleSpeechError(event.error ?? "Speech recognition failed.");
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!input.trim()) {
      setError("Please speak or enter Japanese text to translate.");
      setTranslation("");
      return;
    }

    setRecognizedText(input.trim());
    translateText(input.trim());
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-10 text-[#020511] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8 shadow-sm shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0097ac]">
            Japanese Translator
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl text-[#020511]">
            Translate Japanese text to English
          </h1>
        </section>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
          <label className="text-sm font-medium text-[#4b5563]" htmlFor="japanese-text">
            Japanese text
          </label>
          <textarea
            id="japanese-text"
            rows={6}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-[#d1d5db] bg-[#f8fafc] px-4 py-3 text-[#020511] outline-none ring-0 focus:border-[#0097ac]"
            placeholder="日本語のテキストを入力してください。"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className="rounded-full bg-[#0097ac] px-5 py-2.5 font-semibold text-[#ffffff] transition hover:bg-[#00aebd] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isListening ? "Listening..." : "Start speaking"}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-[#006e74] px-5 py-2.5 font-semibold text-[#ffffff] transition hover:bg-[#008b97] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Translating..." : "Translate text"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-[rgba(0,151,172,0.16)] px-5 py-2.5 text-sm font-medium text-[#006e74] transition hover:border-[#0097ac] hover:text-[#0097ac]"
            >
              Back to dashboard
            </Link>
          </div>

          {error ? <p className="mt-4 text-sm text-[#006e74]">{error}</p> : null}
          {recognizedText ? (
            <p className="mt-4 text-sm text-[#020511]">
              Recognized Japanese: <span className="font-medium text-[#006e74]">{recognizedText}</span>
            </p>
          ) : null}
        </form>

        <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
          <h2 className="text-xl font-semibold text-[#020511]">English translation</h2>
          <div className="mt-4 rounded-2xl border border-[#d1d5db] bg-[#f8fafc] p-5 text-sm leading-7 text-[#4b5563] min-h-[8rem]">
            {translation ? (
              <p>{translation}</p>
            ) : (
              <p className="text-[#6b7280]">The translated English text will appear here.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
