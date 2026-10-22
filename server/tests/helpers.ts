import type { AiProvider, GenerateOptions } from '../src/services/ai/index.js';

export class MockProvider implements AiProvider {
  model = 'test-model';
  configured = true;
  text = 'mock assistant reply';
  json: unknown = {};

  constructor(overrides: Partial<MockProvider> = {}) {
    Object.assign(this, overrides);
  }

  async generateText(_prompt: string, _options?: GenerateOptions): Promise<string> {
    return this.text;
  }

  async generateJson<T>(_prompt: string, _options?: GenerateOptions): Promise<T> {
    return this.json as T;
  }
}

export const validEvent = {
  title: 'Anaya & Rohan',
  eventType: 'wedding',
  startDate: '2026-06-12',
  endDate: '2026-06-14',
  timezone: 'Asia/Kolkata',
  location: 'Jaipur, India',
  guestCount: 250,
  venuePreference: 'outdoor',
  totalBudget: 500000,
  currency: 'INR',
  budgetFlexibility: 'moderate',
  categoryPriorities: ['venue', 'catering'],
  style: 'Traditional Rajasthani',
  colorPalette: ['#7657E8', '#F5A7B8'],
  dietaryPreferences: ['vegetarian'],
  culturalPreferences: 'Hindu ceremonies, multi-day celebration',
  accessibilityRequirements: 'Wheelchair access to the main hall',
  mustHaveActivities: ['Sangeet', 'Mehendi'],
  thingsToAvoid: ['Loud fireworks'],
  durationHours: 12,
  eventDays: 3,
  venueStatus: 'Not booked yet',
  planningPriorities: ['venue', 'catering', 'photography'],
  notes: 'A family-centred celebration.',
};

export const validPlan = {
  eventOverview: {
    title: 'Anaya & Rohan',
    summary: 'A three-day Rajasthani wedding celebration in Jaipur.',
    planningAssumptions: ['250 guests', 'Outdoor venue', '500000 INR budget'],
  },
  theme: {
    name: 'Royal Marigold',
    description: 'Warm marigold and violet tones with traditional textures.',
    colors: ['#F5A7B8', '#7657E8', '#20876A'],
    decorationIdeas: ['Marigold floral arches', 'Brass lanterns'],
  },
  budget: {
    currency: 'INR',
    totalBudget: 500000,
    categories: [
      { name: 'Venue', estimatedAmount: 150000, reasoning: 'Outdoor heritage venue' },
      { name: 'Catering', estimatedAmount: 120000, reasoning: 'Vegetarian multi-cuisine' },
      { name: 'Decoration', estimatedAmount: 80000, reasoning: 'Floral and lighting' },
      { name: 'Photography', estimatedAmount: 60000, reasoning: 'Three-day coverage' },
    ],
    contingencyAmount: 25000,
    savingTips: ['Book caterers early', 'Reuse ceremony decor'],
  },
  timeline: [
    { time: '09:00', title: 'Mehendi ceremony', description: 'Guest seating and artist setup', category: 'ceremony' },
  ],
  vendorChecklist: [
    { category: 'Venues', priority: 'high', tasks: ['Shortlist three venues'], suggestedBookingWindow: '6 months before' },
  ],
  menuIdeas: ['Rajasthani thali', 'Live chaat counter'],
  guestExperienceIdeas: ['Welcome drink station'],
  entertainmentRecommendations: ['Live folk band'],
  preparationTasks: [
    { title: 'Book venue', description: 'Sign contract and pay deposit', priority: 'high', relativeDeadline: '6 months before' },
  ],
  risks: [{ title: 'Monsoon rain', mitigation: 'Book a tent backup' }],
  nextActions: ['Finalise venue', 'Send save-the-dates'],
};
