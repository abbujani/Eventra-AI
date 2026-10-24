import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

export type AiStatus =
  | { state: 'loading' }
  | { state: 'ready'; model: string }
  | { state: 'local' }
  | { state: 'unconfigured' }
  | { state: 'unreachable'; message: string };

/** Module-level cache so the health check runs once per app session. */
let cached: AiStatus | null = null;
const listeners = new Set<(status: AiStatus) => void>();
let inFlight: Promise<void> | null = null;

function notify() {
  if (!cached) return;
  for (const listener of listeners) {
    listener(cached);
  }
}

async function load() {
  if (cached && cached.state !== 'loading') return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const response = await api.health();
      if (response.ai.configured) {
        cached = { state: 'ready', model: response.ai.model };
      } else if (response.planning?.mode === 'local') {
        // No API key, but the server exposes its built-in local planning engine.
        cached = { state: 'local' };
      } else {
        cached = { state: 'unconfigured' };
      }
    } catch (error) {
      cached = {
        state: 'unreachable',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      inFlight = null;
      notify();
    }
  })();
  return inFlight;
}

/**
 * Re-runs the health check. A failed check is otherwise cached for the whole
 * session, which would permanently lock the AI panels behind an error state
 * even after the server comes back.
 */
export function refreshAiStatus(): void {
  cached = { state: 'loading' };
  notify();
  void load();
}

export function useAiStatus(): AiStatus {
  const [status, setStatus] = useState<AiStatus>(cached ?? { state: 'loading' });

  useEffect(() => {
    listeners.add(setStatus);
    if (cached) setStatus(cached);
    void load();
    return () => {
      listeners.delete(setStatus);
    };
  }, []);

  return status;
}
