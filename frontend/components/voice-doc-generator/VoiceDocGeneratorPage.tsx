"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type DocumentSection = {
  heading: string;
  draft: string;
};

type AnalyzeResponse = {
  doc_type?: string;
  sections?: DocumentSection[];
  clarifying_note?: string;
  error?: string;
};

type GenerateResponse = {
  document_text?: string;
  doc_type?: string;
  error?: string;
};

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

const endpoint = "/api/voice-doc-generator";

export function VoiceDocGeneratorPage() {
  const [transcript, setTranscript] = useState(
    ""
  );
  const [docType, setDocType] = useState("");
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);


  function updateSection(index: number, field: keyof DocumentSection, value: string) {
    setSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section
      )
    );
  }

  async function handleAnalyze() {
    if (!transcript.trim()) {
      setError("Please speak or enter a transcript first.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setGeneratedDoc("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "analyze", transcript: transcript.trim(), doc_type: docType || undefined }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Analyze request failed with ${response.status}: ${bodyText}`);
      }

      const data = (await response.json()) as AnalyzeResponse;
      if (data.error) {
        throw new Error(data.error);
      }

      setDocType(data.doc_type ?? "");
      setSections(data.sections ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleGenerate() {
    if (!transcript.trim() || !docType || sections.length === 0) {
      setError("Please analyze the transcript first to create a document layout.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "generate", transcript: transcript.trim(), doc_type: docType, sections }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Generate request failed with ${response.status}: ${bodyText}`);
      }

      const data = (await response.json()) as GenerateResponse;
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedDoc(data.document_text ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload() {
    if (!generatedDoc) {
      setError("Generate a document first before downloading.");
      return;
    }

    setError(null);
    setIsDownloading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "download", doc_type: docType || "Document", document_text: generatedDoc }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Download request failed with ${response.status}: ${bodyText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(docType || "Document").replace(/\s+/g, "_")}.docx`;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  }

  function handleSpeechResult(transcriptText: string) {
    const cleaned = transcriptText.trim();
    setTranscript(cleaned);
    if (cleaned) {
      setError(null);
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
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const speechText = event.results[0]?.[0]?.transcript ?? "";
      handleSpeechResult(speechText);
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

  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-10 text-[#020511] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8 shadow-sm shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0097ac]">
            Voice Document Generator
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl text-[#020511]">
            Turn spoken notes into a polished document
          </h1>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
            <label className="text-sm font-medium text-[#4b5563]" htmlFor="transcript">
              Spoken transcript
            </label>
            <textarea
              id="transcript"
              rows={8}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-[#d1d5db] bg-[#f8fafc] px-4 py-3 text-[#020511] outline-none ring-0 focus:border-[#0097ac]"
              placeholder="Tell the app what document you need..."
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleListening}
                disabled={isAnalyzing || isGenerating || isDownloading}
                className="rounded-full bg-[#0097ac] px-5 py-2.5 font-semibold text-[#ffffff] transition hover:bg-[#00aebd] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isListening ? "Listening..." : "Start speaking"}
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isGenerating || isDownloading}
                className="rounded-full bg-[#006e74] px-5 py-2.5 font-semibold text-[#ffffff] transition hover:bg-[#008b97] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze transcript"}
              </button>
              <Link
                href="/"
                className="rounded-full border border-[rgba(0,151,172,0.16)] px-5 py-2.5 text-sm font-medium text-[#006e74] transition hover:border-[#0097ac] hover:text-[#0097ac]"
              >
                Back to dashboard
              </Link>
            </div>

            {error ? <p className="mt-4 text-sm text-[#006e74]">{error}</p> : null}
          </section>

          <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
            <label className="text-sm font-medium text-[#4b5563]" htmlFor="doc-type">
              Document type
            </label>

              <select
              id="doc-type"
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-[#d1d5db] bg-[#f8fafc] px-4 py-3"
            >
              <option value="">Select Document Type</option>
              <option value="BRD">Business Requirement Document</option>
              <option value="FRD">Functional Requirement Document</option>
              <option value="User Story">User Story</option>
              <option value="Proposal">Proposal</option>
              <option value="Email">Email</option>
              <option value="Meeting Minutes">Meeting Minutes</option>
              <option value="Project Plan">Project Plan</option>
              <option value="SOP">SOP</option>
            </select>
            <p className="mt-3 text-sm leading-7 text-[#4b5563]">
              The analysis step suggests a document structure and draft content. You can edit the layout before generating the final document.
            </p>
          </section>
        </div>

        {sections.length > 0 ? (
  <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-[#020511]">
          Document Layout
        </h2>
        <p className="mt-1 text-sm text-[#4b5563]">
          Review the section plan and update the draft copy before generating
          the full document.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || isAnalyzing || isDownloading}
        className="rounded-full bg-[#0097ac] px-5 py-2.5 font-semibold text-[#ffffff] transition hover:bg-[#00aebd] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isGenerating ? "Generating..." : "Generate Document"}
      </button>
    </div>

    <div className="mt-5 space-y-4">
      {sections.map((section, index) => (
        <div
          key={`${section.heading}-${index}`}
          className="rounded-2xl border border-[#d1d5db] bg-[#f8fafc] p-4"
        >
          <input
            value={section.heading}
            onChange={(event) =>
              updateSection(index, "heading", event.target.value)
            }
            className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-semibold text-[#020511] outline-none focus:border-[#0097ac]"
          />

          <textarea
            value={section.draft}
            onChange={(event) =>
              updateSection(index, "draft", event.target.value)
            }
            className="mt-3 min-h-24 w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#4b5563] outline-none focus:border-[#0097ac]"
          />
        </div>
      ))}
    </div>
  </section>
) : null}

        {generatedDoc ? (
          <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#020511]">Generated document</h2>
                <p className="mt-1 text-sm text-[#4b5563]">The document is ready to review, copy, or download.</p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="rounded-full bg-[#006e74] px-5 py-2.5 font-semibold text-[#ffffff] transition hover:bg-[#008b97] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDownloading ? "Preparing download..." : "Download .docx"}
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#d1d5db] bg-[#f8fafc] p-5 text-sm leading-8 text-[#4b5563] whitespace-pre-wrap">
              {generatedDoc}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}