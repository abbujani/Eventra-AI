/**
 * Centralised, validated environment configuration.
 *
 * Secrets are read from the environment only. Nothing here is exposed to the
 * browser and nothing is persisted to disk.
 */

export interface AppConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  geminiApiKey: string;
  geminiModel: string;
  clientOrigins: string[];
  aiTimeoutMs: number;
  aiRateLimitWindowMs: number;
  aiRateLimitMax: number;
  bodyLimit: string;
  serveStatic: string;
}

function readString(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return raw.trim();
}

function readNumber(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = readString(env, 'NODE_ENV', 'development');
  const originRaw = readString(env, 'CLIENT_ORIGIN', 'http://localhost:5173');
  const clientOrigins = originRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    port: readNumber(env, 'PORT', 4000),
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv !== 'production',
    geminiApiKey: readString(env, 'GEMINI_API_KEY', ''),
    geminiModel: readString(env, 'GEMINI_MODEL', 'gemini-flash-latest'),
    clientOrigins,
    aiTimeoutMs: readNumber(env, 'AI_REQUEST_TIMEOUT_MS', 30000),
    aiRateLimitWindowMs: readNumber(env, 'AI_RATE_LIMIT_WINDOW_MS', 60000),
    aiRateLimitMax: readNumber(env, 'AI_RATE_LIMIT_MAX', 30),
    bodyLimit: readString(env, 'BODY_LIMIT', '1mb'),
    serveStatic: readString(env, 'SERVE_STATIC', ''),
  };
}

export const config = loadConfig();
