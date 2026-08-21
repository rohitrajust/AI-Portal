# UST AI Portal

A portal of six AI-powered tools — Model Arena, Tutor, Translator, Voice Doc
Generator, Whiteboard Cam, and Sketch-to-UI — built as a Next.js frontend backed
by a single consolidated Flask API.

```
frontend/   Next.js 16 (App Router). Server-side proxy routes under app/api/*
            forward every request to the backend, so the browser only ever
            talks to its own origin — no CORS in the normal request path.
backend/    Flask app factory. Six blueprints under /api/<service>, each
            wrapping one tool's LLM/vision provider calls.
```

Full detail — routes, environment variables, provider configuration, known
limitations — lives in [backend/README.md](backend/README.md) and
[frontend/README.md](frontend/README.md). This file is only the map and the
fastest way to get both halves running.

## Quick start

Two processes, two terminals. Start the backend first — the frontend proxies to
it, so pages render but every tool errors if it's down.

```powershell
# Terminal 1 — backend
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# create .env here — see backend/README.md for the required keys
python app.py                    # http://localhost:5000
```

```powershell
# Terminal 2 — frontend
cd frontend
npm ci
# create .env.local here containing: NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:5000
npm run dev                      # http://localhost:3000 (falls back to 3001 if taken)
```

Sign in with any account from `frontend/lib/mockUsers.json` — e.g.
`gopinath_ust` / `Test@123`, which has access to all six tools. Health check:
`curl http://localhost:5000/api/health`.

## Architecture

```
Browser
  │  fetch("/api/...")                 same-origin, no CORS
  ▼
Next.js route handlers (frontend/app/api/*/route.ts)
  │  server-to-server HTTP, reads NEXT_PUBLIC_BACKEND_URL
  ▼
Flask (backend/app.py) — one process, six blueprints under /api/<service>
  │
  ▼
Groq / NVIDIA / DeepL / OpenRouter / HuggingFace  (external LLM & vision providers)
```

There is no database — every tool is either stateless or holds its state
in-process (the Tutor's conversation history lives in a Flask session cookie,
relayed through the proxy on every request).

## Security note

**The backend has no authentication.** Every `/api/*` route is open to anyone who
can reach the port. The frontend's login and per-user tool access
(`frontend/lib/auth.tsx`, `lib/mockUsers.json`) are a client-side convenience for
this portal, not a security boundary — they gate the UI, not the API. Do not
expose `backend/` beyond localhost without adding real authentication first.

## Repository layout rationale

`frontend/` and `backend/` are two independently runnable services kept in one
repository for convenience — not a shared build, not a shared dependency tree.
Each has its own `.gitignore`, its own package manifest, and its own README for
anything specific to that half.
