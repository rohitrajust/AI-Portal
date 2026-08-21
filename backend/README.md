AiPortal Backend - Unified Consolidation
=========================================

A single Flask application that consolidates 6 independent Flask/FastAPI backend services into one unified server running on port 5000.

**What's included:**
- AI Model Arena (Groq vs Nvidia LLM debate with SSE streaming)
- AI Tutor (Socratic tutoring with Flask sessions and mastery tracking)
- Real-Time Translator (WebSocket-based Japanese-to-English translation via Deepgram + DeepL)
- Voice Doc Generator (Spoken notes to structured documents)
- AI Whiteboard Cam (Whiteboard photo to interactive diagrams)
- UI Sketch-to-Design (Hand-drawn sketches to responsive HTML)

Quick Start
-----------

1. **Create and configure .env**

Create `.env` in this directory. It is gitignored - never commit it. There is no
`.env.example` in the repo; `config.py` is the authoritative list of names read.

`config.py` prefers **service-scoped** names and falls back to legacy shared ones,
so each app may hold a different credential for the same provider:

- `ARENA_GROQ_API_KEY`, `ARENA_NVIDIA_API_KEY` (Arena)
- `TUTOR_GROQ_API_KEY` (Tutor)
- `UIDESIGN_NVIDIA_API_KEY`, `UIDESIGN_GROQ_API_KEY` (Sketch to UI)
- `WHITEBOARD_NVIDIA_API_KEY` (Whiteboard vision)
- `DOCGEN_LLM_PROVIDER` (`openrouter` | `huggingface` | `groq` | `nvidia`) plus its
  matching credential - see the model-selection table below
- `TRANSLATOR_DEEPL_API_KEY` (Translator)
- `FLASK_SECRET_KEY` (signs the Tutor session cookie)

**Document generator model selection.** `DOCGEN_LLM_PROVIDER` picks the provider;
set the **per-provider** model name that matches it:

| Provider | Credential | Model override |
|---|---|---|
| `openrouter` | `DOCGEN_OPENROUTER_API_KEY` | `DOCGEN_OPENROUTER_MODEL` |
| `huggingface` | `DOCGEN_HF_TOKEN` | `DOCGEN_HF_MODEL` |
| `groq` | `DOCGEN_GROQ_API_KEY` | `DOCGEN_GROQ_MODEL` |
| `nvidia` | `DOCGEN_NVIDIA_API_KEY` | `DOCGEN_NVIDIA_MODEL` |

The legacy `DOCGEN_LLM_MODEL` still works but is **provider-agnostic**, so a value left
over from a previous provider is sent to the new one and rejected with a 400. Leave it
blank and use the per-provider names. Model ids are not interchangeable:
`openai/gpt-oss-120b:fastest` is a HuggingFace id and is not valid on OpenRouter.

**OpenRouter free tier — measured behaviour.** Free models (ids ending `:free`) are both
slow and rate-limited. On `openai/gpt-oss-20b:free`, `/api/docgen/api/analyze` took 25-77s
and `/api/docgen/api/generate` 56-79s, and roughly one call in three returned a 429
(`temporarily rate-limited upstream`). Both surface as a 502 with OpenRouter's message
intact, so the frontend shows a readable error rather than hanging.

Because of that latency, `DOCGEN_LLM_TIMEOUT` defaults to **180** seconds; the previous
hardcoded 60s cut off `generate` mid-response. Raise it further for slower models.

For day-to-day use a cheap paid OpenRouter model is markedly better than the free tier:
no 429s and far lower latency. Set `DOCGEN_OPENROUTER_MODEL` to any id from
openrouter.ai/models. If a model starts ignoring the strict-JSON instruction in
`/api/docgen/api/analyze`, `z-ai/glm-5.2:free` is a stronger free fallback.

Behind a TLS-intercepting proxy (Zscaler and similar), set `DOCGEN_OPENROUTER_CA_BUNDLE`
to the proxy's root CA rather than disabling verification. On this machine that CA is at
`C:\ZscalerCert\zcer.pem`, the same one `NODE_EXTRA_CA_CERTS` already points Node at.

2. **Install dependencies (recommend virtualenv)**

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

`requirements.txt` lists only what the code actually imports (verified by grep against
every module in `apps/`) — no `pyaudio`/build-toolchain issues on Windows.

3. **Run the server**

```powershell
python app.py
```

