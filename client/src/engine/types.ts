/**
 * Types used by the in-browser planning engine.
 *
 * The client already owns the response shapes (it consumes them from the API),
 * so most types are re-exported from the app's type module. Only the request
 * shapes that live server-side in the API deployment (`EventDetails`,
 * `ChatMessage`, `PlanSummaryContext`) are declared here.
 */
import type { BudgetFlexibility, EventType, VenuePreference } from '../types/index.js';

export type {
  AIEventPlan,
  BudgetAdvice,
  BudgetAdviceInput,
  EventType,
  GeneratedInvitation,
  InvitationInput,
  MenuInput,
  MenuPlan,
  Priority,
  TaskSuggestion,
  TaskSuggestionInput,
  VenuePreference,
} from '../types/index.js';

/** The subset of an event the planning engine reasons about. */
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

/** Lightweight plan context used to ground chat replies. */
export interface PlanSummaryContext {
  themeName?: string;
  budgetTotal?: number;
  budgetCurrency?: string;
  topCostCategories?: string[];
  completedTasks?: number;
  totalTasks?: number;
  upcomingDeadlines?: string[];
}
