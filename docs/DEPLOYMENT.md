# Deployment

Eventra AI is two packages that deploy independently or together:

- **`client/`** — static SPA (`client/dist`) → any static host (Vercel,
  Netlify, Cloudflare Pages, an S3 bucket, or the Node server itself).
- **`server/`** — Express API (`server/dist/index.js`) → any Node host
  (Render, Railway, Fly.io, a VPS, a container, or Vercel serverless functions).

---

## Environment variables

Set these on the **server** only. Copy `.env.example` as a starting point.

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | For AI features | Server-side only. Without it, the app runs in local mode: AI routes are served by a built-in template engine, tagged `source: "local"`, and the UI labels the output as local templates. |
| `GEMINI_MODEL` | No | Defaults to `gemini-flash-latest`. |
| `PORT` | No | Defaults to `4000`. Most hosts inject `PORT` — the app respects it. |
| `CLIENT_ORIGIN` | In production | Comma-separated allowed CORS origins, e.g. `https://yourapp.vercel.app`. |
| `AI_REQUEST_TIMEOUT_MS` | No | Default `30000`. |
| `AI_RATE_LIMIT_WINDOW_MS` / `AI_RATE_LIMIT_MAX` | No | Defaults `60000` / `30`. |
| `BODY_LIMIT` | No | Default `1mb`. |
| `SERVE_STATIC` | Optional | Path to `client/dist` to serve the SPA from the same process. |

On the **client**, the only variable is:

| Variable | Notes |
| --- | --- |
| `VITE_API_BASE_URL` | Absolute API origin, no trailing slash (e.g. `https://api.yourapp.com`). If unset, the client calls `/api` on its own origin — use this for same-origin deployments. **Never put secrets here**; anything prefixed `VITE_` is bundled into public JavaScript. |

---

## Build commands

```bash
# Both packages
npm run install:all
npm run build

# Individually
npm run build:server     # server/dist
npm run build:client     # client/dist
```

---

## Option A — Single Node process (simplest)

The server can serve the built frontend. This keeps everything same-origin,
so CORS is not involved and CSP `connect-src 'self'` just works.

```bash
npm run install:all
npm run build
cd server
npm ci --omit=dev
SERVE_STATIC=../client/dist NODE_ENV=production PORT=4000 node dist/index.js
```

- `SERVE_STATIC` is resolved relative to the server's working directory.
- SPA fallback is built in: `GET /events/abc` returns `index.html`; API paths
  are never shadowed by the fallback.
- `GET /` serves the app (not the JSON info banner) whenever `SERVE_STATIC` is
  set.

---

## Option B — Vercel

The repository is a single Vercel project. Everything needed is committed:

- **`vercel.json`** (root) — installs both packages, builds the client and the
  API, publishes `client/dist`, and rewrites non-API paths to
  `index.html` so deep links work.
- **`api/[...path].ts`** (root) — a catch-all function that wraps the same
  Express app the local dev server runs (`server/dist/app.js`), so `/api/*`
  routes behave identically in production.

### Deploy from GitHub
1. Push the repository to GitHub.
2. In Vercel: **Add New → Project → Import** the repository (or run
   `vercel link` then `vercel git connect <repo-url>`).
3. Deploy. No environment variables are required: without
   `GEMINI_API_KEY` the API runs the built-in local engine and every response
   is tagged `source: "local"`.

### Optional environment variables
- `GEMINI_API_KEY` — upgrades AI responses to Gemini-authored output (the UI
  then labels results "AI generated").
- `GEMINI_MODEL` — defaults to `gemini-flash-latest`.
- `AI_RATE_LIMIT_MAX` / `AI_RATE_LIMIT_WINDOW_MS` — per-instance rate limits.
- `CLIENT_ORIGIN` — only needed for split-origin hosting; same-origin deploys
  don't need it.

> Split hosting (static client + API on different domains) still works:
> build the client with `VITE_API_BASE_URL` set to the API origin and set
> `CLIENT_ORIGIN` on the server to the client origin. The single-project
> setup above needs neither.

---

## Option C — Render / Railway / Fly.io / any Node host

- **Build command:** `npm run install:all && npm run build`
- **Start command:** `npm --prefix server start` (or
  `node server/dist/index.js` with the server as the working directory)
- **Health check path:** `/api/health`
- Set `GEMINI_API_KEY`, `CLIENT_ORIGIN=https://your-frontend-origin`, and
  `SERVE_STATIC=client/dist` if you want one process to serve both.

These platforms inject `PORT`; no config change is needed.

---

## Docker

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm run install:all && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/client/dist ./client/dist
RUN cd server && npm ci --omit=dev
EXPOSE 4000
CMD ["sh", "-c", "cd server && SERVE_STATIC=../client/dist node dist/index.js"]
```

```bash
docker build -t eventra-ai .
docker run -p 4000:4000 --env-file server/.env eventra-ai
```

---

## Post-deploy checklist

1. `GET /api/health` returns `200` and `"ai": { "configured": true }` with
   `"planning": { "mode": "ai" }` when a key is set (`configured: false` with
   `"planning": { "mode": "local" }` when it is not — keyless requests are then
   served by the built-in template engine with `source: "local"`; both are
   expected, honest states).
2. `POST /api/ai/generate-plan` with a valid event returns a plan; with an
   invalid body it returns `400 VALIDATION_ERROR` with field paths.
3. Deep link to an event route (e.g. `/events/abc`) returns the SPA, not a 404.
4. CORS: a request from an origin not in `CLIENT_ORIGIN` receives no
   `Access-Control-Allow-Origin` header.
5. Errors return `{ "error": { "code", "message" } }` with no stack traces.

---

## Operational notes

- **Statelessness** — the API holds no user data; all planning state lives in
  each user's browser. You can scale the API horizontally with no coordination.
- **Rate limits** — the in-memory limiter is per-instance. Behind a load
  balancer or on serverless, either accept per-instance limits or swap in a
  shared store (the limiter is isolated in `server/src/middleware/rateLimit.ts`).
- **Timeouts** — `AI_REQUEST_TIMEOUT_MS` bounds Gemini calls so a slow response
  fails the request instead of hanging it.
- **Graceful shutdown** — the listener handles `SIGINT`/`SIGTERM` and stops
  accepting connections before exiting.
