import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore.js';
import { useEvent } from '../hooks/useEventData.js';
import { Button, ButtonLink } from '../components/ui/Button.js';
import { ConfirmDeleteDialog } from '../components/ui/ConfirmDeleteDialog.js';
import { EmptyState } from '../components/ui/Feedback.js';
import { Tabs, type TabItem } from '../components/ui/Tabs.js';
import { OverviewPanel } from '../features/overview/OverviewPanel.js';
import { PlanPanel } from '../features/plan/PlanPanel.js';
import { BudgetPanel } from '../features/budget/BudgetPanel.js';
import { TimelinePanel } from '../features/timeline/TimelinePanel.js';
import { TasksPanel } from '../features/tasks/TasksPanel.js';
import { VendorsPanel } from '../features/vendors/VendorsPanel.js';
import { MenuPanel } from '../features/menu/MenuPanel.js';
import { InvitationsPanel } from '../features/invitations/InvitationsPanel.js';
import { ThemeStudio } from '../features/theme/ThemeStudio.js';
import { ReportPanel } from '../features/report/ReportPanel.js';
import { ChatPanel } from '../features/chat/ChatPanel.js';

export function EventWorkspacePage() {
  const { eventId = '' } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useAppStore();
  const event = useEvent(eventId);
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <EmptyState
          title="Event not found"
          description="This event may have been deleted, or the link is incorrect."
          action={
            <ButtonLink to="/dashboard" className="mt-1">
              Back to dashboard
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'plan', label: 'AI Plan' },
    { id: 'budget', label: 'Budget' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'menu', label: 'Menu' },
    { id: 'invitations', label: 'Invitations' },
    { id: 'theme', label: 'Theme' },
    { id: 'report', label: 'Report' },
    { id: 'chat', label: 'Assistant' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet no-underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All events
        </Link>
        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete event
        </Button>
      </div>

      <Tabs
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        label="Event workspace sections"
      />

      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="pt-2 outline-none"
      >
        {activeTab === 'overview' && (
          <OverviewPanel eventId={eventId} onNavigate={setActiveTab} />
        )}
        {activeTab === 'plan' && <PlanPanel eventId={eventId} />}
        {activeTab === 'budget' && <BudgetPanel eventId={eventId} />}
        {activeTab === 'timeline' && <TimelinePanel eventId={eventId} />}
        {activeTab === 'tasks' && <TasksPanel eventId={eventId} />}
        {activeTab === 'vendors' && <VendorsPanel eventId={eventId} />}
        {activeTab === 'menu' && <MenuPanel eventId={eventId} />}
        {activeTab === 'invitations' && <InvitationsPanel eventId={eventId} />}
        {activeTab === 'theme' && <ThemeStudio eventId={eventId} />}
        {activeTab === 'report' && <ReportPanel eventId={eventId} />}
        {activeTab === 'chat' && <ChatPanel eventId={eventId} />}
      </div>

      <ConfirmDeleteDialog
        open={confirmDelete}
        title="Delete event"
        confirmLabel="Delete event"
        description={`Delete “${event.title}” and all of its expenses, tasks, timeline items, vendors, plan and conversation? This cannot be undone.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          dispatch({ type: 'DELETE_EVENT', eventId });
          navigate('/dashboard');
        }}
      />
    </div>
  );
}
