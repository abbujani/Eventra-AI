import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Send, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useEvent, useEventBudget, useEventConversation, useEventPlan } from '../../hooks/useEventData.js';
import { useAiStatus } from '../../hooks/useAiStatus.js';
import { ApiError, api } from '../../services/api.js';
import { generateId } from '../../lib/id.js';
import { Button } from '../../components/ui/Button.js';
import { ButtonSpinner, EmptyState } from '../../components/ui/Feedback.js';
import { Textarea } from '../../components/ui/Field.js';
import { AiStatusNotice } from '../shared/AiStatusNotice.js';

const SUGGESTIONS = [
  'How can I reduce this budget by 15%?',
  'Make a rainy-weather backup plan.',
  'Create a vegetarian menu for 100 guests.',
  'What should I prioritise in the next 30 days?',
];

export function ChatPanel({ eventId }: { eventId: string }) {
  const { state, dispatch } = useAppStore();
  const event = useEvent(eventId);
  const messages = useEventConversation(eventId);
  const plan = useEventPlan(eventId);
  const budget = useEventBudget(eventId);
  const aiStatus = useAiStatus();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, sending]);

  if (!event) return null;

  const planSummary = plan
    ? {
        theme: plan.theme.name,
        budget: {
          currency: plan.budget.currency,
          total: plan.budget.totalBudget,
          categories: plan.budget.categories.slice(0, 8),
        },
        nextActions: plan.nextActions.slice(0, 5),
      }
    : budget
      ? {
          budget: {
            currency: budget.currency,
            total: budget.totalBudget,
            estimated: budget.estimatedTotal,
            actual: budget.actualTotal,
          },
        }
      : undefined;

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setInput('');
    setError(null);
    dispatch({
      type: 'ADD_CONVERSATION_MESSAGE',
      eventId,
      message: {
        id: generateId('msg'),
        eventId,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      },
    });
    setSending(true);
    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      const response = await api.chat(event, planSummary, history, message);
      dispatch({
        type: 'ADD_CONVERSATION_MESSAGE',
        eventId,
        message: {
          id: generateId('msg'),
          eventId,
          role: 'assistant',
          content: response.reply,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'The assistant could not respond. Please try again.',
      );
      // The user's message is already in the transcript from the first dispatch;
      // re-adding it here would duplicate it on every failed request.
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    void send(input);
  };

  // Only a *resolved* failure blocks input — during 'loading' the notice above
  // already shows a spinner and the panel must not disable prematurely.
  const aiBlocked = aiStatus.state === 'unconfigured' || aiStatus.state === 'unreachable';

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-violet" aria-hidden="true" />
          AI planning assistant
        </h2>
        {messages.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dispatch({ type: 'CLEAR_CONVERSATION', eventId })}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear conversation
          </button>
        )}
      </div>

      <AiStatusNotice status={aiStatus} />

      <div
        className="card flex min-h-[22rem] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Sparkles className="h-7 w-7 text-violet" aria-hidden="true" />
            <p className="text-sm font-semibold text-midnight">Ask anything about this event</p>
            <p className="max-w-sm text-xs text-slate">
              The assistant reasons over your saved event details, budget and plan. It never changes
              your saved data on its own.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={aiBlocked}
                  onClick={() => void send(question)}
                  className="rounded-full border border-midnight/15 bg-white px-3 py-1.5 text-xs font-medium text-midnight-2 transition-colors hover:border-violet disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}
              >
                <div
                  className={
                    message.role === 'user'
                      ? 'rounded-2xl rounded-br-md bg-midnight px-4 py-2.5 text-sm text-white'
                      : 'rounded-2xl rounded-bl-md bg-violet-soft px-4 py-2.5 text-sm text-midnight-2'
                  }
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="mt-1 text-[0.65rem] text-slate">
                  {message.role === 'user' ? 'You' : 'Eventra AI'}
                </p>
              </div>
            ))}
            {sending && (
              <p className="flex items-center gap-2 text-sm text-slate" role="status">
                <ButtonSpinner /> Assistant is thinking…
              </p>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Textarea
          id="chat-input"
          aria-label="Message the planning assistant"
          rows={2}
          value={input}
          disabled={aiBlocked || sending}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          placeholder={
            aiBlocked
              ? 'AI assistant is unavailable — configure a Gemini API key on the server.'
              : 'Ask about budgets, menus, schedules or backup plans…'
          }
        />
        <Button type="submit" disabled={aiBlocked || sending || input.trim() === ''}>
          {sending ? <ButtonSpinner /> : <Send className="h-4 w-4" aria-hidden="true" />}
          Send
        </Button>
      </form>

      <p className="text-xs text-slate">
        The assistant will not modify your saved event data. Any change it suggests is explained for
        your confirmation first.
      </p>

      {state.events.length === 0 && (
        <EmptyState title="No events" description="Create an event to use the assistant." />
      )}
    </div>
  );
}
