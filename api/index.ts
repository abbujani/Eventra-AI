import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/dist/app.js';

// One Express instance per warm serverless invocation container.
// `createApp()` is intentionally reused: it owns the helmet/CORS/rate-limit
// middleware chain and the AI provider (which falls back to the built-in
// local engine whenever GEMINI_API_KEY is not configured).
const app = createApp();

/**
 * Vercel function: `vercel.json` rewrites `/api/(.*)` to `/api`, and the
 * original request URL is preserved, so this Express app sees exactly the same
 * paths it serves locally (`/api/health`, `/api/ai/...`). Routing and behaviour
 * are therefore identical between the dev server and the deployment.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  (app as unknown as (request: IncomingMessage, response: ServerResponse) => void)(req, res);
}
