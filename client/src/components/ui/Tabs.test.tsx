import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'tasks', label: 'Tasks' },
];

function setup(activeId = 'overview', onChange = vi.fn()) {
  const view = render(
    <Tabs tabs={TABS} activeId={activeId} onChange={onChange} label="Workspace sections" />,
  );
  return { view, onChange };
}

describe('Tabs', () => {
  it('renders a tablist with accessible tabs', () => {
    setup();
    const tablist = screen.getByRole('tablist', { name: 'Workspace sections' });
    expect(tablist).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks the active tab as selected', () => {
    setup('budget');
    expect(screen.getByRole('tab', { name: 'Budget' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
  });

  it('moves selection with arrow keys', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('overview');
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('budget');
  });

  it('wraps around from the last tab to the first', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('tasks');
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('overview');
  });

  it('jumps to the first and last tab with Home and End', async () => {
    const user = userEvent.setup();
    const first = setup('overview');
    await user.tab();
    await user.keyboard('{End}');
    expect(first.onChange).toHaveBeenCalledWith('tasks');

    const last = setup('tasks');
    await user.tab();
    await user.keyboard('{Home}');
    expect(last.onChange).toHaveBeenCalledWith('overview');
  });

  it('changes tab when a tab is clicked', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('overview');
    await user.click(screen.getByRole('tab', { name: 'Tasks' }));
    expect(onChange).toHaveBeenCalledWith('tasks');
  });

  it('uses roving tabindex so only the active tab is in the tab order', () => {
    setup('budget');
    expect(screen.getByRole('tab', { name: 'Budget' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('tabindex', '-1');
  });
});