The app listens on http://localhost:5000. Open that URL to use the unified
browser interface for all six applications. API health is available at
http://localhost:5000/api/health.

Open http://localhost:5000/test for a no-build HTML test client. It includes
health checks, Tutor, Arena, Doc Generator, file uploads, and a Translator
WebSocket connection test.

URL Mapping: Old → New
----------------------

All services now accessible under `/api/<service>` prefixes on a single Flask server.

### AI Model Arena (Flask)
| Function | Old Endpoint | New Endpoint |
|---|---|---|
| POST debate | /api/debate | /api/arena/api/debate |
| SSE debate stream | /api/debate/stream | /api/arena/api/debate/stream |

### AI Tutor (Flask + Sessions)
| Function | Old Endpoint | New Endpoint |
|---|---|---|
| POST chat | /api/chat | /api/tutor/api/chat |
| POST reset | /api/reset | /api/tutor/api/reset |
| Session keys | `session["history"]`, `session["ledger"]` | `session["tutor_history"]`, `session["tutor_ledger"]` |

### Real-Time Translator (FastAPI → Flask-Sock WebSocket)
| Function | Old Protocol | New Protocol |
|---|---|---|
| WebSocket | /ws (FastAPI) | `/ws` (flask-sock, registered app-level) |
| REST translate | n/a | `POST /api/translator/api/translate` |
| Message format | `{"type": "start"\|"stop"\|"flush"\|"settings"}` | Same protocol, Flask-compatible |

### Voice Doc Generator (Flask)
| Function | Old Endpoint | New Endpoint |
|---|---|---|
| POST analyze | /api/analyze | /api/docgen/api/analyze |
| POST generate | /api/generate | /api/docgen/api/generate |
| POST download | /api/download | /api/docgen/api/download |

### AI Whiteboard Cam (FastAPI → Flask)
| Function | Old Endpoint | New Endpoint |
|---|---|---|
| POST upload | POST /api/v1/upload | POST /api/whiteboard/upload |
| POST process | POST /api/v1/process | POST /api/whiteboard/process |
| POST process-direct | POST /api/v1/process-direct | POST /api/whiteboard/process-direct |
| GET image info | GET /api/v1/image/{id} | GET /api/whiteboard/image/<id> |
| DELETE image | DELETE /api/v1/image/{id} | DELETE /api/whiteboard/image/<id> |
| GET health | GET /api/v1/health | GET /api/whiteboard/health |

### UI Sketch-to-Design (Flask)
| Function | Old Endpoint | New Endpoint |
|---|---|---|
| POST upload | POST /upload | POST /api/uidesign/upload |
| GET uploaded | GET /uploads/<file> | GET /api/uidesign/uploads/<file> |
| GET preview | GET /preview/<file> | GET /api/uidesign/preview/<file> |
| GET health | GET /health | GET /api/uidesign/health |

Health & Status
---------------

Get unified health check:
```bash
curl http://localhost:5000/
```

Response:
```json
{
  "status": "ok",
  "message": "AiPortal unified backend",
  "apps": ["arena", "tutor", "translator", "docgen", "whiteboard", "uidesign"]
}
```

Smoke Test
----------

After starting the server, run the included smoke test:

```powershell
python run_smoke.py
```

This hits key endpoints on each service to verify they're running.

WebSocket Test (Translator)
---------------------------

Test the translator WebSocket using `websocat` or any WebSocket client:

```bash
websocat ws://localhost:5000/ws
{"type":"start"}
{"type":"flush", "transcript": "こんにちは"}
{"type":"stop"}
```

Session Namespacing (Tutor)
---------------------------

The AI Tutor app uses Flask sessions to store conversation history and mastery scores. To prevent collisions in the unified backend, keys are namespaced:

```python
session["tutor_history"]  # Tutor conversation history
session["tutor_ledger"]   # Tutor mastery tracking per topic
```

Your Next.js frontend should update its API base URL to:
```
http://localhost:5000/api/
```

Then construct paths like:
- POST http://localhost:5000/api/arena/api/debate/stream
- POST http://localhost:5000/api/tutor/api/chat
- POST http://localhost:5000/api/translator/api/translate
- WS   ws://localhost:5000/ws

Project Structure
-----------------

