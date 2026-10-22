import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TasksPanel } from './TasksPanel.js';
import { renderWithProviders } from '../../test/render.js';
import { makeEvent, makeTask, seedState } from '../../test/fixtures.js';

describe('TasksPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a task through the modal', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
    });
    const user = userEvent.setup();
    renderWithProviders(<TasksPanel eventId="evt_1" />);

    // Header and empty-state both offer "Add task" — click the first.
    const [openButton] = screen.getAllByRole('button', { name: 'Add task' });
    await user.click(openButton!);

    const dialog = await screen.findByRole('dialog', { name: 'Add task' });
    await user.type(within(dialog).getByLabelText(/Title/i), 'Confirm catering headcount');
    await user.click(within(dialog).getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Confirm catering headcount')).toBeInTheDocument();
  });

  it('requires a task title before saving', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
    });
    const user = userEvent.setup();
    renderWithProviders(<TasksPanel eventId="evt_1" />);

    const [openButton] = screen.getAllByRole('button', { name: 'Add task' });
    await user.click(openButton!);

    const dialog = await screen.findByRole('dialog', { name: 'Add task' });
    await user.click(within(dialog).getByRole('button', { name: 'Add task' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Enter a task title.');
  });

  it('toggles a task complete and back', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
      state.tasks.push(makeTask({ title: 'Book venue' }));
    });
    const user = userEvent.setup();
    renderWithProviders(<TasksPanel eventId="evt_1" />);

    const checkbox = screen.getByRole('checkbox', { name: /Book venue/ });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(screen.getByRole('checkbox', { name: /Book venue/ })).toBeChecked();

    // Completed tasks appear under the "completed" filter, not "pending".
    await user.click(screen.getByRole('button', { name: 'pending' }));
    expect(screen.queryByText('Book venue')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'completed' }));
    expect(screen.getByText('Book venue')).toBeInTheDocument();
  });

  it('keeps the task record when marked complete (no delete side effect)', async () => {
    const state = seedState((s) => {
      s.events.push(makeEvent());
      s.tasks.push(makeTask({ title: 'Send invitations' }));
    });
    expect(state.tasks).toHaveLength(1);

    const user = userEvent.setup();
    renderWithProviders(<TasksPanel eventId="evt_1" />);
    await user.click(screen.getByRole('checkbox', { name: /Send invitations/ }));

    // State now holds a completed task — persisted on the next storage write.
    expect(screen.getByRole('checkbox', { name: /Send invitations/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'all' })).toHaveAttribute('aria-pressed', 'true');
  });
});
