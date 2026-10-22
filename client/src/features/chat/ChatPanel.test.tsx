import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from './ChatPanel.js';
import { renderWithProviders } from '../../test/render.js';
import { makeEvent, seedState } from '../../test/fixtures.js';
import { ApiError, api } from '../../services/api.js';

// Pin AI status so the panel is interactive without a live health check.
vi.mock('../../hooks/useAiStatus.js', () => ({
  useAiStatus: () => ({ state: 'local' as const }),
  refreshAiStatus: () => {},
}));

// Keep ApiError real (instanceof checks must work) but control api.chat.
vi.mock('../../services/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api.js')>();
  return { ...actual, api: { ...actual.api, chat: vi.fn() } };
});

describe('ChatPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.chat).mockReset();
  });

  it('renders a successful assistant reply', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
    });
    vi.mocked(api.chat).mockResolvedValue({ reply: 'Cut catering by 12% with a set menu.' });

    const user = userEvent.setup();
    renderWithProviders(<ChatPanel eventId="evt_1" />);

    await user.type(screen.getByLabelText('Message the planning assistant'), 'How do I cut costs?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Cut catering by 12% with a set menu.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('surfaces an ApiError message and does not duplicate the user message', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
    });
    vi.mocked(api.chat).mockRejectedValue(
      new ApiError('upstream_error', 'The assistant is overloaded right now.', 502),
    );

    const user = userEvent.setup();
    renderWithProviders(<ChatPanel eventId="evt_1" />);

    const message = 'How do I cut costs?';
    await user.type(screen.getByLabelText('Message the planning assistant'), message);
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The assistant is overloaded right now.',
    );
    // Regression: a failed request used to re-dispatch the user message,
    // rendering it twice in the transcript.
    expect(screen.getAllByText(message)).toHaveLength(1);
    // The input is cleared but the transcript keeps the message — retrying
    // means typing again, not losing history.
    expect(screen.getByLabelText('Message the planning assistant')).toHaveValue('');
  });

  it('falls back to a generic message for unexpected errors', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
    });
    vi.mocked(api.chat).mockRejectedValue(new Error('network down'));

    const user = userEvent.setup();
    renderWithProviders(<ChatPanel eventId="evt_1" />);

    await user.type(screen.getByLabelText('Message the planning assistant'), 'Hello?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The assistant could not respond. Please try again.',
    );
    expect(screen.getAllByText('Hello?')).toHaveLength(1);
  });
});
