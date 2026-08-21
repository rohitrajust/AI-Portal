"use client";

import { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

interface UIGeneratorResult {
  success: boolean;
  uploaded?: string;
  generated_html?: string;
  uploaded_url?: string;
  preview_url?: string;
  analysis?: string;
  prompt?: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ||
  "http://127.0.0.1:5000";

export default function ResultPage() {
  const [data] = useState<UIGeneratorResult | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const storedResult = sessionStorage.getItem(
      "ui-generator-result"
    );

    if (!storedResult) {
      return null;
    }

    try {
      return JSON.parse(
        storedResult
      ) as UIGeneratorResult;
    } catch (error) {
      console.error(
        "Failed to parse UI generator result:",
        error
      );

      return null;
    }
  });

  const [loading] = useState(false);

  // ============================================================
  // No result
  // ============================================================

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#006E74]" />

          <p className="mt-4 text-slate-600">
            Loading result...
          </p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">

          <h2 className="mb-4 text-2xl font-bold text-red-600">
            No Result Found
          </h2>

          <p className="mb-6 text-slate-600">
            Generate a UI first.
          </p>

          <Link
            href="/ui-generator"
            className="inline-block rounded-xl bg-[#006E74] px-6 py-3 text-white"
          >
            Go To UI Generator
          </Link>

        </div>
      </main>
    );
  }

  // ============================================================
  // Build URLs
  // ============================================================

  const uploadedUrl = data.uploaded_url
    ? data.uploaded_url.startsWith("http")
      ? data.uploaded_url
      : `${BACKEND_URL}${data.uploaded_url.startsWith("/") ? "" : "/"}${data.uploaded_url}`
    : "";

  const previewUrl = data.preview_url
    ? data.preview_url.startsWith("http")
      ? data.preview_url
      : `${BACKEND_URL}${data.preview_url.startsWith("/") ? "" : "/"}${data.preview_url}`
    : "";

  console.log("UI Generator Result:", data);
  console.log("Backend URL:", BACKEND_URL);
  console.log("Uploaded URL:", uploadedUrl);
  console.log("Preview URL:", previewUrl);

  return (
    <ProtectedRoute projectId="ui-generator">
      <main className="min-h-screen bg-slate-50 p-8">

        <div className="mx-auto max-w-7xl">

          {/* ==================================================
              Navigation
          ================================================== */}

          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-5 py-3 font-medium text-white transition hover:bg-slate-900"
            >
              ← Back to Dashboard
            </Link>

            <Link
              href="/ui-generator"
              className="rounded-xl bg-[#006E74] px-5 py-3 font-medium text-white transition hover:bg-[#005A5F]"
            >
              Generate Another UI
            </Link>

          </div>

          {/* ==================================================
              Header
          ================================================== */}

          <div className="mb-10 text-center">

            <h1 className="text-4xl font-bold text-[#006E74]">
              AI UI Generator Result
            </h1>

            <p className="mt-3 text-slate-600">
              Generated UI Preview & Analysis
            </p>

          </div>

          {/* ==================================================
              Main Grid
          ================================================== */}

          <div className="grid gap-8 lg:grid-cols-2">

            {/* ==================================================
                Uploaded Sketch
            ================================================== */}

            <div className="rounded-3xl bg-white p-6 shadow-lg">

              <h2 className="mb-5 text-2xl font-semibold text-slate-900">
                Uploaded Sketch
              </h2>

              {uploadedUrl ? (
                <img
                  src={uploadedUrl}
                  alt="Uploaded Sketch"
                  className="h-auto w-full rounded-2xl border border-slate-200"
                />
              ) : (
                <div className="rounded-xl bg-slate-100 p-8 text-center text-slate-500">
                  Uploaded image is not available.
                </div>
              )}

            </div>

            {/* ==================================================
                Generated UI
            ================================================== */}

            <div className="rounded-3xl bg-white p-6 shadow-lg">

              <h2 className="mb-5 text-2xl font-semibold text-slate-900">
                Generated UI
              </h2>

              {previewUrl ? (
                <>
                  <iframe
                    src={previewUrl}
                    title="Generated UI Preview"
                    className="h-[750px] w-full rounded-2xl border border-slate-200 bg-white"
                  />

                  <div className="mt-5 flex flex-wrap gap-3">

                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-[#006E74] px-5 py-3 font-medium text-white transition hover:bg-[#005A5F]"
                    >
                      Open Full Screen
                    </a>

                    <a
                      href={previewUrl}
                      download
                      className="rounded-xl bg-slate-800 px-5 py-3 font-medium text-white transition hover:bg-slate-900"
                    >
                      Download HTML
                    </a>

                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-red-50 p-8 text-center text-red-600">
                  Generated UI preview URL is missing.
                </div>
              )}

            </div>

          </div>

          {/* ==================================================
              Analysis
          ================================================== */}

          <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg">

            <h2 className="mb-5 text-2xl font-semibold text-slate-900">
              Sketch Analysis
            </h2>

            <pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-slate-100 p-5 text-sm text-slate-700">
              {data.analysis || "No analysis available."}
            </pre>

          </div>

          {/* ==================================================
              Prompt
          ================================================== */}

          <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg">

            <h2 className="mb-5 text-2xl font-semibold text-slate-900">
              Generated Prompt
            </h2>

            <pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-slate-100 p-5 text-sm text-slate-700">
              {data.prompt || "No prompt available."}
            </pre>

          </div>

        </div>

      </main>
    </ProtectedRoute>
  );
}