import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetPanel } from './BudgetPanel.js';
import { renderWithProviders } from '../../test/render.js';
import { makeEvent, makeExpense, seedState } from '../../test/fixtures.js';

describe('BudgetPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds an expense through the modal', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
    });
    const user = userEvent.setup();
    renderWithProviders(<BudgetPanel eventId="evt_1" />);

    // Header and empty-state both offer "Add expense" — click the first.
    const [openButton] = screen.getAllByRole('button', { name: 'Add expense' });
    await user.click(openButton!);

    const dialog = await screen.findByRole('dialog', { name: 'Add expense' });
    await user.type(within(dialog).getByLabelText(/Item name/i), 'Decorations');
    await user.type(within(dialog).getByLabelText(/Estimated amount/i), '12000');
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));

    expect(await screen.findByText('Decorations')).toBeInTheDocument();
    // The recorded amount shows in the expense row (formatted INR).
    expect(screen.getAllByText(/₹12,000/).length).toBeGreaterThan(0);
  });

  it('rejects an empty title instead of saving a nameless expense', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
    });
    const user = userEvent.setup();
    renderWithProviders(<BudgetPanel eventId="evt_1" />);

    const [openButton] = screen.getAllByRole('button', { name: 'Add expense' });
    await user.click(openButton!);

    const dialog = await screen.findByRole('dialog', { name: 'Add expense' });
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Enter a title for this expense.',
    );
  });

  it('edits an existing expense', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
      state.expenses.push(makeExpense());
    });
    const user = userEvent.setup();
    renderWithProviders(<BudgetPanel eventId="evt_1" />);

    await user.click(screen.getByRole('button', { name: 'Edit Hall booking' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit expense' });

    const titleInput = within(dialog).getByLabelText(/Item name/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Renovated hall booking');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Renovated hall booking')).toBeInTheDocument();
    expect(screen.queryByText('Hall booking')).not.toBeInTheDocument();
  });

  it('deletes an expense after confirmation', async () => {
    seedState((state) => {
      state.events.push(makeEvent());
      state.expenses.push(makeExpense());
    });
    const user = userEvent.setup();
    renderWithProviders(<BudgetPanel eventId="evt_1" />);

    await user.click(screen.getByRole('button', { name: 'Delete Hall booking' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete expense' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No expenses recorded yet')).toBeInTheDocument();
    expect(screen.queryByText('Hall booking')).not.toBeInTheDocument();
  });

  it('shows an over-budget alert when actual spend exceeds the budget', () => {
    seedState((state) => {
      state.events.push(makeEvent({ totalBudget: 10000 }));
      state.expenses.push(makeExpense({ estimatedAmount: 5000, actualAmount: 15000 }));
    });
    renderWithProviders(<BudgetPanel eventId="evt_1" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Over budget.');
    expect(alert).toHaveTextContent('5,000');
  });

  it('does not show the over-budget alert while spend is within budget', () => {
    seedState((state) => {
      state.events.push(makeEvent({ totalBudget: 100000 }));
      state.expenses.push(makeExpense({ estimatedAmount: 5000, actualAmount: 5000 }));
    });
    renderWithProviders(<BudgetPanel eventId="evt_1" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
