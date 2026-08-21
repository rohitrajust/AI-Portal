# UST AI Portal — Frontend

Next.js 16 (App Router) dashboard for six AI tools. Every tool talks to a single
consolidated Flask backend through a Next.js proxy route, so the browser only
ever calls same-origin `/api/*` paths.

## Quick start

Two processes, two terminals. The backend lives alongside this app at `../backend`
in this same repository — a separate Flask service, not part of the Next.js build.

```powershell
# Terminal 1 — backend (Python 3.12)
cd ../backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py          # serves http://localhost:5000
```

```powershell
# Terminal 2 — frontend
npm ci
npm run dev            # serves http://localhost:3000
```

Create `.env.local` (gitignored) before starting the frontend:

```
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:5000
```

Sign in with any account from `lib/mockUsers.json` — e.g. `gopinath_ust` /
`Test@123`, which has access to all six tools.

> `requirements.txt` in the backend repo also lists `pyaudio` and `deepgram-sdk`.
> Nothing imports them, and `pyaudio` needs a C toolchain on Windows, so the
> command above installs only what the code actually uses.

## Architecture

```
Browser (:3000)
  │  fetch("/api/…")            same-origin, so no CORS
  ▼
Next.js route handlers (app/api/*/route.ts)     ← reads NEXT_PUBLIC_BACKEND_URL
  │  server-to-server HTTP
  ▼
Flask (:5000) — one process, six blueprints under /api/<service>
```

Authentication is **mock and client-side only** (`lib/auth.tsx` +
`lib/mockUsers.json`, persisted in `sessionStorage`). `ProtectedRoute` gates the
UI, but **the backend has no authentication of its own** — every endpoint is
open to anyone who can reach port 5000. Treat the dashboard's role and project
restrictions as cosmetic, and do not expose the backend beyond localhost.

### Route map

| Tool | Page | Proxy route | Backend endpoint |
|---|---|---|---|
| AI Model Arena | `/arena` | `app/api/debate/stream` | `POST /api/arena/api/debate/stream` (SSE) |
| AI Tutor | `/tutor` | `app/api/tutor` | `POST /api/tutor/api/chat`, `/api/reset` |
| Translator | `/translator` | `app/api/translator` | `POST /api/translator/api/translate` |
| Voice Doc Generator | `/voice-doc-generator` | `app/api/voice-doc-generator` | `POST /api/docgen/api/{analyze,generate,download}` |
| Sketch to UI | `/ui-generator` | `app/api/ui-generator` | `POST /api/uidesign/upload` |
| Whiteboard Cam | `/whiteboard-cam` | `app/api/whiteboard-cam` | `POST /api/whiteboard/process-direct` |

The UI Generator result page is the one exception: it renders the generated HTML
in an `<iframe>` pointed straight at `{NEXT_PUBLIC_BACKEND_URL}/api/uidesign/preview/<file>`.
`<iframe>` and `<img>` are not subject to CORS, so this works locally, but it does
mean the backend must be reachable from the browser — worth revisiting before any
deployment.

## Adding another service

The backend is consolidated: new services become a **blueprint on the existing
Flask app**, not a new process on a new port.

### 1. Add the backend blueprint

Register it in the backend's `app.py` under `/api/<service>`. No new port, and no
new frontend environment variable — `NEXT_PUBLIC_BACKEND_URL` already covers it.

### 2. Create a proxy route

Add `app/api/<yourproject>/route.ts`:

```typescript
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:5000";

export async function POST(request: Request) {
  const body = await request.text();

  const backendResponse = await fetch(`${backendUrl}/api/<service>/your-endpoint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      "content-type": backendResponse.headers.get("content-type") ?? "application/json",
    },
  });
}
```

> **Sessions/cookies:** forward the `cookie` request header and relay `set-cookie`
> back — see `app/api/tutor/route.ts` for a working example.
>
> **Streaming (SSE):** pass `backendResponse.body` straight through rather than
> awaiting `.text()`, or the stream buffers — see `app/api/debate/stream/route.ts`.
>
> **File uploads:** forward the `FormData` object as-is — see
> `app/api/ui-generator/route.ts`.

### 3. Build the page and component

- Component: `components/<yourproject>/<YourProject>Page.tsx`
- Page route: `app/<yourproject>/page.tsx` — keep it thin, wrapping the component
  in `<ProtectedRoute projectId="<your-id>">`

### 4. Register it on the dashboard

Add an entry to `lib/projects.ts` (shape defined by `Project` in `lib/types.ts`):

```typescript
{
  id: "your-project",                     // must match ProtectedRoute's projectId
  name: "Your Project Name",
  description: "One-line description of what it does.",
  route: "/yourproject",
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000",
  status: "Ready to connect",
  owner: "someone_ust",
  allowedUsers: ["gopinath_ust", "nazar_ust", "someone_ust"],
}
```

Then grant access by adding the same `id` to the relevant users'
`allowedProjects` in `lib/mockUsers.json`.

### Checklist before opening a PR

- [ ] Blueprint registered on the consolidated backend under `/api/<service>`
- [ ] Proxy route added under `app/api/`
- [ ] Page wrapped in `ProtectedRoute` with a `projectId`
- [ ] Card added to `lib/projects.ts` and the id added to `lib/mockUsers.json`
- [ ] `npm run build` passes
