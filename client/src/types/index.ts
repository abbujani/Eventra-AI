/**
 * Client-side domain model. Mirrors the server contract for AI requests and
 * adds the metadata the UI needs. Persisted locally, never containing secrets.
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

export type EventStatus = 'planning' | 'confirmed' | 'completed';

/**
 * Where generated content came from: the real Gemini model ('ai') or the
 * built-in deterministic template engine ('local', used keyless). The UI must
 * label local output as templates — never as AI.
 */
export type AiSource = 'ai' | 'local';

export interface Event {
  id: string;
  title: string;
  eventType: EventType;
  description?: string;
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
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Expense {
  id: string;
  eventId: string;
  category: string;
  title: string;
  vendor?: string;
  estimatedAmount: number;
  actualAmount?: number;
  currency: string;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  category: string;
  priority: Priority;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineItem {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime?: string;
  category?: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
}

export type VendorStatus =
  | 'researching'
  | 'contacted'
  | 'quote-received'
  | 'shortlisted'
  | 'booked'
  | 'rejected';

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  category: string;
  contactDetails?: string;
  website?: string;
  quotedAmount?: number;
  currency: string;
  status: VendorStatus;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  eventId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface UserPreferences {
  preferredCurrency: string;
  preferredLanguage: 'english' | 'hindi' | 'hinglish';
  theme: 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  eventId?: string;
  type:
    | 'event-created'
    | 'plan-generated'
    | 'plan-applied'
    | 'expense-added'
    | 'expense-updated'
    | 'task-added'
    | 'task-completed'
    | 'vendor-added'
    | 'invitation-generated';
  message: string;
  createdAt: string;
}

/* ---- AI plan shapes (mirrors the server's validated output) ---- */

export interface BudgetCategoryView {
  name: string;
  estimatedAmount: number;
  reasoning?: string;
  percentage: number;
}

export interface NormalizedBudget {
  currency: string;
  totalBudget: number;
  categories: BudgetCategoryView[];
  contingencyAmount: number;
  savingTips: string[];
  computedCategoriesTotal: number;
  computedGrandTotal: number;
  overrunAmount: number;
  isOverBudget: boolean;
  largestCostDrivers: string[];
}

export interface AIEventPlan {
  eventOverview: {
    title: string;
    summary: string;
    planningAssumptions: string[];
  };
  theme: {
    name: string;
    description: string;
    colors: string[];
    decorationIdeas: string[];
  };
  budget: NormalizedBudget;
  timeline: Array<{
    time: string;
    title: string;
    description?: string;
    category?: string;
  }>;
  vendorChecklist: Array<{
    category: string;
    priority: Priority;
    tasks: string[];
    suggestedBookingWindow?: string;
  }>;
  menuIdeas: string[];
  guestExperienceIdeas: string[];
  entertainmentRecommendations: string[];
  preparationTasks: Array<{
    title: string;
    description?: string;
    priority: Priority;
    relativeDeadline?: string;
  }>;
  risks: Array<{ title: string; mitigation: string }>;
  nextActions: string[];
  /** Provenance: which engine produced this plan. Persisted for honest labelling. */
  source?: AiSource;
  eventId?: string;
  generatedAt?: string;
  version?: number;
}

export interface AppState {
  schemaVersion: number;
  preferences: UserPreferences;
  events: Event[];
  expenses: Expense[];
  tasks: Task[];
  timelineItems: TimelineItem[];
  vendors: Vendor[];
  conversations: ConversationMessage[];
  plans: AIEventPlan[];
  activity: ActivityEntry[];
}

export interface GeneratedInvitation {
  text: string;
  language: string;
  tone: string;
  channel: string;
  eventType: string;
  missingFields: string[];
}

export interface MenuItem {
  name: string;
  kind: 'vegetarian' | 'non-vegetarian' | 'vegan' | 'beverage' | 'dessert' | 'snack' | 'other';
  notes?: string;
}

export interface MenuSegment {
  name: string;
  items: MenuItem[];
}

export interface MenuPlan {
  summary: string;
  segments: MenuSegment[];
  dietaryNotes: string[];
  allergyWarning?: string;
  budgetNotes?: string;
}

export interface BudgetRecommendation {
  category: string;
  currentEstimate: number;
  suggestedAmount: number;
  reasoning: string;
}

export interface BudgetAdvice {
  summary: string;
  targetCurrency: string;
  originalTotal: number;
  revisedTotal: number;
  totalSavingPercent: number;
  recommendations: BudgetRecommendation[];
  caveats: string[];
}

export interface TaskSuggestion {
  title: string;
  category: string;
  priority: Priority;
  relativeDeadline?: string;
  description?: string;
}

/** Input shapes for AI requests (mirrors the server contract). */
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

export interface TaskSuggestionInput {
  eventTitle: string;
  eventType: EventType;
  guestCount: number;
  startDate: string;
  timezone: string;
  categories: string[];
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

/** Maps a stored event to the flat shape the API expects. */
export function toEventDetails(event: Event) {
  return {
    title: event.title,
    eventType: event.eventType,
    startDate: event.startDate,
    endDate: event.endDate,
    timezone: event.timezone,
    location: event.location,
    guestCount: event.guestCount,
    venuePreference: event.venuePreference,
    totalBudget: event.totalBudget,
    currency: event.currency,
    budgetFlexibility: event.budgetFlexibility,
    categoryPriorities: event.categoryPriorities,
    style: event.style,
    colorPalette: event.colorPalette,
    dietaryPreferences: event.dietaryPreferences,
    culturalPreferences: event.culturalPreferences,
    accessibilityRequirements: event.accessibilityRequirements,
    mustHaveActivities: event.mustHaveActivities,
    thingsToAvoid: event.thingsToAvoid,
    durationHours: event.durationHours,
    eventDays: event.eventDays,
    venueStatus: event.venueStatus,
    planningPriorities: event.planningPriorities,
    notes: event.notes,
  };
}

export const DEFAULT_BUDGET_CATEGORIES = [
  'Venue',
  'Catering',
  'Decoration',
  'Photography and videography',
  'Clothing and styling',
  'Entertainment',
  'Invitations',
  'Transportation',
  'Accommodation',
  'Gifts and favors',
  'Miscellaneous',
  'Contingency',
];

export const DEFAULT_TASK_CATEGORIES = [
  'Venue',
  'Catering',
  'Decoration',
  'Invitations',
  'Guests',
  'Transportation',
  'Entertainment',
  'Documentation',
  'Final preparations',
];

export const VENDOR_CATEGORIES = [
  'Venues',
  'Caterers',
  'Decorators',
  'Photographers',
  'Videographers',
  'Florists',
  'Makeup artists',
  'Entertainment providers',
  'Transportation',
  'Accommodation',
  'Event coordinators',
] as const;

export const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
] as const;
