/**
 * Shared domain types for the Eventra AI API.
 * These mirror the client-side model but are intentionally independent so the
 * server owns its contract.
 */

export const EVENT_TYPES = [
  'wedding',
  'engagement',
  'birthday',
  'anniversary',
  'baby-shower',
  'festival',
  'community',
  'corporate',
  'other',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type VenuePreference = 'indoor' | 'outdoor' | 'mixed' | 'unspecified';

export type BudgetFlexibility = 'strict' | 'moderate' | 'flexible';

/** The subset of an event the AI is allowed to reason about. */
export interface EventDetails {
  title: string;
  eventType: EventType;
  startDate: string;
  endDate?: string;
  timezone: string;
  location: string;
  guestCount: number;
  venuePreference: VenuePreference;
  totalBudget: number;
  currency: string;
  budgetFlexibility: BudgetFlexibility;
  categoryPriorities: string[];
  style?: string;
  colorPalette: string[];
  dietaryPreferences: string[];
  culturalPreferences?: string;
  accessibilityRequirements?: string;
  mustHaveActivities: string[];
  thingsToAvoid: string[];
  durationHours?: number;
  eventDays?: number;
  venueStatus?: string;
  planningPriorities: string[];
  notes?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Lightweight event context used to ground chat responses. */
export interface EventContext {
  event: EventDetails;
  planSummary?: {
    themeName?: string;
    budgetTotal?: number;
    budgetCurrency?: string;
    topCostCategories?: string[];
    completedTasks?: number;
    totalTasks?: number;
    upcomingDeadlines?: string[];
  };
  conversationHistory: ChatMessage[];
}

export interface InvitationInput {
  eventTitle: string;
  eventType: EventType;
  hostName?: string;
  dateLabel: string;
  timeLabel?: string;
  venue?: string;
  rsvpDetails?: string;
  tone: 'formal' | 'casual' | 'warm';
  language: 'english' | 'hindi' | 'hinglish';
  channel: 'invitation' | 'whatsapp' | 'email' | 'social';
  additionalNotes?: string;
}

export interface MenuInput {
  eventTitle: string;
  eventType: EventType;
  guestCount: number;
  segments: string[];
  dietaryPreferences: string[];
  regionalPreference?: string;
  budgetHint?: number;
  currency?: string;
  notes?: string;
}

export interface BudgetAdviceInput {
  eventTitle: string;
  eventType: EventType;
  totalBudget: number;
  currency: string;
  categories: Array<{ name: string; estimatedAmount: number }>;
  savingTargetPercent: number;
  notes?: string;
}

export interface TaskSuggestionInput {
  eventTitle: string;
  eventType: EventType;
  guestCount: number;
  startDate: string;
  timezone: string;
  categories: string[];
  notes?: string;
}
