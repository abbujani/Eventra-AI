import { ButtonLink } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/Feedback.js';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4">
      <EmptyState
        title="Page not found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <ButtonLink to="/" className="mt-2">
            Back to Eventra AI
          </ButtonLink>
        }
      />
    </div>
  );
}
