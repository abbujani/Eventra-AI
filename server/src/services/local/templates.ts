import type { EventType, VenuePreference } from '../../types.js';

/**
 * Static, event-type-aware planning templates used by the built-in local
 * planner (fallback when no Gemini API key is configured).
 *
 * These are curated planning checklists, not live market data. All monetary
 * amounts are derived from the user's own declared budget; nothing here
 * fabricates vendor names, prices or availability.
 */

export type Priority = 'high' | 'medium' | 'low';

export interface TimelineTemplate {
  time: string;
  title: string;
  description: string;
  category: string;
}

export interface VendorTemplate {
  category: string;
  priority: Priority;
  tasks: string[];
  suggestedBookingWindow: string;
}

export interface ThemeTemplate {
  name: string;
  description: string;
  colors: string[];
  decorationIdeas: string[];
}

export interface EventTypeTemplate {
  label: string;
  timeline: TimelineTemplate[];
  vendors: VendorTemplate[];
  menuIdeas: string[];
  guestExperience: string[];
  entertainment: string[];
  theme: ThemeTemplate;
  preparationTasks: Array<{
    title: string;
    description: string;
    priority: Priority;
    relativeDeadline: string;
  }>;
}

const WEDDING: EventTypeTemplate = {
  label: 'Wedding',
  timeline: [
    { time: '09:00', title: 'Vendor load-in & decor setup', description: 'Decor, catering and AV teams arrive and begin setup.', category: 'Setup' },
    { time: '10:00', title: 'Hair & makeup begins', description: 'Bridal party styling starts per the run sheet.', category: 'Preparation' },
    { time: '12:00', title: 'Guest arrival & welcome drinks', description: 'Ushers seat guests and serve welcome beverages.', category: 'Hospitality' },
    { time: '12:45', title: 'Main ceremony', description: 'Core rituals and vows; keep the aisle clear for photography.', category: 'Ceremony' },
    { time: '14:30', title: 'Receiving line & family photographs', description: 'Group portraits and guest greetings.', category: 'Photography' },
    { time: '15:30', title: 'Lunch service', description: 'Buffet or seated lunch with labelled dietary options.', category: 'Meal' },
    { time: '17:00', title: 'Evening reception begins', description: 'Room changeover, lighting shift and guest re-seating.', category: 'Reception' },
    { time: '18:30', title: 'Dinner service', description: 'Dinner with live counters and dessert service.', category: 'Meal' },
    { time: '20:00', title: 'Speeches & cake cutting', description: 'Family speeches, first dance and cake cutting.', category: 'Programme' },
    { time: '21:00', title: 'Music & dancing', description: 'DJ or live band set; wind-down music towards the end.', category: 'Entertainment' },
    { time: '22:00', title: 'Send-off & teardown', description: 'Guest departure, gift collection and vendor teardown.', category: 'Logistics' },
  ],
  vendors: [
    { category: 'Venue', priority: 'high', tasks: ['Shortlist at least three venues', 'Confirm capacity and layout', 'Check parking and accessibility', 'Get deposit and cancellation terms in writing'], suggestedBookingWindow: '9 to 12 months before' },
    { category: 'Caterer', priority: 'high', tasks: ['Book a tasting before confirming', 'Confirm per-plate pricing and service charges', 'Agree dietary and allergen handling', 'Confirm staff count and overtime rates'], suggestedBookingWindow: '6 to 9 months before' },
    { category: 'Photographer & Videographer', priority: 'high', tasks: ['Review full albums, not highlights', 'Confirm coverage hours and deliverables', 'Agree turnaround time for edits'], suggestedBookingWindow: '6 to 8 months before' },
    { category: 'Decorator & Florist', priority: 'medium', tasks: ['Share palette and reference images', 'Confirm setup and teardown windows', 'Ask about reusable versus fresh materials'], suggestedBookingWindow: '4 to 6 months before' },
    { category: 'Entertainment', priority: 'medium', tasks: ['Confirm sound requirements with the venue', 'Agree song list and do-not-play list', 'Confirm arrival and sound-check times'], suggestedBookingWindow: '3 to 5 months before' },
    { category: 'Transport', priority: 'low', tasks: ['Confirm vehicle count and routes', 'Agree waiting-time charges', 'Share the schedule with drivers'], suggestedBookingWindow: '2 to 3 months before' },
  ],
  menuIdeas: [
    'Welcome drinks: masala lemonade, jaljeera and seasonal juices',
    'Chaat and starter counters during guest arrival',
    'Regional main course with a clear vegetarian spread',
    'Live dosa, chaat or pasta counter for variety',
    'Dessert table with Indian sweets and a continental option',
  ],
  guestExperience: [
    'Welcome drink on arrival with ushers guiding seating',
    'Comfortable seating with clear table and zone signage',
    'Photo booth with themed props near the entrance',
    'A quiet, air-conditioned resting room for elderly guests',
  ],
  entertainment: [
    'Live folk or classical performance during lunch',
    'Sangeet night with a curated playlist the night before',
    'DJ set for the evening reception',
  ],
  theme: {
    name: 'Marigold & Ivory',
    description: 'Warm marigold tones with ivory drapery and brass accents — a classic, crowd-pleasing wedding palette.',
    colors: ['#F5A7B8', '#FFFDF8', '#E8A33D'],
    decorationIdeas: ['Marigold garland entrance', 'Brass urn centrepieces', 'Ivory fabric draping', 'Fairy-light canopy'],
  },
  preparationTasks: [
    { title: 'Set the guest list & budget', description: 'Agree the headcount range and total budget before booking anything.', priority: 'high', relativeDeadline: '10 to 12 months before' },
    { title: 'Book the venue', description: 'The venue date drives every other deadline.', priority: 'high', relativeDeadline: '9 to 12 months before' },
    { title: 'Book the caterer & fix the menu', description: 'Confirm pricing, tastings and dietary handling.', priority: 'high', relativeDeadline: '6 to 9 months before' },
    { title: 'Confirm photographer & videographer', description: 'Sign the contract and pay the booking deposit.', priority: 'high', relativeDeadline: '6 to 8 months before' },
    { title: 'Send invitations & open RSVPs', description: 'Send save-the-dates early, formal invites closer to the date.', priority: 'medium', relativeDeadline: '3 to 4 months before' },
    { title: 'Finalise attire & trials', description: 'Complete makeup, hair and draping trials.', priority: 'medium', relativeDeadline: '2 to 3 months before' },
    { title: 'Confirm the final guest count', description: 'Share final numbers with the caterer and seating planner.', priority: 'high', relativeDeadline: '2 weeks before' },
    { title: 'Walk through the day with all vendors', description: 'Confirm timings, contacts and contingencies in one call.', priority: 'high', relativeDeadline: '1 week before' },
  ],
};

