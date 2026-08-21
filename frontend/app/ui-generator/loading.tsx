export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-teal-600 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-white animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L15 12l-5.25-5"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-slate-900">
            Generating UI
          </h2>

          <p className="text-center text-slate-500 mt-2">
            Analyzing sketch and creating a professional interface...
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Vision Analysis
                </span>
                <span className="text-sm text-teal-600">Completed</span>
              </div>

              <div className="w-full h-2 bg-slate-200 rounded-full">
                <div className="h-2 w-full bg-teal-600 rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Prompt Generation
                </span>
                <span className="text-sm text-teal-600">Completed</span>
              </div>

              <div className="w-full h-2 bg-slate-200 rounded-full">
                <div className="h-2 w-full bg-teal-600 rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  UI Creation
                </span>
                <span className="text-sm text-amber-500 animate-pulse">
                  Processing...
                </span>
              </div>

              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-2 w-1/2 bg-teal-600 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-teal-600 animate-bounce" />
              <div
                className="h-3 w-3 rounded-full bg-teal-600 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="h-3 w-3 rounded-full bg-teal-600 animate-bounce"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            This may take a few seconds depending on sketch complexity.
          </p>
        </div>
      </div>
    </div>
  );
}