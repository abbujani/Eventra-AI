# Eventra AI

> **Every Celebration, Intelligently Planned.**

Eventra AI is a full-stack, GenAI-powered event and celebration planning
application. Describe your event once and get a structured plan — theme,
realistic budget breakdown, run-of-show timeline, vendor checklist, menu ideas
and risk mitigations — then manage every detail in a focused workspace.

Built for the **Hack2Skill PromptWars Challenge 5** with Google Gemini.

**Live demo:** <https://abbujani.github.io/Eventra-AI/> — hosted on GitHub
Pages straight from `main`. That build runs the same deterministic planning
engine **entirely in your browser**, so every feature works with no server, no
API key and no data leaving the device.

**API deployment (optional):** <https://eventra-ai-cyan.vercel.app> — same app
on Vercel with the Express API, keyless local mode by default.

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [How the AI works](#how-the-ai-works)
- [Honest AI behaviour](#honest-ai-behaviour)
- [Architecture](#architecture)
- [Testing](#testing)
- [Security](#security)
- [Deployment](#deployment)
- [Project structure](#project-structure)

---

## What it does

### Landing page
Product overview, feature highlights, how-it-works steps, privacy section and
clear calls to action. No fake testimonials, logos or customer counts.

### Dashboard
Every event at a glance with status, progress and next deadlines. Create,
open and delete events.

### 6-step event wizard
1. **Event type** — wedding, engagement, birthday, anniversary, baby shower,
   festival, community, corporate or other.
2. **Details** — title, start/end dates, timezone, location, guest count,
   venue preference.
3. **Budget** — total budget, currency, flexibility and category priorities.
4. **Style & preferences** — colour palette, dietary preferences, must-have
   activities, things to avoid.
5. **Priorities** — planning priorities and free-form notes.
6. **Review & create** — full summary before saving.

Each step is validated with Zod before you can continue; errors are announced
to assistive technology and focus moves to the first invalid field.

### Event workspace
Once an event is created you get eleven focused sections:

| Section | What it does |
| --- | --- |
| **Overview** | Key metrics, checklist progress, budget utilisation, upcoming deadlines, day-of timeline. |
| **AI Plan** | Generate a full structured plan, review every section, then apply it to your workspace. |
| **Budget** | Expense records with estimated vs. actual, category donut/bar charts (accessible data tables included), utilisation bar, over-budget warnings, CSV export. |
| **Timeline** | Run-of-show items grouped by day, automatic conflict detection, timezone-aware display. |
| **Tasks** | Checklist with priority, category and due dates; overdue warnings; AI task suggestions you confirm before adding. |
| **Vendors** | Your own researched vendors with quotes, statuses and follow-up dates. Grouped by category. |
| **Menu** | AI menu planner with meal segments, dietary notes, allergy warnings and budget guidance. Copy to clipboard. |
| **Invitations** | AI invitation copy for cards, WhatsApp, email or social posts — tone, language and channel aware. |
| **Theme** | Event style and colour palette editor with live preview, deterministic palette ideas and decoration prompts. |
| **Report** | Printable/exportable summary of budget, timeline, checklist, vendors and plan. Print to PDF or export JSON. |
| **Assistant** | Context-aware chat over your event, budget and plan. Suggests changes; never mutates your data on its own. |

### Data & privacy
All planning data lives in your browser's `localStorage` behind a Zod-validated
repository layer with schema versioning. Nothing is sent to a server except the
AI requests you explicitly trigger, and those contain only the event details
needed to answer.

---

## Tech stack

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7,
React Hook Form, Zod, Lucide icons, custom SVG charts (accessible), Vitest +
React Testing Library.

**Backend** — Node.js 20+, Express 5, TypeScript (ESM), Zod, Helmet,
express-rate-limit, `@google/genai` (official Google GenAI SDK), Vitest +
Supertest.

**AI** — Google Gemini via the maintained official SDK. Default model
`gemini-flash-latest` (configurable). Structured output is validated with Zod;
invalid generations fail loudly rather than being silently coerced.

---

## Getting started

### Prerequisites
- Node.js **20 or newer** (tested on Node 24)
- npm 11+
- A Google AI Studio API key for AI features — **optional**. Without one, the
  app runs in *local mode*: every AI feature is served by a deterministic,
  built-in template engine and clearly labelled as a local template (tagged
  `source: "local"`), never passed off as model output.

### Install

```bash
git clone <your-repo-url> eventra-ai
cd eventra-ai
npm run install:all
```

### Configure

```bash
cp .env.example server/.env
```

Edit `server/.env` and set at minimum:

```dotenv
GEMINI_API_KEY=your-real-key-here
```

See [docs/AI_SETUP.md](docs/AI_SETUP.md) for model selection and tuning.

Optionally create `client/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:4000
```

If unset, the client calls the API on its own origin (`/api`), which is correct
for same-origin deployments.

### Run in development

```bash
# Terminal 1 — API on :4000
npm run dev:server

# Terminal 2 — frontend on :5173 (proxies /api to :4000)
npm run dev:client
```

Open http://localhost:5173.

### Production build & start

```bash
npm run build          # builds server -> server/dist, client -> client/dist
SERVE_STATIC=client/dist npm start   # one process serving API + SPA
```

With `SERVE_STATIC` set, the Express process serves the built frontend with
SPA fallback (client routes like `/events/abc` resolve to `index.html`).
Without it, the process is API-only and `GET /` returns service metadata.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel, Render, Railway and
Docker guidance.

---

## How the AI works

Every AI call follows the same disciplined pipeline:

1. **Validate the request** — Zod schemas reject malformed input before any AI
   call (400 with field-level paths).
2. **Build a grounded prompt** — the model receives your real event details and
   an explicit instruction to return JSON matching a documented schema, with
   instructions to mark anything it cannot know as an assumption.
3. **Call Gemini** with a response schema (JSON mode) and a request timeout.
4. **Validate the response** — the AI's JSON is parsed with Zod. Computed
   fields (category percentages, budget totals, over-budget flags) are
   **recomputed on the server**, never trusted from the model.
5. **Return or fail** — valid plans are returned; invalid ones return a clear
   `AI_INVALID_RESPONSE` error instead of silently guessing.

**No fake AI.** No response is ever presented as AI-authored unless a model
actually produced it. When `GEMINI_API_KEY` is absent, the six AI endpoints are
served by a deterministic built-in planning engine (event-type templates, your
own numbers, transparent budget ratios) and every response is tagged
`source: "local"`. The UI labels this "local template" mode prominently, and
`GET /api/health` reports `planning.mode: "local"` — so the app is fully usable
keyless while staying completely honest about what produced the output.

**Static hosting parity.** The GitHub Pages build has no Express server, so the
same engine is compiled into the client (`client/src/engine/`, ported from
`server/src/services/local/`). It is loaded lazily and only when
`VITE_LOCAL_ONLY=true`; API deployments keep using the server path unchanged.
Both paths validate with the same Zod schemas and tag output `source: "local"`.

---

## Honest AI behaviour

Eventra AI will not fabricate facts about the real world:

- **No invented vendors.** The vendor checklist gives *evaluation criteria and
  preparation tasks* per category — never vendor names, prices, ratings or
  availability. The vendor workspace stores vendors **you** research.
- **Estimates are labelled.** Budget figures, menu items and timelines are
  described as AI-generated estimates, not verified quotes.
- **No unsolicited mutations.** The assistant explains suggestions and waits
  for your confirmation before anything is applied.
- **No fake social proof.** The landing page contains no invented customers,
  ratings, press logos or statistics.

---

## Architecture

```
client/                         server/
├── public/                     ├── src/
├── src/                        │   ├── config.ts
│   ├── components/             │   ├── app.ts          (createApp DI)
│   │   ├── ui/                 │   ├── index.ts        (listener)
│   │   ├── layout/             │   ├── routes/         (health, ai)
│   │   └── charts/             │   ├── middleware/     (errors, rate limit)
│   ├── features/               │   ├── schemas/        (Zod requests)
│   │   ├── budget/             │   ├── services/ai/    (Gemini providers)
│   │   ├── timeline/           │   └── utils/
│   │   ├── tasks/              └── tests/
│   │   ├── vendors/
│   │   ├── plan/               ├── vitest.config.ts
│   │   ├── menu/               └── tsconfig.json
│   │   ├── invitations/
│   │   ├── theme/              client has no VITE_-prefixed secrets —
│   │   ├── report/             the Gemini key never reaches the browser.
│   │   ├── chat/
│   │   └── overview/
│   ├── hooks/
│   ├── lib/                    Root
│   ├── pages/                  ├── package.json      (orchestration scripts)
│   ├── services/               ├── .env.example
│   ├── store/                  └── docs/
│   └── types/
└── vite.config.ts
```

**Key decisions**

- **Server-side key** — the Gemini key lives only in `server/.env`. The client
  has no `VITE_`-prefixed secret.
- **Dependency injection** — `createApp({ provider })` and
  `createAiRouter(provider)` let tests exercise every route with a mock AI
  provider; no paid key is needed for the test suite.
- **Repository abstraction** — storage is accessed through
  `services/storage.ts`, which validates and version-migrates on read. Swapping
  to IndexedDB or a sync API means changing one module.
- **No `@hookform/resolvers`** — the wizard uses React Hook Form plus manual
  `safeParse`/`setError`, because Zod 4 exposes `error.issues` while the v3
  resolver expects `error.errors`. Validation is explicit and fully typed.
- **Accessible charts** — donut/bar charts are custom SVG with hidden
  `<table>` data, so screen readers get the numbers.

---

## Testing

No paid API key is required — the AI provider is mocked in all tests.

```bash
npm test                # server + client
npm run test:server     # 68 tests
npm run test:client     # 104 tests
npm run typecheck       # both packages
```

**Server (68 tests)** — request validation, budget math (percentages,
over-budget, zero budgets), health endpoint with configured/unconfigured
provider, all six AI routes with a mock provider (success + schema + error
paths), the keyless local-template fallback (schema parity with the AI path,
budget-split math, `source: "local"` tagging, `planning.mode` in health),
Gemini provider error mapping (quota, credentials, safety, malformed
responses), rate limiting behaviour.

**Client (104 tests)** — budget summary math, chart data, date helpers
(including DST-safe timezone combination), timeline overlap detection
(including back-to-back vs. true conflicts), reducer actions and cascades,
wizard step validation, accessible tab keyboard navigation, dashboard
rendering (single-CTA, per-currency aggregation that never sums across
currencies, upcoming-events filtering), budget panel CRUD + over-budget
alert, tasks add/complete, chat error handling (a failed request never
duplicates the user's message), plan apply idempotency (re-apply skips
duplicates, currency mismatch blocks), storage provenance round-trips
(`source` preserved; invalid values rejected rather than persisted), and the
in-browser engine used by the static build (plan totals stay inside the
declared budget, menu/invitation/task/advice shapes, chat grounding, empty
input rejection).

---

## Security

- **Secrets** — Gemini key is server-side only; `.env` is git-ignored;
  `.env.example` contains placeholders only.
- **Headers** — Helmet with a restrictive Content Security Policy (no
  third-party scripts, no framing, `data:` images only), HSTS, referrer and
  frame protections.
- **CORS** — allow-list of origins from `CLIENT_ORIGIN`. Disallowed origins
  receive no `Access-Control-Allow-Origin` header.
- **Rate limiting** — per-IP limits on expensive AI endpoints, tunable via env.
- **Validation** — every request body is Zod-validated; every AI response is
  Zod-validated before use.
- **No stack traces** — production errors return `{ error: { code, message } }`
  with no internals leaked.
- **Body limits** — configurable request body cap (default 1 MB).

See [docs/SECURITY.md](docs/SECURITY.md) for the full model.

---

## Deployment

**Primary: GitHub Pages (fully static, no server).** Every push to `main` runs
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml),
which builds the client with `VITE_LOCAL_ONLY=true` and publishes
`https://abbujani.github.io/Eventra-AI/`. In that build the planning engine
(`client/src/engine/`) runs in the browser, so there is nothing to host except
static files — and still no API key required.

Works anywhere Node runs for the full-stack path. Configs and instructions for
Vercel (serverless functions + static client), Render, Railway, Fly.io and
Docker are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Quick summary:

- **GitHub Pages (primary)** — enable Pages with source *GitHub Actions* (the
  workflow does this on first run), then push to `main`. Build command:
  `VITE_BASE_PATH=/Eventra-AI/ VITE_LOCAL_ONLY=true npm --prefix client run build:pages`.
- **Vercel (single project)** — import the repo; `vercel.json` builds both
  packages and `api/index.ts` serves the API. No env vars required (keyless
  local mode by default).
- **Client only** — `npm run build:client`, deploy `client/dist` as a static
  site. For split-origin hosting only, set `VITE_API_BASE_URL` to your API
  origin at build time.
- **Server** — `npm run build:server`, start `server/dist/index.js`; optionally
  set `GEMINI_API_KEY` and `CLIENT_ORIGIN` in the host's environment variables.

---

## Project structure

```
.
├── .github/workflows/       GitHub Pages deployment (push to main)
├── client/                  React + Vite + Tailwind SPA
│   └── src/engine/          In-browser planning engine (static build)
├── server/                  Express + GenAI API
│   └── src/services/local/  Deterministic local engine (API fallback)
├── docs/                    Deployment, AI setup, security
├── .env.example             Documented environment template (placeholders only)
├── package.json             Root orchestration scripts
└── README.md
```

---

## Available scripts (root)

| Script | Purpose |
| --- | --- |
| `npm run install:all` | Install server and client dependencies |
| `npm run dev:server` | API in watch mode on :4000 |
| `npm run dev:client` | Frontend dev server on :5173 |
| `npm run build` | Build both packages |
| `npm start` | Run the built API (add `SERVE_STATIC=client/dist` to also serve the SPA) |
| `npm test` | Run all tests (server then client) |
| `npm run typecheck` | Type-check both packages |

---

## Licence

MIT. Generated content (plans, menus, invitations) is AI-generated and should
be reviewed before use.