const BIRTHDAY: EventTypeTemplate = {
  label: 'Birthday',
  timeline: [
    { time: '17:00', title: 'Setup & decoration', description: 'Balloons, backdrop, cake table and activity stations.', category: 'Setup' },
    { time: '17:45', title: 'Host briefing', description: 'Confirm run sheet, playlist and key photo moments.', category: 'Host' },
    { time: '18:00', title: 'Guest arrival', description: 'Welcome guests, name tags and background music.', category: 'Hospitality' },
    { time: '18:30', title: 'Games & activities', description: 'Structured games or entertainer session.', category: 'Entertainment' },
    { time: '19:15', title: 'Snacks & refreshments', description: 'Serve starters and beverages before the cake.', category: 'Meal' },
    { time: '19:45', title: 'Cake cutting & happy birthday', description: 'The key photo moment — cue music and candles.', category: 'Programme' },
    { time: '20:00', title: 'Dinner service', description: 'Main meal with labelled dietary options.', category: 'Meal' },
    { time: '20:45', title: 'Dance floor & music', description: 'Open dancing, karaoke or a curated playlist.', category: 'Entertainment' },
    { time: '21:30', title: 'Return gifts & send-off', description: 'Hand out favors and thank guests on departure.', category: 'Logistics' },
    { time: '22:00', title: 'Teardown', description: 'Collect rentals, clear the space and settle the venue.', category: 'Logistics' },
  ],
  vendors: [
    { category: 'Venue', priority: 'high', tasks: ['Confirm capacity and noise rules', 'Check kitchen and fridge access', 'Confirm the decoration and cleanup window'], suggestedBookingWindow: '2 to 4 months before' },
    { category: 'Caterer or Bakery', priority: 'high', tasks: ['Confirm per-head pricing', 'Order the cake with a tasting', 'Agree dietary and allergen handling'], suggestedBookingWindow: '4 to 6 weeks before' },
    { category: 'Entertainment', priority: 'medium', tasks: ['Confirm the activity or performer', 'Agree duration and sound needs', 'Ask about a wet-weather alternative'], suggestedBookingWindow: '4 to 6 weeks before' },
    { category: 'Decoration', priority: 'medium', tasks: ['Fix the theme and colour palette', 'Confirm setup access time', 'Check venue restrictions on wall fixtures'], suggestedBookingWindow: '3 to 4 weeks before' },
  ],
  menuIdeas: [
    'Finger snacks and a chaat counter',
    'Custom themed cake with a matching dessert table',
    'Mocktail and fresh juice station',
    'Ice cream or live dessert counter',
  ],
  guestExperience: [
    'Themed photo backdrop with props',
    'Name tags and a welcome drink on arrival',
    'A games corner supervised for children',
    'A comfortable rest area for parents and elderly guests',
  ],
  entertainment: [
    'Magician or balloon artist for children',
    'Karaoke or playlist-based dancing',
    'Structured party games with small prizes',
  ],
  theme: {
    name: 'Confetti Pop',
    description: 'Bright, playful tones with a bold backdrop — works equally well for children and adults.',
    colors: ['#7657E8', '#F5A7B8', '#FFD166'],
    decorationIdeas: ['Balloon arch entrance', 'Confetti photo wall', 'Themed table centrepieces', 'Fringe curtain backdrop'],
  },
  preparationTasks: [
    { title: 'Fix the guest list & budget', description: 'Headcount drives venue, cake and food costs directly.', priority: 'high', relativeDeadline: '2 months before' },
    { title: 'Book the venue', description: 'Home, cafe or hall — confirm and pay any deposit.', priority: 'high', relativeDeadline: '4 to 6 weeks before' },
    { title: 'Order the cake', description: 'Confirm flavours, design and delivery time.', priority: 'high', relativeDeadline: '2 to 3 weeks before' },
    { title: 'Send invites & track RSVPs', description: 'Send digital invites and follow up on responses.', priority: 'medium', relativeDeadline: '3 to 4 weeks before' },
    { title: 'Plan games & activities', description: 'Prepare a run sheet so there is no dead air.', priority: 'medium', relativeDeadline: '1 week before' },
    { title: 'Confirm the final headcount', description: 'Share numbers with the caterer and venue.', priority: 'high', relativeDeadline: '3 days before' },
  ],
};

