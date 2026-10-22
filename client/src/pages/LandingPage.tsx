import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  ChefHat,
  ClipboardCheck,
  Handshake,
  LayoutDashboard,
  Lock,
  Menu,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Logo, Wordmark } from '../components/ui/Logo.js';
import { ButtonLink } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Feedback.js';

const CATEGORIES = [
  { icon: Users, label: 'Weddings & engagements' },
  { icon: CalendarRange, label: 'Birthdays & anniversaries' },
  { icon: Sparkles, label: 'Baby showers' },
  { icon: Palette, label: 'Festivals & cultural events' },
  { icon: Handshake, label: 'Community events' },
  { icon: LayoutDashboard, label: 'Corporate events' },
];

const STEPS = [
  {
    title: 'Describe your celebration',
    body: 'Tell Eventra AI the event type, date, location, guest count, budget and the preferences that matter to you.',
  },
  {
    title: 'Get a structured plan',
    body: 'Receive a theme, realistic budget breakdown, timeline, vendor checklist, menu ideas and risk mitigations.',
  },
  {
    title: 'Refine and track',
    body: 'Chat with the assistant, manage expenses and tasks, and print or export a report that reflects your saved data.',
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI event planning',
    body: 'A genuine Gemini-powered planning engine that adapts to your event type, budget, location and guest count.',
  },
  {
    icon: Wallet,
    title: 'Budget planner',
    body: 'Deterministic totals, category allocation, estimated vs actual costs, contingency and overrun warnings.',
  },
  {
    icon: CalendarRange,
    title: 'Timeline & checklist',
    body: 'Day-of schedules, preparation milestones, priorities, deadlines and overlap detection.',
  },
  {
    icon: ClipboardCheck,
    title: 'Vendor workspace',
    body: 'Track vendors, quotes, statuses and follow-ups. Suggestions are evaluation criteria, not fabricated listings.',
  },
  {
    icon: ChefHat,
    title: 'Menu planner',
    body: 'Guest-count-aware menus with dietary labelling and allergy guidance you can act on safely.',
  },
  {
    icon: BadgeCheck,
    title: 'Invitation generator',
    body: 'Formal, casual, WhatsApp and social copy in English, Hindi or Hinglish — ready to copy and edit.',
  },
];

const FAQS = [
  {
    q: 'Are the budgets and vendor prices real quotes?',
    a: 'No. Generated budgets, vendor suggestions and schedules are illustrative estimates. Always confirm prices and availability directly with vendors before booking.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In this version your events are stored locally in your browser using localStorage. Nothing is uploaded to Eventra AI servers, and there are no user accounts. Clear your browser storage to delete your data.',
  },
  {
    q: 'Do I need an API key to use the app?',
    a: 'No. Everything works out of the box: plans, menus, invitations, chat suggestions, budgets, timelines, tasks and reports are produced by Eventra’s built-in local engine when no key is configured — and the app always labels which engine produced your content. If the site owner later adds a Gemini API key, responses upgrade to AI-authored output with no other changes.',
  },
  {
    q: 'Is my data synced across devices?',
    a: 'Not in this initial version. Local-only storage means your data stays on the device you used. A server-side store is planned for the future.',
  },
];

const SAMPLE_BUDGET = [
  { name: 'Venue', value: 150000 },
  { name: 'Catering', value: 120000 },
  { name: 'Decoration', value: 80000 },
  { name: 'Photography', value: 60000 },
  { name: 'Entertainment', value: 45000 },
];

const SAMPLE_TOTAL = 500000;

