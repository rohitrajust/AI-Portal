"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export function WhiteboardCamPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"render" | "code">("render");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [result, setResult] = useState<{
    mermaid_code?: string;
    canvas_json?: any;
  } | null>(null);

  const mermaidRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);


  // Load Mermaid script dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).mermaid) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.onload = () => {
        (window as any).mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          flowchart: { curve: "basis", padding: 18 },
        });
      };
      document.head.appendChild(script);
    }
  }, []);

  // Load Fabric.js script dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).fabric) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/fabric@5.3.0/dist/fabric.min.js";
      document.head.appendChild(script);
    }
  }, []);

  // Render Mermaid SVG
  useEffect(() => {
    if (result?.mermaid_code && mermaidRef.current && (window as any).mermaid) {
      const cleanCode = result.mermaid_code.replace(/```mermaid/gi, "").replace(/```/g, "").trim();
      mermaidRef.current.innerHTML = "";
      (window as any).mermaid
        .render(`mermaid-svg-${Date.now()}`, cleanCode)
        .then(({ svg }: { svg: string }) => {
          if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
        })
        .catch((err: any) => {
          if (mermaidRef.current)
            mermaidRef.current.innerHTML = `<div class="text-red-500 text-xs p-2">Rendering Error: ${err.message}</div>`;
        });
    }
  }, [result?.mermaid_code, activeTab]);

  // Render Interactive Fabric.js Canvas
  useEffect(() => {
    if (result?.canvas_json && canvasRef.current && (window as any).fabric) {
      const fabric = (window as any).fabric;
      const canvasData = result.canvas_json;

      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      const container = canvasRef.current.parentElement;
const containerWidth = container?.clientWidth || 600;
const nativeWidth = canvasData.width || 600;
const nativeHeight = canvasData.height || 500;
const scale = Math.min(1, containerWidth / nativeWidth);

const fCanvas = new fabric.Canvas(canvasRef.current, {
  width: nativeWidth * scale,
  height: nativeHeight * scale,
  backgroundColor: "#ffffff",
});
fCanvas.setZoom(scale);

      fabricCanvasRef.current = fCanvas;
      const linesList: any[] = [];

      canvasData.objects?.forEach((obj: any) => {
        if (obj.type === "line") {
          const line = new fabric.Line([obj.x1, obj.y1, obj.x2, obj.y2], {
            stroke: obj.stroke || "#64748b",
            strokeWidth: obj.strokeWidth || 2,
            selectable: true,
            hasControls: true,
            from_id: obj.from_id,
            to_id: obj.to_id,
          });
          fCanvas.add(line);
          linesList.push(line);
        } else if (obj.type === "group" && obj.objects) {
          const groupItems = obj.objects
            .map((item: any) => {
              if (item.type === "rect") {
                return new fabric.Rect({
                  left: item.left,
                  top: item.top,
                  width: item.width,
                  height: item.height,
                  fill: item.fill,
                  stroke: item.stroke,
                  strokeWidth: item.strokeWidth,
                  rx: item.rx,
                  ry: item.ry,
                });
              } else if (item.type === "textbox") {
                return new fabric.Textbox(item.text, {
                  left: item.left,
                  top: item.top,
                  fontSize: item.fontSize,
                  fill: item.fill,
                  width: item.width,
                  textAlign: item.textAlign,
                  fontWeight: item.fontWeight,
                });
              }
              return null;
            })
            .filter(Boolean);

          const group = new fabric.Group(groupItems, {
            left: obj.left,
            top: obj.top,
            hasControls: true,
            hasBorders: true,
            node_id: obj.node_id,
          });

          fCanvas.add(group);
        }
      });

      // Dynamic Line Tracking on Moving Shapes
      fCanvas.on("object:moving", (e: any) => {
        const target = e.target;
        if (!target || !target.node_id) return;

        const nodeId = target.node_id;
        const center = target.getCenterPoint();

        linesList.forEach((line) => {
          if (line.from_id === nodeId) {
            line.set({ x1: center.x, y1: center.y });
          }
          if (line.to_id === nodeId) {
            line.set({ x2: center.x, y2: center.y });
          }
          line.setCoords();
        });

        fCanvas.renderAll();
      });

      fCanvas.renderAll();
    }
  }, [result?.canvas_json, activeTab]);

  // --- EXPORT HANDLERS ---

  const copyMermaidCode = () => {
    if (!result?.mermaid_code) return;
    navigator.clipboard.writeText(result.mermaid_code);
    setStatusMessage("Mermaid code copied to clipboard!");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const downloadSVG = () => {
    const svgElement = mermaidRef.current?.querySelector("svg");
    if (!svgElement) return alert("No rendered SVG available to export.");

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `whiteboard-diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    const svgElement = mermaidRef.current?.querySelector("svg");
    if (!svgElement) return alert("No rendered diagram available to export.");

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const scale = 2; // 2x Retina Resolution
    const bbox = svgElement.getBoundingClientRect();
    canvas.width = (bbox.width || 800) * scale;
    canvas.height = (bbox.height || 600) * scale;

    img.onload = () => {
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `whiteboard-diagram-${Date.now()}.png`;
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size exceeds maximum limit of 10MB.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setError("Please select a whiteboard image to process.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("output_format", "all");

      const response = await fetch("/api/whiteboard-cam", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Backend request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || data.error) {
        throw new Error(data.error || "Failed to process image.");
      }

      setResult({
        mermaid_code: data.mermaid_code || data.processed?.mermaid_code,
        canvas_json: data.canvas_json || data.processed?.canvas_json,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-10 text-[#020511] sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Header Panel */}
        <div className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-8 shadow-sm shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0097ac]">
            AI Whiteboard Cam
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Convert whiteboard photos into interactive diagrams
          </h1>
        </div>

        {/* Upload Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6"
        >
          <label className="text-sm font-medium text-[#4b5563]" htmlFor="file-upload">
            Whiteboard Image
          </label>

          <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d1d5db] bg-[#f8fafc] p-6 text-center">
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Whiteboard Preview"
                  className="max-h-56 rounded-xl border border-[#d1d5db] object-contain shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className="text-xs font-semibold text-[#0097ac] hover:underline"
                >
                  Change image
                </button>
              </div>
            ) : (
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                <div className="text-3xl">📤</div>
                <p className="text-sm font-medium text-[#020511]">
                  Click or drag & drop a whiteboard photo
                </p>
                <p className="text-xs text-[#64748b]">JPG, PNG, WebP (Max 10MB)</p>
              </label>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isLoading || !file}
              className="rounded-full bg-[#0097ac] px-5 py-2.5 font-semibold text-[#ffffff] transition hover:bg-[#008b97] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Analyzing..." : "Process Image"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-[rgba(0,151,172,0.16)] px-5 py-2.5 text-sm font-medium text-[#006e74] transition hover:border-[#0097ac] hover:text-[#0097ac]"
            >
              Back to dashboard
            </Link>
          </div>

          {error ? <p className="mt-4 text-sm text-[#ef4444]">{error}</p> : null}
          {statusMessage ? (
            <p className="mt-4 text-sm font-medium text-[#006e74]">{statusMessage}</p>
          ) : null}
        </form>

        {/* Extracted Structure & View Tabs */}
        <section className="rounded-3xl border border-[rgba(0,151,172,0.16)] bg-white p-6">
          <div className="flex items-center justify-between border-b border-[#d1d5db]/40 pb-4">
            <h2 className="text-xl font-semibold text-[#020511]">Extracted Structure</h2>
            {result && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("render")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "render"
                      ? "bg-[#0097ac] text-white"
                      : "bg-[#f8fafc] text-[#4b5563] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Rendered Visuals
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "code"
                      ? "bg-[#0097ac] text-white"
                      : "bg-[#f8fafc] text-[#4b5563] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Raw Code / JSON
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            {!result ? (
              <p className="rounded-2xl border border-dashed border-[#d1d5db] p-4 text-sm text-[#4b5563]">
                No diagram processed yet. Upload an image above to extract Mermaid code and Fabric JSON.
              </p>
            ) : activeTab === "render" ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Visual Mermaid Render + Export Action Toolbar */}
                <div className="flex flex-col rounded-2xl border border-[#0097ac]/30 bg-[#ecfeff] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006e74]">
                      Mermaid Vector Diagram
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={copyMermaidCode}
                        className="rounded-md border border-[rgba(0,151,172,0.3)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#006e74] shadow-xs hover:bg-[#0097ac] hover:text-white"
                      >
                        Copy Code
                      </button>
                      <button
                        type="button"
                        onClick={downloadSVG}
                        className="rounded-md border border-[rgba(0,151,172,0.3)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#006e74] shadow-xs hover:bg-[#0097ac] hover:text-white"
                      >
                        Download SVG
                      </button>
                      <button
                        type="button"
                        onClick={downloadPNG}
                        className="rounded-md bg-[#0097ac] px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#008b97]"
                      >
                        Export PNG
                      </button>
                    </div>
                  </div>
                  <div
                    ref={mermaidRef}
                    className="flex min-h-[350px] items-center justify-center rounded-xl border border-[rgba(0,151,172,0.16)] bg-white p-4"
                  />
                </div>

                {/* Visual Fabric.js Canvas Render */}
                <div className="flex flex-col rounded-2xl border border-[#0097ac]/30 bg-[#ecfeff] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#006e74]">
                    Interactive Fabric.js Canvas
                  </p>
                  <div className="flex min-h-[350px] items-center justify-center overflow-hidden rounded-xl border border-[rgba(0,151,172,0.16)] bg-white p-2">
                    <canvas ref={canvasRef} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Mermaid Code Output */}
                <div className="rounded-2xl border border-[#0097ac]/30 bg-[#ecfeff] p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#006e74]">
                    Mermaid Diagram Code
                  </p>
                  <pre className="max-h-80 overflow-auto rounded-xl border border-[rgba(0,151,172,0.16)] bg-white p-3 font-mono text-xs leading-relaxed text-[#020511]">
                    {result.mermaid_code || "No Mermaid code returned."}
                  </pre>
                </div>

                {/* Fabric.js Canvas JSON */}
                <div className="rounded-2xl border border-[#0097ac]/30 bg-[#ecfeff] p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#006e74]">
                    Fabric.js Canvas JSON
                  </p>
                  <pre className="max-h-80 overflow-auto rounded-xl border border-[rgba(0,151,172,0.16)] bg-white p-3 font-mono text-xs leading-relaxed text-[#020511]">
                    {JSON.stringify(result.canvas_json, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}