const CORPORATE: EventTypeTemplate = {
  label: 'Corporate Event',
  timeline: [
    { time: '08:00', title: 'Setup & AV check', description: 'Test projectors, microphones and the registration desk.', category: 'Setup' },
    { time: '08:45', title: 'Speaker briefing', description: 'Confirm session timings, AV needs and handovers.', category: 'Host' },
    { time: '09:00', title: 'Registration & welcome', description: 'Check in attendees and hand out materials.', category: 'Hospitality' },
    { time: '09:30', title: 'Opening keynote', description: 'Kick off with the keynote speaker.', category: 'Programme' },
    { time: '10:30', title: 'Breakout sessions', description: 'Run parallel sessions or workshops.', category: 'Programme' },
    { time: '12:30', title: 'Lunch', description: 'Buffet lunch with clearly labelled dietary options.', category: 'Meal' },
    { time: '14:00', title: 'Afternoon sessions', description: 'Continue sessions or panel discussions.', category: 'Programme' },
    { time: '16:00', title: 'Closing remarks', description: 'Summarise outcomes and thank attendees.', category: 'Programme' },
    { time: '16:30', title: 'Networking & teardown', description: 'Open networking while teardown begins.', category: 'Logistics' },
  ],
  vendors: [
    { category: 'Venue', priority: 'high', tasks: ['Confirm capacity and layout', 'Check AV and internet quality', 'Confirm catering and breakout rooms'], suggestedBookingWindow: '3 to 4 months before' },
    { category: 'AV & Production', priority: 'high', tasks: ['Confirm equipment list', 'Book a full tech rehearsal', 'Confirm on-site support'], suggestedBookingWindow: '6 to 8 weeks before' },
    { category: 'Caterer', priority: 'high', tasks: ['Confirm per-head pricing', 'Agree dietary and allergen handling', 'Confirm service timings'], suggestedBookingWindow: '4 to 6 weeks before' },
    { category: 'Branding & Printing', priority: 'medium', tasks: ['Confirm artwork deadlines', 'Check venue restrictions on fixtures'], suggestedBookingWindow: '3 to 4 weeks before' },
  ],
  menuIdeas: [
    'Working lunch buffet with light, energising options',
    'Coffee and refreshment breaks mid-morning and mid-afternoon',
    'Networking high-tea after the closing session',
    'Dietary-friendly options clearly labelled at every station',
  ],
  guestExperience: [
    'Clear printed and digital agenda at the entrance',
    'A staffed registration desk for queries',
    'Charging points and reliable Wi-Fi',
    'A networking corner with seating',
  ],
  entertainment: [
    'A strong opening keynote to set the tone',
    'Interactive breakout sessions rather than back-to-back talks',
    'A short closing panel or Q&A',
  ],
  theme: {
    name: 'Midnight & Violet',
    description: 'Professional, on-brand tones with high legibility for signage and slides.',
    colors: ['#17152B', '#7657E8', '#FFFDF8'],
    decorationIdeas: ['Branded stage backdrop', 'Wayfinding signage', 'Sponsored step-and-repeat wall', 'Simple table dressing'],
  },
  preparationTasks: [
    { title: 'Confirm the venue & format', description: 'Fix capacity, layout and session structure.', priority: 'high', relativeDeadline: '3 to 4 months before' },
    { title: 'Confirm speakers & agenda', description: 'Lock the agenda and collect speaker requirements.', priority: 'high', relativeDeadline: '6 to 8 weeks before' },
    { title: 'Open registration & collect dietary needs', description: 'Capture attendance and dietary requirements early.', priority: 'medium', relativeDeadline: '4 weeks before' },
    { title: 'Run a full tech rehearsal', description: 'Test AV, presentations and handovers.', priority: 'high', relativeDeadline: '1 week before' },
    { title: 'Confirm the final headcount', description: 'Share numbers with the venue and caterer.', priority: 'high', relativeDeadline: '3 days before' },
  ],
};

