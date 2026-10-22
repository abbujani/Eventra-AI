import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { Wordmark } from '../ui/Logo.js';
import { useAppStore } from '../../store/appStore.js';
import { AlertTriangle } from 'lucide-react';

export function AppLayout() {
  const { persistenceError } = useAppStore();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {persistenceError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{persistenceError}</span>
            </div>
          )}
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-midnight/8 bg-ivory">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Wordmark />
          <p className="text-xs text-slate">
            Eventra AI — Generated budgets and schedules are illustrative estimates, not verified quotes.
          </p>
        </div>
      </footer>
    </div>
  );
}
