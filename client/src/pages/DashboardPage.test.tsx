import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from './DashboardPage.js';
import { renderWithProviders } from '../test/render.js';
import { makeEvent, makeExpense, seedState } from '../test/fixtures.js';

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the welcome header when there are no events', () => {
    renderWithProviders(<DashboardPage />, '/dashboard');
    expect(screen.getByRole('heading', { name: 'Welcome to Eventra AI' })).toBeInTheDocument();
    expect(screen.getByText('Your personalised planning dashboard.')).toBeInTheDocument();
  });

  it('guides the user to create a first event with a single CTA', () => {
    renderWithProviders(<DashboardPage />, '/dashboard');
    expect(screen.getByText('No events yet')).toBeInTheDocument();
    // Exactly one create link — the header CTA (the empty state previously
    // duplicated it, giving two identical buttons on screen).
    const createLinks = screen.getAllByRole('link', { name: /Create New Event|Create your first event/i });
    expect(createLinks).toHaveLength(1);
    expect(createLinks[0]).toHaveAttribute('href', '/events/new');
  });

  it('offers a New Event action in the header', () => {
    renderWithProviders(<DashboardPage />, '/dashboard');
    expect(screen.getByRole('link', { name: /Create New Event/i })).toHaveAttribute(
      'href',
      '/events/new',
    );
  });

  it('does not throw when the AI health check is unreachable', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />, '/dashboard');
    // The dashboard must render fully offline — AI status is not required.
    expect(screen.getByRole('heading', { name: 'Welcome to Eventra AI' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Create New Event/i }));
  });

  it('never sums totals across currencies', () => {
    seedState((state) => {
      state.events.push(makeEvent({ id: 'evt_1', title: 'INR Event', totalBudget: 100000, currency: 'INR' }));
      state.events.push(
        makeEvent({ id: 'evt_2', title: 'USD Event', totalBudget: 500, currency: 'USD' }),
      );
      state.expenses.push(
        makeExpense({ id: 'exp_2', eventId: 'evt_2', currency: 'USD', estimatedAmount: 100, actualAmount: 100 }),
      );
    });
    renderWithProviders(<DashboardPage />, '/dashboard');

    // Each currency is shown as its own figure…
    expect(screen.getAllByText('₹1,00,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$500').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$100').length).toBeGreaterThan(0);
    // …and never added into a single mixed-currency total (₹1,00,500 = 100000 + 500).
    expect(screen.queryByText('₹1,00,500')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Totals are grouped by currency/),
    ).toBeInTheDocument();
  });

  it('excludes past events from Upcoming events', () => {
    seedState((state) => {
      state.events.push(makeEvent({ id: 'evt_past', title: 'Past Event', startDate: '2020-01-01' }));
      state.events.push(makeEvent({ id: 'evt_future', title: 'Future Event', startDate: '2099-01-01' }));
    });
    renderWithProviders(<DashboardPage />, '/dashboard');

    const heading = screen.getByRole('heading', { name: 'Upcoming events' });
    const section = heading.closest('section');
    expect(section).not.toBeNull();
    expect(within(section!).getByText('Future Event')).toBeInTheDocument();
    expect(within(section!).queryByText('Past Event')).not.toBeInTheDocument();
  });

  it('disables the assistant quick tool when there is no upcoming event', () => {
    seedState((state) => {
      state.events.push(makeEvent({ startDate: '2020-01-01' }));
    });
    renderWithProviders(<DashboardPage />, '/dashboard');

    // No focusable/navigable link — a disabled Link would still work on Enter.
    expect(screen.queryByRole('link', { name: /AI assistant/ })).not.toBeInTheDocument();
    const tool = screen.getByText('AI assistant').closest('[aria-disabled="true"]');
    expect(tool).not.toBeNull();
    expect(tool!.tagName).toBe('DIV');
  });
});