/** Generic celebration template reused for engagement, anniversary, baby shower, festival, community and other. */
function celebrationTemplate(label: string): EventTypeTemplate {
  return {
    label,
    timeline: [
      { time: '17:00', title: 'Setup & decoration', description: 'Decor, seating and activity stations in place.', category: 'Setup' },
      { time: '17:45', title: 'Host briefing', description: 'Confirm run sheet, playlist and key moments.', category: 'Host' },
      { time: '18:00', title: 'Guest arrival', description: 'Welcome guests and start background music.', category: 'Hospitality' },
      { time: '18:30', title: 'Main programme', description: 'The central ceremony, ritual or activity.', category: 'Programme' },
      { time: '19:30', title: 'Food service', description: 'Serve the main meal with labelled dietary options.', category: 'Meal' },
      { time: '20:30', title: 'Music & socialising', description: 'Open music, dancing or conversation.', category: 'Entertainment' },
      { time: '22:00', title: 'Send-off & teardown', description: 'Thank guests and begin teardown.', category: 'Logistics' },
    ],
    vendors: [
      { category: 'Venue', priority: 'high', tasks: ['Confirm capacity and layout', 'Check parking and accessibility', 'Confirm the decoration window'], suggestedBookingWindow: '2 to 4 months before' },
      { category: 'Caterer', priority: 'high', tasks: ['Confirm per-head pricing', 'Book a tasting', 'Agree allergen handling'], suggestedBookingWindow: '4 to 6 weeks before' },
      { category: 'Decoration', priority: 'medium', tasks: ['Fix the theme and palette', 'Confirm setup access time'], suggestedBookingWindow: '3 to 4 weeks before' },
      { category: 'Photography', priority: 'medium', tasks: ['Confirm coverage hours', 'Agree deliverables list', 'Share key groupings in advance'], suggestedBookingWindow: '3 to 4 weeks before' },
    ],
    menuIdeas: [
      'Welcome drinks and light starters on arrival',
      'Regional or multi-cuisine buffet for the main meal',
      'A live counter (chaat, dosa or pasta) for variety',
      'Dessert table with a themed centerpiece cake',
    ],
    guestExperience: [
      'Welcome drink on arrival with clear signage',
      'Comfortable seating arranged for easy conversation',
      'A dedicated photo moment near the themed backdrop',
      'A small keepsake or return gift for guests',
    ],
    entertainment: [
      'Live acoustic or classical performance during dinner',
      'A curated playlist between programme items',
      'A short slideshow of memories or a family toast',
    ],
    theme: {
      name: `${label} Glow`,
      description: `A warm, celebratory palette for your ${label.toLowerCase()} — elegant without being over the top.`,
      colors: ['#F5A7B8', '#FFFDF8', '#7657E8'],
      decorationIdeas: ['Floral entrance', 'Fairy-light backdrop', 'Themed centrepieces', 'Candle-lit table runners'],
    },
    preparationTasks: [
      { title: 'Confirm the guest list & budget', description: 'Headcount drives venue and catering costs directly.', priority: 'high', relativeDeadline: '6 weeks before' },
      { title: 'Book the venue', description: 'Confirm the date and pay any deposit.', priority: 'high', relativeDeadline: '4 to 6 weeks before' },
      { title: 'Send invitations & open RSVPs', description: 'Track responses and follow up on pending guests.', priority: 'medium', relativeDeadline: '3 to 4 weeks before' },
      { title: 'Confirm attire & trials', description: 'Complete any styling or outfit trials.', priority: 'medium', relativeDeadline: '2 weeks before' },
      { title: 'Confirm the final headcount', description: 'Share numbers with the caterer and venue.', priority: 'high', relativeDeadline: '3 days before' },
    ],
  };
}

