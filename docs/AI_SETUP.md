# AI Setup

Eventra AI uses **Google Gemini** through the official, maintained
[`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK.

---

## 1. Get an API key

1. Open **Google AI Studio** → https://aistudio.google.com/apikey
2. Sign in with a Google account.
3. **Create API key** (free tier available; paid usage beyond free quotas).
4. Copy the key — it looks like `AIza...`.

Keep the key server-side only. It must never appear in client code, and no
client environment variable may be prefixed `VITE_` with this value (Vite
bundles anything starting with `VITE_` into public JavaScript).

---

## 2. Configure the server

Copy the template and fill in your key:

```bash
cp .env.example server/.env
```

```dotenv
# server/.env
GEMINI_API_KEY=AIza...your-real-key...
GEMINI_MODEL=gemini-flash-latest
AI_REQUEST_TIMEOUT_MS=30000
```

The server reads this at startup. Restart it after changes.

### Verify

```bash
curl http://localhost:4000/api/health
```

```json
{ "status": "ok", "ai": { "configured": true, "model": "gemini-flash-latest" }, "planning": { "mode": "ai" } }
```

If `"configured": false`, the key is missing or empty. The app does **not**
fail — it drops into *local mode*: `planning.mode` becomes `"local"`, all six
AI endpoints are served by a deterministic built-in template engine, and every
response is tagged `source: "local"`. The UI shows a clear "running in local
mode" notice and labels all generated content as local templates, never as
model output, while every manual planning tool keeps working.

---

## 3. Model selection

`GEMINI_MODEL` accepts any Gemini model identifier. The default,
`gemini-flash-latest`, is an alias that always tracks the latest Flash model —
a good balance of speed, cost and instruction-following for structured planning
output.

| Considerations | Guidance |
| --- | --- |
| Structured JSON plans | Flash-class models handle the response schema well; keep the default unless quality is insufficient. |
| Longer / more nuanced assistant answers | Try a Pro-class model id for `GEMINI_MODEL`. |
| Cost | Flash-class is cheaper per token; plans are validated server-side, so retries are rare. |

Pin a specific model version if you need reproducible behaviour across
deployments; the alias may change underneath you over time.

---

## 4. How each request is processed

1. **Validate** — the incoming body is parsed with a Zod schema. Malformed
   input returns `400 VALIDATION_ERROR` with per-field paths and never
   reaches Gemini.
2. **Prompt** — a system instruction tells the model exactly what to produce,
   to base every recommendation on the provided event details, and to list
   assumptions explicitly rather than inventing facts.
3. **JSON mode** — the SDK is asked for JSON output matching a documented
   shape, with a request timeout (`AI_REQUEST_TIMEOUT_MS`).
4. **Validate the response** — the model's JSON is parsed with Zod.
   Derived values (category percentages, totals, over-budget flags) are
   **recomputed on the server**, never trusted from the model.
5. **Return or fail** — a valid plan is returned. An invalid response returns
   `AI_INVALID_RESPONSE` with a clear message. There is no silent fallback to
   a canned plan.

---

## 5. AI features and their endpoints

| Feature | Endpoint | What it returns |
| --- | --- | --- |
| Full event plan | `POST /api/ai/generate-plan` | Theme, budget breakdown (validated + recomputed), timeline, vendor checklist, menu ideas, risks, next actions. |
| Assistant chat | `POST /api/ai/chat` | A conversational reply grounded in the event, optional plan summary and message history. |
| Menu planner | `POST /api/ai/generate-menu` | Meal segments, items with dietary kinds, allergy warning, budget notes. |
| Invitation copy | `POST /api/ai/generate-invitation` | Invitation text for a chosen tone, language and channel. |
| Task suggestions | `POST /api/ai/suggest-tasks` | Preparation tasks with priority and relative deadlines. |
| Budget advice | `POST /api/ai/improve-budget` | Saving tips and rebalancing suggestions. |

The assistant **never mutates saved data**. Any change it proposes is explained
in conversation and applied only when the user confirms in the UI.

---

## 6. Honesty guarantees

Eventra AI deliberately refuses to fabricate real-world facts:

- The **vendor checklist** contains evaluation criteria and preparation tasks
  per category — never vendor names, prices, ratings or availability. The
  vendor workspace stores vendors the user researched themselves.
- **Budget, menu and timeline outputs are labelled as AI-generated estimates**,
  not verified quotes, throughout the UI and in exported reports.
- **Local mode is labelled as local.** When no key is configured, output comes
  from deterministic templates and static planning ratios — not a model — and
  is tagged `source: "local"` and shown in the UI as "local template" output.
  It is never dressed up as an AI response.

---

## 7. Cost and safety controls

- **Rate limiting** — AI routes are limited per IP
  (`AI_RATE_LIMIT_WINDOW_MS` / `AI_RATE_LIMIT_MAX`), bounding cost exposure
  from abuse.
- **Timeouts** — every call has a deadline; slow responses fail fast instead of
  piling up.
- **Body limits** — request bodies are capped (`BODY_LIMIT`) before parsing.
- **No key in errors** — error responses never include the key or upstream
  response internals.

---

## 8. Local mode without a key

You do **not** need a key to run the app or the test suite — the product is
fully usable keyless:

- **Local planning engine.** When `GEMINI_API_KEY` is absent, all six AI
  endpoints fall back to a deterministic built-in engine
  (`server/src/services/local/`). Plans, menus, invitations, task suggestions,
  budget advice and assistant replies are assembled from curated event-type
  templates, your own event details and transparent budget ratios (categories
  total 90%, contingency 10%). Output is validated against the same Zod
  schemas as the AI path, so the shapes are identical — only the label differs.
- **Honest labelling.** Every keyless response carries `source: "local"`,
  health reports `planning.mode: "local"`, and the UI shows a "Running in
  local mode" notice with local-template labels. Nothing generated this way is
  presented as AI output. No prices, vendor names or availability are
  invented — monetary figures are computed purely from your declared budget.
- **Manual tools.** Budget, timeline, tasks, vendors, theme and report all
  work fully offline regardless of mode.
- **Tests.** The server suite (50 tests) injects a **mock AI provider** via
  `createApp({ provider })`, and a dedicated local-fallback suite exercises
  the keyless paths, so no paid API key is needed to run `npm test`.
