# Security Model

This document describes the security posture of Eventra AI: what is protected,
how, and what a deployer should configure.

---

## Threat model summary

| Asset | Threat | Control |
| --- | --- | --- |
| `GEMINI_API_KEY` | Exposure → cost abuse, key theft | Server-side only; never in client bundles; `.env` git-ignored; never in error responses. |
| User planning data | Cross-user leakage | Data lives in each user's browser `localStorage`; the API is stateless and stores nothing per user. |
| API availability | Abuse / cost exhaustion | Per-IP rate limiting on AI routes, request timeouts, body size limits. |
| Browser sessions | Injection, clickjacking, XSS | Strict CSP, no `dangerouslySetInnerHTML`, Helmet headers, framing denied. |
| Third-party origins | Unauthorized API use | CORS allow-list; disallowed origins receive no `Access-Control-Allow-Origin`. |
| Secrets in git | Repo leakage | `.env` ignored; `.env.example` holds placeholders only. |

---

## Secrets

- The Gemini key is read only in the server process
  (`server/src/config.ts`). It is never returned by any endpoint and never
  included in error payloads.
- The client has **no** secret environment variables. Anything prefixed
  `VITE_` is inlined into public JavaScript by Vite, so no such variable ever
  carries a credential. `VITE_API_BASE_URL` is a public URL by design.
- `.gitignore` excludes `.env`, `.env.local`, `.env.*.local` at every level.
  `.env.example` contains empty placeholders and documentation only.
- Rotate the key immediately if it is ever committed: revoke it in Google AI
  Studio and issue a new one.

---

## Transport & headers (Helmet)

Applied to every response:

- **Content Security Policy** — `default-src 'self'`; scripts from `'self'`
  only (no inline or third-party script execution); styles `'self'` +
  `'unsafe-inline'` (required by the inline theme-preview styles); images
  `'self'` and `data:`; `object-src 'none'`; `frame-ancestors 'none'`;
  `base-uri 'self'`; `form-action 'self'`; `connect-src 'self'`.
- **HSTS** — `max-age=31536000; includeSubDomains`.
- **X-Frame-Options / frame-ancestors** — clickjacking denied.
- **X-Content-Type-Options: nosniff** — MIME sniffing disabled.
- **Referrer-Policy: no-referrer** — no referrer leakage.
- **X-Permitted-Cross-Domain-Policies, X-Download-Options,
  X-DNS-Prefetch-Control** — hardened defaults.
- `X-Powered-By` is disabled; `app.disable('x-powered-by')`.
- `trust proxy` is set to `1` so rate limiting and HTTPS detection work behind
  one layer of proxy (load balancer / reverse proxy). If you sit behind more
  than one, adjust `app.set('trust proxy', ...)` accordingly.

---

## CORS

Strict allow-list, not a wildcard:

```ts
cors({
  origin: config.clientOrigins,   // from CLIENT_ORIGIN env (comma-separated)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
})
```

- Origins come from `CLIENT_ORIGIN`. In production set it to your exact
  frontend origin(s), e.g. `https://yourapp.vercel.app`.
- `credentials: false` — no cookies or ambient auth are used, so credentialed
  cross-origin requests are not possible.
- Allowed methods and headers are pinned to what the API needs.
- A disallowed origin receives no `Access-Control-Allow-Origin` header, so
  browsers block the response. (CORS is a browser control; non-browser clients
  are governed by the other controls here, not by CORS.)

---

## Input validation

- Every request body is parsed with **Zod** before any processing. Invalid
  input returns `400 VALIDATION_ERROR` with a machine-readable `code`, a human
  message and per-field `details` (`path` + `message`).
- String lengths, array sizes, numeric ranges and date formats are all bounded
  by schemas, limiting memory and prompt-injection surface.
- Unknown fields are stripped by Zod's default object behaviour.

---

## AI-specific hardening

- **Response validation** — every Gemini response is parsed with Zod before
  use. Derived numbers (percentages, totals, over-budget flags) are recomputed
  server-side and never trusted from the model.
- **Prompt construction** — user text is passed as clearly delimited data
  inside a system instruction that defines the task, the JSON shape, and an
  instruction to state assumptions rather than invent facts. This reduces (but
  does not eliminate) prompt-injection risk; the model has no tools, no
  credentials and no ability to mutate user data, so impact is bounded.
