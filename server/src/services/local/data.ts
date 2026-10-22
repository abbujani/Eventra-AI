import type { EventType } from '../../types.js';

/**
 * Deterministic, event-type-aware planning knowledge used by the built-in
 * local planner (the fallback when no Gemini API key is configured).
 *
 * Every number here is a *planning guideline ratio* derived from common event
 * budgeting practice — not live market prices, quotes or availability data.
 * All monetary amounts are computed purely from the user's own declared
 * budget, and the UI labels these outputs as local templates rather than AI.
 */

export interface BudgetSplit {
  /** Category name shown in the budget breakdown. */
  name: string;
  /** Fraction of the total budget allocated to this category (0–1). */
  share: number;
  /** Why this category gets this share. */
  reasoning: string;
}

/** Shares for each event type sum to 0.90; the remaining 10% is contingency. */
export const BUDGET_SPLITS: Record<EventType, BudgetSplit[]> = {
  wedding: [
    { name: 'Venue & Rentals', share: 0.24, reasoning: 'Typically the single largest line item for weddings.' },
    { name: 'Catering & Beverages', share: 0.22, reasoning: 'Per-guest catering dominates food spend at weddings.' },
    { name: 'Decoration & Florals', share: 0.1, reasoning: 'Stage, mandap, table and entrance decor.' },
    { name: 'Photography & Videography', share: 0.08, reasoning: 'Multi-day coverage justifies a larger share.' },
    { name: 'Clothing & Jewelry', share: 0.09, reasoning: 'Attire for the couple and immediate family.' },
    { name: 'Entertainment & Music', share: 0.05, reasoning: 'DJ, live band, sangeet or mehendi performers.' },
    { name: 'Mehendi & Makeup', share: 0.04, reasoning: 'Bridal makeup, hair, mehendi artists and trials.' },
    { name: 'Transport', share: 0.03, reasoning: 'Guest shuttles, wedding car and family transport.' },
    { name: 'Invitations & Stationery', share: 0.02, reasoning: 'Printed and digital invites, signage, menus.' },
    { name: 'Return Gifts & Favors', share: 0.02, reasoning: 'Per-guest favors add up quickly at scale.' },
    { name: 'Miscellaneous', share: 0.01, reasoning: 'Small unstated costs and tips.' },
  ],
  engagement: [
    { name: 'Venue & Rentals', share: 0.24, reasoning: 'Hall or lawn rental is usually the top cost.' },
    { name: 'Catering & Beverages', share: 0.24, reasoning: 'Seated or buffet catering per guest.' },
    { name: 'Decoration & Florals', share: 0.13, reasoning: 'Ring-ceremony stage and themed decor.' },
    { name: 'Photography & Videography', share: 0.07, reasoning: 'Shorter coverage than a wedding but still essential.' },
    { name: 'Clothing & Jewelry', share: 0.1, reasoning: 'Outfits for the couple and close family.' },
    { name: 'Entertainment & Music', share: 0.05, reasoning: 'Soft live music or a curated playlist.' },
    { name: 'Transport', share: 0.03, reasoning: 'Guest and family transport.' },
    { name: 'Invitations & Stationery', share: 0.02, reasoning: 'Invites and printed signage.' },
    { name: 'Return Gifts & Favors', share: 0.02, reasoning: 'Small keepsakes for guests.' },
  ],
  birthday: [
    { name: 'Venue & Rentals', share: 0.2, reasoning: 'Home party, cafe or banquet hall rental.' },
    { name: 'Catering & Beverages', share: 0.25, reasoning: 'Food and drinks are usually the biggest spend.' },
    { name: 'Cake & Desserts', share: 0.08, reasoning: 'Custom theme cakes cost more per serving.' },
    { name: 'Decoration & Theme', share: 0.14, reasoning: 'Balloons, backdrop, themed props and lighting.' },
    { name: 'Entertainment & Activities', share: 0.09, reasoning: 'Games, magician, DJ or activity fees.' },
    { name: 'Photography', share: 0.05, reasoning: 'Optional but often worth it for milestone birthdays.' },
    { name: 'Return Gifts', share: 0.04, reasoning: 'Per-child favors scale quickly.' },
    { name: 'Invitations & Stationery', share: 0.02, reasoning: 'Digital invites keep this low.' },
    { name: 'Transport', share: 0.02, reasoning: 'Cake pickup and rental delivery.' },
    { name: 'Miscellaneous', share: 0.01, reasoning: 'Small unstated costs.' },
  ],
  anniversary: [
    { name: 'Venue & Rentals', share: 0.22, reasoning: 'Private dining or hall rental.' },
    { name: 'Catering & Beverages', share: 0.28, reasoning: 'A plated dinner is often the centrepiece.' },
    { name: 'Decoration & Florals', share: 0.14, reasoning: 'Floral arrangements and table decor.' },
    { name: 'Photography', share: 0.07, reasoning: 'A couple or family shoot.' },
    { name: 'Entertainment & Music', share: 0.07, reasoning: 'Live music or a curated playlist.' },
    { name: 'Cake & Desserts', share: 0.05, reasoning: 'A smaller custom cake.' },
    { name: 'Transport', share: 0.03, reasoning: 'Car hire for the couple.' },
    { name: 'Invitations & Stationery', share: 0.02, reasoning: 'Usually a small, close gathering.' },
    { name: 'Return Gifts & Favors', share: 0.02, reasoning: 'Small keepsakes for close guests.' },
  ],
  'baby-shower': [
    { name: 'Venue & Rentals', share: 0.22, reasoning: 'Home, garden or a booked cafe room.' },
    { name: 'Catering & Beverages', share: 0.26, reasoning: 'Afternoon tea or brunch style food.' },
    { name: 'Decoration & Theme', share: 0.16, reasoning: 'Themed backdrop, balloon clusters, table decor.' },
    { name: 'Photography', share: 0.07, reasoning: 'A short family or group shoot.' },
    { name: 'Games & Activities', share: 0.07, reasoning: 'Structured games with small prizes.' },
    { name: 'Cake & Desserts', share: 0.06, reasoning: 'Themed cake plus a dessert table.' },
    { name: 'Return Gifts', share: 0.04, reasoning: 'Small keepsakes for guests.' },
    { name: 'Invitations & Stationery', share: 0.02, reasoning: 'Themed digital or printed invites.' },
  ],
  festival: [
    { name: 'Venue & Decorations', share: 0.24, reasoning: 'Community hall, pandal or public ground setup.' },
    { name: 'Food & Beverages', share: 0.32, reasoning: 'Community feasting is usually the largest line item.' },
    { name: 'Ritual & Religious Items', share: 0.08, reasoning: 'Puja items, idols and ceremonial materials.' },
    { name: 'Entertainment & Performances', share: 0.1, reasoning: 'Cultural performances and artist fees.' },
    { name: 'Lighting & Sound', share: 0.08, reasoning: 'Lighting rigs and a PA system.' },
    { name: 'Photography', share: 0.03, reasoning: 'Documenting the celebration.' },
    { name: 'Invitations & Community Outreach', share: 0.02, reasoning: 'Notices, banners and digital outreach.' },
    { name: 'Transport & Logistics', share: 0.03, reasoning: 'Equipment transport and volunteer movement.' },
  ],
  community: [
    { name: 'Venue & Permits', share: 0.2, reasoning: 'Public grounds and halls need permits and deposits.' },
    { name: 'Food & Beverages', share: 0.24, reasoning: 'Refreshments for a crowd scale fast with headcount.' },
    { name: 'Sound & Staging', share: 0.14, reasoning: 'A PA system is essential for a crowd.' },
    { name: 'Performers & Activities', share: 0.12, reasoning: 'Speaker fees, workshop materials, activity kits.' },
    { name: 'Volunteers & Logistics', share: 0.08, reasoning: 'T-shirts, meals and travel for volunteers.' },
    { name: 'Publicity & Invitations', share: 0.06, reasoning: 'Posters, banners and digital promotion.' },
    { name: 'Photography', share: 0.03, reasoning: 'Documentation for future outreach.' },
    { name: 'Safety & First Aid', share: 0.03, reasoning: 'First-aid supplies and on-site safety staff.' },
  ],
  corporate: [
    { name: 'Venue & AV', share: 0.28, reasoning: 'Conference rooms and AV rigs are the top cost.' },
    { name: 'Catering & Beverages', share: 0.24, reasoning: 'Refreshments and meals for attendees.' },
    { name: 'Speakers & Program', share: 0.12, reasoning: 'Speaker fees, session materials, facilitation.' },
    { name: 'Branding & Signage', share: 0.1, reasoning: 'Banners, standees and printed materials.' },
    { name: 'Travel & Accommodation', share: 0.08, reasoning: 'Speaker and attendee travel blocks.' },
    { name: 'Photography & Documentation', share: 0.04, reasoning: 'Event coverage for internal and external use.' },
    { name: 'Invitations & Coordination', share: 0.03, reasoning: 'Registration platform and coordination.' },
    { name: 'Transport & Logistics', share: 0.01, reasoning: 'Equipment transport and movement.' },
  ],
  other: [
    { name: 'Venue & Rentals', share: 0.24, reasoning: 'The space sets the tone and capacity.' },
    { name: 'Catering & Beverages', share: 0.26, reasoning: 'Food and drinks scale with guest count.' },
    { name: 'Decoration & Theme', share: 0.14, reasoning: 'Backdrop, lighting and table decor.' },
    { name: 'Photography & Videography', share: 0.07, reasoning: 'Capturing the occasion.' },
    { name: 'Entertainment & Activities', share: 0.08, reasoning: 'Music, games or a hosted programme.' },
    { name: 'Invitations & Stationery', share: 0.03, reasoning: 'Printed or digital invites and signage.' },
    { name: 'Transport & Logistics', share: 0.03, reasoning: 'Guest transport and equipment delivery.' },
    { name: 'Return Gifts & Favors', share: 0.03, reasoning: 'Small keepsakes for guests.' },
    { name: 'Miscellaneous', share: 0.02, reasoning: 'Small unstated costs and tips.' },
  ],
};

export const SAVING_TIPS: Record<string, string[]> = {
  strict: [
    'Keep the guest count tight — food, seating and favors all scale per head.',
    'Book vendors in the shoulder season or on a weekday for lower rates.',
    'Use one venue for both ceremony and reception to cut transport costs.',
    'Reuse ceremony decor for the reception instead of paying twice.',
    'Compare at least three quotes for every major category before booking.',
  ],
  moderate: [
    'Compare at least three quotes for every major category before booking.',
    'Negotiate a package rate when bundling decor, catering and AV with one vendor.',
    'Trim the least-noticed category first rather than spreading small cuts everywhere.',
    'Ask vendors for an itemised quote so you can see exactly what to cut.',
    'Confirm service charge, taxes and overtime rates before signing.',
  ],
  flexible: [
    'Hold the 10% contingency for genuine surprises rather than planned extras.',
    'Splurge on the one element your guests will remember most.',
    'Prefer quality over quantity for the categories guests actually notice.',
    'Ask about off-peak and early-payment discounts before adding extras.',
  ],
};