const NAV_LINKS = [
  { href: '#categories', label: 'Categories' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
];

function LandingNav() {
  const [open, setOpen] = useState(false);

  // Escape closes the mobile menu — standard disclosure behaviour.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-midnight/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="rounded-lg" aria-label="Eventra AI home">
          <span className="flex items-center gap-2.5">
            <Logo size={30} className="rounded-2xl ring-1 ring-white/15" />
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Eventra <span className="text-rose">AI</span>
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-white/80 md:flex" aria-label="Primary">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className="hover:text-white">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink to="/dashboard" className="hidden no-underline md:inline-flex">
            Open dashboard
          </ButtonLink>
          <button
            type="button"
            className="btn btn-secondary btn-sm border-white/20 bg-white/10 text-white hover:border-white/40 hover:text-white md:hidden"
            aria-expanded={open}
            aria-controls={open ? 'landing-mobile-nav' : undefined}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
            Menu
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="landing-mobile-nav"
          className="border-t border-white/10 px-4 py-3 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white"
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <ButtonLink to="/dashboard" className="mt-1 justify-center no-underline">
                Open dashboard
              </ButtonLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function LandingPage() {
  const sampleTotal = SAMPLE_BUDGET.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="min-h-screen bg-ivory">
      <LandingNav />

      <section className="bg-midnight text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral" className="bg-white/10 text-white">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Generative AI planning assistant
              </Badge>
              <Badge tone="neutral" className="bg-white/10 text-white">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Works without an API key
              </Badge>
            </div>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Your Next Celebration, <span className="text-rose">Perfectly Planned.</span>
            </h1>
            <p className="max-w-xl text-lg text-white/75">
              From weddings and birthdays to unforgettable community events, Eventra AI transforms your
              ideas into personalized plans, realistic budgets, and actionable checklists. No sign-up
              and no API key needed — the built-in planning engine works out of the box.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                to="/events/new"
                size="lg"
                className="bg-rose text-midnight no-underline hover:bg-rose/90"
              >
                Plan My Event <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <a
                href="#features"
                className="btn btn-secondary btn-lg border-white/20 bg-white/10 text-white no-underline hover:border-white/40 hover:text-white"
              >
                Explore Features
              </a>
            </div>
            <p className="text-xs text-white/55">
              Generated budgets and vendor suggestions are illustrative estimates — verify before booking.
            </p>
          </div>

          <div className="card overflow-hidden border-white/10 bg-midnight-2 p-0 shadow-lift">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <span className="text-sm font-semibold">Sample event plan</span>
              <span className="badge bg-violet-soft text-violet">Wedding · 250 guests</span>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Theme</p>
                <p className="mt-1 font-display text-lg">Royal Marigold</p>
                <div className="mt-2 flex gap-1.5">
                  {['#F5A7B8', '#7657E8', '#20876A'].map((color) => (
                    <span
                      key={color}
                      className="h-5 w-5 rounded-full border border-white/20"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Budget preview</p>
                <p className="mt-1 text-sm text-white/80">
                  ₹{sampleTotal.toLocaleString('en-IN')} of ₹{SAMPLE_TOTAL.toLocaleString('en-IN')} estimated
                </p>
                <div className="mt-2 space-y-1.5">
                  {SAMPLE_BUDGET.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs text-white/70">
                      <span className="w-20 shrink-0">{entry.name}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-violet"
                          style={{ width: `${(entry.value / SAMPLE_TOTAL) * 100}%` }}
                        />
                      </span>
                      <span className="w-16 text-right">
                        {Math.round((entry.value / SAMPLE_TOTAL) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                Next action: Finalise venue and send save-the-dates.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Celebrations we help you plan</h2>
        <p className="mt-2 text-slate">
          Nine event types, each with tailored planning, budget and cultural-aware suggestions.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(({ icon: Icon, label }) => (
            <div key={label} className="card flex items-center gap-4 px-5 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-soft text-violet">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-midnight-2">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-ivory-2 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="card px-5 py-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-slate">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Everything you need to plan well</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card px-5 py-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-soft text-violet">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-midnight py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Budget planning you can trust</h2>
            <p className="mt-3 text-white/75">
              Totals, percentages and overrun warnings are calculated deterministically from your saved
              expenses — never from AI arithmetic you cannot audit.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                'Estimated vs actual costs with remaining budget',
                'Contingency reserve and utilisation indicator',
                'Overrun warnings and largest cost drivers',
                'Custom categories and CSV export',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-rose" aria-hidden="true" />
                  <span className="text-white/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card bg-midnight-2 p-0 text-white">
            <div className="border-b border-white/10 px-5 py-3">
              <span className="text-sm font-semibold">Budget utilisation</span>
            </div>
            <div className="space-y-5 px-5 py-5">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Spent so far</span>
                  <span className="font-semibold">₹240,000 / ₹500,000</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[48%] rounded-full bg-violet" />
                </div>
              </div>
              <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
                Within budget · ₹260,000 remaining
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-white/60">Contingency</p>
                  <p className="mt-1 font-semibold">₹25,000 (5%)</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-white/60">Est. total</p>
                  <p className="mt-1 font-semibold">₹455,000</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">An assistant that knows your event</h2>
            <p className="mt-3 text-slate">
              Ask about budget cuts, rainy-day backup plans, menus for 100 guests, or what to finish this
              week. The assistant reasons over your saved event details — and never silently overwrites them.
            </p>
            <div className="mt-6 space-y-3">
              {[
                '“How can I reduce this wedding budget by 15%?”',
                '“Make a rainy-weather backup plan.”',
                '“Create a vegetarian menu for 100 guests.”',
              ].map((question) => (
                <div key={question} className="rounded-xl border border-midnight/10 bg-white px-4 py-3 text-sm text-midnight-2">
                  {question}
                </div>
              ))}
            </div>
          </div>
          <div className="card bg-white p-0">
            <div className="border-b border-midnight/8 px-5 py-3">
              <span className="text-sm font-semibold">AI planning assistant</span>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="max-w-[85%] rounded-2xl bg-violet-soft px-4 py-3 text-sm text-midnight-2">
                You could reduce catering by 12% with a set-menu instead of a buffet, and shift ₹20,000 of
                decor spend to reusable pieces.
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl bg-midnight px-4 py-3 text-sm text-white">
                Shall I list the exact changes before applying any of them?
              </div>
              <div className="rounded-xl border border-dashed border-midnight/15 bg-ivory px-4 py-3 text-xs text-slate">
                Recommendations are explained before anything is saved. Nothing changes until you confirm.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ivory-2 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card flex items-start gap-4 px-5 py-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-semibold">Privacy & security</h3>
                <p className="mt-1.5 text-sm text-slate">
                  No user accounts and no server-side storage of your events. API keys stay on the server,
                  inputs are validated, and AI output is re-checked before it is shown or saved.
                </p>
              </div>
            </div>
            <div className="card flex items-start gap-4 px-5 py-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-soft text-rose">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-semibold">Honest by design</h3>
                <p className="mt-1.5 text-sm text-slate">
                  AI figures are labelled as illustrative estimates. We do not fabricate vendor listings,
                  prices, ratings or availability, and we clearly report when AI is not configured.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-8 divide-y divide-midnight/10 rounded-2xl border border-midnight/10 bg-white">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-midnight marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {faq.q}
                  <span className="text-slate transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-slate">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-midnight py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-bold">Start planning something unforgettable</h2>
          <p className="mt-3 text-white/70">
            Create an event, generate a plan, and track every detail in one place.
          </p>
          <ButtonLink to="/events/new" size="lg" className="mt-6 bg-rose text-midnight no-underline hover:bg-rose/90">
            Plan My Event <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-midnight/8 bg-ivory py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Wordmark />
          <div className="text-xs text-slate">
            <p>Eventra AI · Every Celebration, Intelligently Planned.</p>
            <p className="mt-1">Generated content is illustrative and must be verified before booking.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