```
backend/
├── app.py                   # Application factory
├── config.py                # Centralized config + API keys
├── requirements.txt         # Merged dependencies
├── .env                     # (not committed) Your API keys — see "Create and configure .env" above
├── .gitignore               # Prevents committing secrets
├── apps/
│   ├── arena/               # AI Model Arena (SSE debate)
│   │   ├── routes.py
│   │   └── llm.py
│   ├── tutor/               # AI Tutor (Socratic with sessions)
│   │   ├── routes.py
│   │   ├── llm.py
│   │   └── validator.py
│   ├── translator/          # Real-Time Translator (WebSocket)
│   │   ├── routes.py
│   │   ├── ws.py
│   │   ├── engine.py
│   │   └── config.py
│   ├── docgen/              # Voice Doc Generator
│   │   ├── routes.py
│   │   └── utils/
│   ├── whiteboard/          # AI Whiteboard Cam (diagram extraction)
│   │   ├── routes.py
│   │   └── services/
│   └── uidesign/            # UI Sketch-to-Design
│       ├── routes.py
│       └── services/
└── README.md
```

Dependencies & Version Conflicts
---------------------------------

Merged from 6 projects. Resolved conflicts:
- Flask: 3.0.3 (arena/docgen) vs 3.1.3 (uidesign) → **3.1.3** (backward compatible)
- openai: 1.35.3 (whiteboard) vs 2.46.0 (uidesign) → **2.46.0** (API compatible)
- requests: 2.32.3 vs 2.34.2 → **2.34.2**
- Pillow: versions vary → **10.4.0+** (permissive)

See `requirements.txt` for full merged list.

Notes
-----

1. **Translator:** `POST /api/translator/api/translate` translates Japanese to
   English via DeepL and is what the Next.js frontend calls. A WebSocket at `/ws`
   speaks the same `start`/`stop`/`flush` protocol. Only `TRANSLATOR_DEEPL_API_KEY`
   is required - the transcript comes from the browser's Web Speech API, so no
   speech-to-text SDK is needed on the backend.

2. **AI Tutor (Sessions):** Session keys are namespaced to `tutor_*` to avoid
   conflicts with other apps. The app tracks mastery per topic using an
   exponential moving average. The Next.js proxy forwards the `cookie` and
   `set-cookie` headers so the session survives the hop.

3. **AI Whiteboard Cam:** Processing is async-compatible in Flask and calls an
   NVIDIA vision model to emit Mermaid. On upstream failure it returns a valid
   fallback diagram rather than an error. The `svg` field is always null; the
   frontend renders the Mermaid client-side.

4. **Arena (SSE):** Debate streaming uses Server-Sent Events. The client should
   open a persistent HTTP connection and parse `data:` lines. Any proxy in front
   must stream the body through rather than buffering it.

5. **Security - read this before exposing the server.**

   - **There is no authentication on any endpoint.** Every route above is open to
     anyone who can reach the port. The portal frontend's login and per-project
     roles are mock, client-side only (`sessionStorage` plus a plaintext
     `mockUsers.json` shipped to the browser) and enforce nothing here.
   - `app.py` binds `0.0.0.0`, so the server is reachable from your whole network,
     not just localhost. Combined with the point above, anyone on the LAN can spend
     your provider credits. Bind `127.0.0.1` or firewall the port for local dev.
   - Keep `.env` out of git - `.gitignore` already excludes it. Never commit keys.
   - This `.env` disables TLS verification (`GROQ_TLS_VERIFY=false`,
     `NVIDIA_TLS_VERIFY=false`, `DOCGEN_HF_TLS_VERIFY=false`), presumably for a
     corporate proxy. Acceptable locally; must not ship to production.
   - The dev server is Werkzeug. Use a real WSGI server for anything shared.

Troubleshooting
---------------

- **Translation errors:** check `TRANSLATOR_DEEPL_API_KEY`. The route returns 502 if
  DeepL is unreachable, which the frontend proxy treats as a signal to fall back.
- **Session errors:** Ensure `FLASK_SECRET_KEY` is set; Flask uses it to sign session cookies.
- **WebSocket connection refused:** Verify `flask-sock` is installed and the server is running.
- **CORS errors:** allowed origins are localhost/127.0.0.1 on ports 3000 and 3001
  (see `app.py`). The Next.js dev server falls back to 3001 when 3000 is taken.
  Note the normal data path goes through Next.js proxy routes server-to-server,
  so CORS is not involved in it at all.

