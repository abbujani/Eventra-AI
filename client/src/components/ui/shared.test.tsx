import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../services/api.js';
import { getErrorMessage } from '../../lib/error.js';
import { ErrorAlert } from './ErrorAlert.js';
import { SourceBadge } from './SourceBadge.js';
import { CopyButton } from './CopyButton.js';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog.js';
import { useClipboard } from '../../hooks/useClipboard.js';

vi.mock('../../hooks/useClipboard.js', () => ({
  useClipboard: vi.fn(),
}));

describe('client UI primitives', () => {
  it('maps ApiError to its message and falls back for other errors', () => {
    const apiError = new ApiError('VALIDATION_ERROR', 'Please check the details.', 400);
    expect(getErrorMessage(apiError, 'Fallback message')).toBe('Please check the details.');
    expect(getErrorMessage(new Error('boom'), 'Fallback message')).toBe('Fallback message');
    expect(getErrorMessage('boom', 'Fallback message')).toBe('Fallback message');
  });

  it('renders ErrorAlert with role alert', () => {
    render(<ErrorAlert message="Something went wrong" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('labels local and AI sources', () => {
    const { rerender } = render(<SourceBadge source="local" />);
    expect(screen.getByText('Local templates')).toBeInTheDocument();
    rerender(<SourceBadge source="ai" />);
    expect(screen.getByText('AI generated')).toBeInTheDocument();
  });

  it('copies text and reports success', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useClipboard).mockReturnValue({ copied: false, copyError: false, copy });

    const user = userEvent.setup();
    render(<CopyButton text="hello world" label="Copy" />);
    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(copy).toHaveBeenCalledWith('hello world');
  });

  it('confirms and cancels deletion', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDeleteDialog
        open
        title="Delete item"
        itemName="Birthday cake"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/delete “birthday cake”/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