- **No fabricated real-world data** — the product prompt forbids inventing
  vendor identities, prices, availability or ratings; outputs are labelled as
  estimates.
- **Timeouts** — `AI_REQUEST_TIMEOUT_MS` bounds every upstream call.
- **Rate limiting** — AI routes are limited per IP; see below.
- **Structured failure** — if the model returns invalid JSON/schema, the API
  returns `AI_INVALID_RESPONSE` rather than guessing or returning unvalidated
  content.

---

## Rate limiting

`express-rate-limit` on all AI routes:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_RATE_LIMIT_WINDOW_MS` | `60000` | Sliding window. |
| `AI_RATE_LIMIT_MAX` | `30` | Requests per window per IP. |

- Limited routes return `429` with a clear error body.
- The store is in-memory (per instance). On serverless or multi-instance
  deployments, limits are per instance unless you swap the store — the limiter
  is isolated in `server/src/middleware/rateLimit.ts` for exactly this reason.

---

## Error handling

- A single error middleware produces consistent bodies:
  `{ "error": { "code", "message", "details?" } }`.
- **No stack traces, no file paths, no upstream response bodies** are ever
  returned. Internal detail is logged server-side only.
- `NODE_ENV=production` hides verbose messages.
- Unknown API paths return `404 NOT_FOUND`; non-`/api` paths fall through to
  SPA `index.html` only when static serving is enabled, and never for API
  paths.

---

## Data privacy

- All planning data (events, expenses, tasks, vendors, plans, conversations)
  is stored **in the user's browser** via `localStorage`, behind a
  Zod-validated repository layer with schema versioning and corruption
  recovery (falls back to a clean state rather than crashing).
- The API is **stateless**: it holds no user records, no accounts and no
  database. Scaling is horizontal with no coordination.
- AI requests contain only the event details needed to answer, sent over
  HTTPS. Conversations are stored locally, not server-side.
- Clearing browser storage erases everything for that user.

---

## Client-side safety

- React escapes all interpolated values by default; the app uses **no**
  `dangerouslySetInnerHTML` and no `eval`.
- No third-party scripts, analytics, trackers or CDNs — CSP would block them
  anyway.
- User-entered values (vendor websites, contact details, notes) are rendered
  as plain text, never as raw HTML or auto-linked anchors, so they cannot
  inject markup or navigation.
- Storage reads are validated with Zod; malformed or tampered data is
  discarded safely.
- Clipboard, `window.print()` and Blob downloads are used for exports — no
  data leaves the device.

---

## Dependency & supply-chain hygiene

- Lockfiles are committed; installs are reproducible.
- Runtime dependencies are minimal and mainstream: `express`, `cors`,
  `helmet`, `express-rate-limit`, `zod`, `@google/genai`; on the client,
  React, React Router, React Hook Form, Zod and Lucide icons.
- No `postinstall` scripts from untrusted sources; no bundling of server
  secrets.

---

## Recommended deployer checklist

1. Set a real `GEMINI_API_KEY` in the server environment; keep it out of git.
2. Set `CLIENT_ORIGIN` to your exact frontend origin(s); never `*`.
3. Serve over **HTTPS** (HSTS is already sent).
4. Keep `NODE_ENV=production`.
5. Verify `GET /api/health` reports `ai.configured: true` (or `false`
   intentionally).
6. Confirm error responses contain no stack traces.
7. Confirm a disallowed origin gets no `Access-Control-Allow-Origin` header.
8. Tune `AI_RATE_LIMIT_MAX` for your expected traffic and abuse tolerance.
9. Rotate the Gemini key if exposure is ever suspected.

---

## Known limitations (documented honestly)

- **CORS is not an authorization mechanism.** Non-browser clients can call the
  API directly; the real cost/abuse controls are rate limiting, timeouts and
  the absence of any per-user data.
- **Rate limiting is per instance** in the default configuration (see above).
- **Prompt injection cannot be fully prevented** for LLM-backed features; the
  blast radius is minimized because the model has no tools, no credentials and
  no write access to user data.
- **localStorage is per-device and per-browser.** There is no cross-device
  sync and no server backup by design; users control their own data.
