import { Sparkles, Wrench } from 'lucide-react';
import type { AiSource } from '../../services/api.js';
import { Badge } from './Feedback.js';

interface SourceBadgeProps {
  source: AiSource | null | undefined;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const tone = source === 'ai' ? 'success' : source === 'local' ? 'neutral' : 'neutral';
  const label = source === 'local' ? 'Local templates' : source === 'ai' ? 'AI generated' : 'Generated';
  const Icon = source === 'local' ? Wrench : Sparkles;

  return (
    <Badge tone={tone} className={className}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
