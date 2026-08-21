"use client";

import Link from "next/link";
import { useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function UIGeneratorPage() {
  const [image, setImage] = useState<File | null>(null);
  const [colorTheme, setColorTheme] = useState("");
  const [uiStyle, setUiStyle] = useState("Modern");
  const [pageType, setPageType] = useState("");
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!image) {
      alert("Please upload a sketch.");
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

     if (!response.ok) {
  const errorBody = await response.text();
  throw new Error(`Failed to generate UI (${response.status}): ${errorBody}`);
}

      const data = await response.json();

      sessionStorage.setItem(
        "ui-generator-result",
        JSON.stringify(data)
      );

      window.location.href =
        "/ui-generator/result";

    } catch (error) {
      console.error(error);

      alert(
        "Failed to generate UI. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute projectId="ui-generator">
      <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#006E74] to-[#00848B]">

        <div className="max-w-6xl mx-auto px-6 py-8">

          <div className="flex items-center justify-between mb-10">

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              ← Back to Dashboard
            </Link>

          </div>

          <h1 className="text-5xl font-bold text-white mb-4">
            AI Sketch to UI Generator
          </h1>

          <p className="text-white/90 text-lg max-w-3xl">
            Transform hand-drawn sketches into
            professional user interfaces using
            Vision AI, Prompt Engineering and
            AI-powered UI generation.
          </p>

        </div>

      </div>

      {/* Form Section */}
      <div className="max-w-5xl mx-auto px-6 -mt-10 pb-16">

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-200">

          <div className="mb-8">

            <h2 className="text-2xl font-semibold text-slate-900">
              Upload Sketch
            </h2>

            <p className="text-slate-500 mt-2">
              Upload your wireframe and
              customize design preferences.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            <div>

              <label className="block mb-2 text-sm font-medium text-slate-700">
                Sketch Image
              </label>

              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={(e) =>
                  setImage(
                    e.target.files?.[0] || null
                  )
                }
                className="w-full border border-slate-300 rounded-xl p-3"
                required
              />

            </div>

            <div className="grid md:grid-cols-2 gap-6">

              <div>

                <label className="block mb-2 text-sm font-medium text-slate-700">
                  Color Theme
                </label>

                <input
                  type="text"
                  value={colorTheme}
                  onChange={(e) =>
                    setColorTheme(
                      e.target.value
                    )
                  }
                  placeholder="UST Teal, Blue, Purple..."
                  className="w-full border border-slate-300 rounded-xl p-3"
                />

              </div>

              <div>

                <label className="block mb-2 text-sm font-medium text-slate-700">
                  UI Style
                </label>

                <select
                  value={uiStyle}
                  onChange={(e) =>
                    setUiStyle(
                      e.target.value
                    )
                  }
                  className="w-full border border-slate-300 rounded-xl p-3"
                >
                  <option>Modern</option>
                  <option>Minimal</option>
                  <option>Glassmorphism</option>
                  <option>Neumorphism</option>
                  <option>Corporate</option>
                  <option>Material UI</option>
                </select>

              </div>

            </div>

            <div>

              <label className="block mb-2 text-sm font-medium text-slate-700">
                Target Page Type
              </label>

              <input
                type="text"
                value={pageType}
                onChange={(e) =>
                  setPageType(
                    e.target.value
                  )
                }
                placeholder="Dashboard, Login, CRM..."
                className="w-full border border-slate-300 rounded-xl p-3"
              />

            </div>

            <div>

              <label className="block mb-2 text-sm font-medium text-slate-700">
                Additional Requirements
              </label>

              <textarea
                rows={6}
                value={requirements}
                onChange={(e) =>
                  setRequirements(
                    e.target.value
                  )
                }
                placeholder="Responsive design, charts, dark mode..."
                className="w-full border border-slate-300 rounded-xl p-3"
              />

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#006E74] hover:bg-[#005A5F] disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all"
            >
              {loading
                ? "Generating UI..."
                : "Generate Professional UI"}
            </button>

          </form>

        </div>

      </div>

    </div>
    </ProtectedRoute>
  );
}
