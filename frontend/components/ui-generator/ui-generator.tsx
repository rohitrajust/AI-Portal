// components/ui-generator/ui-generator-page.tsx

"use client";

import Link from "next/link";
import { useState } from "react";

export function UIGeneratorPage() {
  const [image, setImage] = useState<File | null>(null);
  const [colorTheme, setColorTheme] = useState("");
  const [uiStyle, setUiStyle] = useState("Modern");
  const [pageType, setPageType] = useState("");
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!image) {
      alert("Please upload a sketch");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("image", image);
      formData.append("color_theme", colorTheme);
      formData.append("ui_style", uiStyle);
      formData.append("page_type", pageType);
      formData.append(
        "page_requirements",
        requirements
      );

      const response = await fetch(
        "/api/ui-generator",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Generation failed"
        );
      }

      sessionStorage.setItem(
        "ui-generator-result",
        JSON.stringify(data)
      );

      window.location.href =
        "/ui-generator/result";
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Generation failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-10 text-[#020511] sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">

        <div className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0097ac]">
            AI Design Studio
          </p>

          <h1 className="mt-3 text-4xl font-semibold">
            AI Sketch To UI Generator
          </h1>

          <p className="mt-3 text-[#4b5563]">
            Upload a hand-drawn sketch and let AI
            transform it into a professional,
            responsive user interface.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8"
        >
          <h2 className="text-xl font-semibold">
            Upload Sketch
          </h2>

          <div className="mt-6">
            <label className="block text-sm font-medium">
              Sketch Image
            </label>

            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              required
              onChange={(e) =>
                setImage(
                  e.target.files?.[0] || null
                )
              }
              className="mt-2 w-full rounded-xl border border-[#d1d5db] p-3"
            />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">

            <div>
              <label className="block text-sm font-medium">
                Color Theme
              </label>

              <input
                value={colorTheme}
                onChange={(e) =>
                  setColorTheme(
                    e.target.value
                  )
                }
                placeholder="UST Teal, Blue..."
                className="mt-2 w-full rounded-xl border border-[#d1d5db] p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                UI Style
              </label>

              <select
                value={uiStyle}
                onChange={(e) =>
                  setUiStyle(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d1d5db] p-3"
              >
                <option>Modern</option>
                <option>Minimal</option>
                <option>Material UI</option>
                <option>Glassmorphism</option>
                <option>Neumorphism</option>
                <option>Corporate</option>
              </select>
            </div>

          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium">
              Target Page Type
            </label>

            <input
              value={pageType}
              onChange={(e) =>
                setPageType(
                  e.target.value
                )
              }
              placeholder="Dashboard, CRM, Login..."
              className="mt-2 w-full rounded-xl border border-[#d1d5db] p-3"
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium">
              Additional Requirements
            </label>

            <textarea
              rows={5}
              value={requirements}
              onChange={(e) =>
                setRequirements(
                  e.target.value
                )
              }
              placeholder="Dark mode, analytics cards..."
              className="mt-2 w-full rounded-xl border border-[#d1d5db] p-3"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#0097ac] px-6 py-3 font-semibold text-white transition hover:bg-[#008b97]"
            >
              {loading
                ? "Generating..."
                : "Generate UI"}
            </button>

            <Link
              href="/"
              className="rounded-full border border-[rgba(0,151,172,0.16)] px-6 py-3 text-[#006e74]"
            >
              Back to Dashboard
            </Link>

          </div>

        </form>
      </div>
    </main>
  );
}