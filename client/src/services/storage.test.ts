import { beforeEach, describe, expect, it } from 'vitest';
import { defaultState, loadState, saveState } from './storage.js';
import { makeEvent, makePlan } from '../test/fixtures.js';
import type { AppState } from '../types/index.js';

function stateWithPlan(planOverrides?: Parameters<typeof makePlan>[0]): AppState {
  const state = defaultState();
  state.events.push(makeEvent());
  state.plans.push(makePlan(planOverrides));
  return state;
}

describe('storage plan persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a local plan with its source label', () => {
    const saved = saveState(stateWithPlan({ source: 'local' }));
    expect(saved).toBe(true);

    const loaded = loadState();
    expect(loaded.plans).toHaveLength(1);
    expect(loaded.plans[0]?.source).toBe('local');
  });

  it('round-trips an ai plan with its source label', () => {
    saveState(stateWithPlan({ source: 'ai' }));

    const loaded = loadState();
    expect(loaded.plans[0]?.source).toBe('ai');
  });

  it('keeps a plan without a source as unknown (never invents provenance)', () => {
    saveState(stateWithPlan({ source: undefined }));

    const loaded = loadState();
    expect(loaded.plans).toHaveLength(1);
    expect(loaded.plans[0]?.source).toBeUndefined();
  });

  it('rejects an invalid source value instead of persisting it', () => {
    const state = stateWithPlan();
    // Simulate tampered/legacy data written directly to storage.
    const raw = JSON.parse(JSON.stringify(state)) as { plans: Array<{ source: string }> };
    raw.plans[0]!.source = 'hallucinated';
    localStorage.setItem('eventra:v1:state', JSON.stringify(raw));

    // Schema failure falls back to defaults with the bad payload backed up.
    const loaded = loadState();
    expect(loaded.plans).toHaveLength(0);
    expect(localStorage.getItem('eventra:v1:backup')).toContain('hallucinated');
  });
});
