import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/dist/app.js';

// One Express instance per warm serverless invocation container.
// `createApp()` is intentionally reused: it owns the helmet/CORS/rate-limit
// middleware chain and the AI provider (which falls back to the built-in
// local engine whenever GEMINI_API_KEY is not configured).
const app = createApp();

/**
 * Vercel catch-all function: every `/api/*` request is handled by the same
 * Express app that `server/src/index.ts` mounts locally, so routing and
 * behaviour are identical between the dev server and the deployment.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  (app as unknown as (request: IncomingMessage, response: ServerResponse) => void)(req, res);
}