const ENGAGEMENT = celebrationTemplate('Engagement');
const ANNIVERSARY = celebrationTemplate('Anniversary');
const BABY_SHOWER = celebrationTemplate('Baby Shower');
const FESTIVAL = celebrationTemplate('Festival');
const COMMUNITY = celebrationTemplate('Community Gathering');
const OTHER = celebrationTemplate('Celebration');

export const EVENT_TEMPLATES: Record<EventType, EventTypeTemplate> = {
  wedding: WEDDING,
  birthday: BIRTHDAY,
  corporate: CORPORATE,
  engagement: ENGAGEMENT,
  anniversary: ANNIVERSARY,
  'baby-shower': BABY_SHOWER,
  festival: FESTIVAL,
  community: COMMUNITY,
  other: OTHER,
};

/** Risks that apply to every event type. */
export const COMMON_RISKS = [
  { title: 'Vendor cancellation or no-show', mitigation: 'Get written contracts with cancellation terms and keep one backup shortlisted vendor per critical category.' },
  { title: 'Guest count change late in planning', mitigation: 'Track RSVPs centrally and confirm final numbers with your caterer at least a week before the event.' },
  { title: 'Budget overrun from add-ons', mitigation: 'Log every change against the category budget in the Budget tab and reserve the contingency for genuine surprises only.' },
  { title: 'Schedule overrun on the day', mitigation: 'Build 15-minute buffers between programme items and appoint one timekeeper with the run-of-show.' },
  { title: 'Power or sound failure', mitigation: "Confirm the venue's power capacity and backup generator, and test microphones and speakers before guests arrive." },
  { title: 'Dietary or allergy incidents', mitigation: 'Label every dish, brief serving staff on allergens, and keep a written allergen list from your caterer.' },
];

/** Extra risks depending on the venue setup. */
export function venueRisks(preference: VenuePreference): { title: string; mitigation: string } {
  switch (preference) {
    case 'outdoor':
      return {
        title: 'Weather disruption (outdoor venue)',
        mitigation: 'Arrange shade or heating as needed, secure lightweight decor against wind, and hold a covered backup space on standby.',
      };
    case 'indoor':
      return {
        title: 'Indoor access and setup window',
        mitigation: 'Confirm the setup and teardown window in writing, including loading access, lift bookings and key collection.',
      };
    case 'mixed':
      return {
        title: 'Indoor/outdoor transition gaps',
        mitigation: 'Plan the indoor fallback for every outdoor segment and confirm the covered path between the two areas.',
      };
    default:
      return {
        title: 'Venue not yet decided',
        mitigation: 'Finalise the venue early — capacity, catering, transport and most other decisions depend on it.',
      };
  }
}
