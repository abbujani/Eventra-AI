import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.js';
import { LandingPage } from './pages/LandingPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// The event workspace pulls in every planning panel (budget, timeline, tasks,
// vendors, menu, invitations, theme, report, assistant). Lazy-load it so the
// landing and dashboard routes stay small.
const EventWorkspacePage = lazy(() =>
  import('./pages/EventWorkspacePage.js').then((module) => ({
    default: module.EventWorkspacePage,
  })),
);

// The wizard uses react-hook-form; lazy-load it to shrink the initial bundle.
const EventWizardPage = lazy(() =>
  import('./pages/EventWizardPage.js').then((module) => ({
    default: module.EventWizardPage,
  })),
);

function RouteFallback({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <span className="animate-pulse text-sm font-medium text-slate">{message}</span>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/events/new"
          element={
            <Suspense fallback={<RouteFallback message="Loading wizard…" />}>
              <EventWizardPage />
            </Suspense>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <Suspense fallback={<RouteFallback />}>
              <EventWorkspacePage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
