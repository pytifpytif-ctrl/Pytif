/** Every homepage brief slide in exact section order — one readable card each. */

export const WHAT_IS_SLIDE_INDEX = 8

export const DAILY_SCHEDULE_ROWS = [
  { icon: 'clock', timeTop: '6:00 AM', labelBottom: 'Morning matatu', amount: 'Ksh 100' },
  { icon: 'clock', timeTop: '12:00 PM', labelBottom: 'Lunch', amount: 'Ksh 280' },
  { icon: 'clock', timeTop: '5:30 PM', labelBottom: 'Evening fare home', amount: 'Ksh 100' },
]

export const TRIP_WALLET_ROWS = [
  {
    icon: 'plus',
    timeTop: 'Add funds',
    labelBottom: 'Top up whenever you can',
    amount: 'Ksh 2,000',
    amountColor: '#059669',
  },
  {
    icon: 'lock',
    timeTop: 'Payout on trip day',
    labelBottom: 'Dec 20 at 6:00 AM',
    amount: 'Ksh 24,000',
    amountColor: '#059669',
  },
]

export const LANDING_SLIDES = [
  // Section 1 — Hero
  {
    id: 'hero-headline',
    section: 'hero',
    variant: 'dark',
    durationMs: 7500,
    type: 'hero-headline',
  },
  {
    id: 'hero-sub',
    section: 'hero',
    variant: 'dark',
    durationMs: 7000,
    type: 'hero-sub',
  },
  // Section 2 — Mirror
  {
    id: 'mirror-title',
    section: 'mirror',
    variant: 'gray',
    durationMs: 5000,
    type: 'mirror-title',
  },
  {
    id: 'scenario-1',
    section: 'mirror',
    variant: 'gray',
    durationMs: 6000,
    type: 'scenario',
    icon: 'moodSad',
    text: 'Money hits your Mpesa on Friday. Broke by Tuesday. Wondering how.',
  },
  {
    id: 'scenario-2',
    section: 'mirror',
    variant: 'gray',
    durationMs: 6500,
    type: 'scenario',
    icon: 'shoppingCart',
    text: "Bought something you didn't need. Now you can't afford something you do.",
  },
  {
    id: 'scenario-3',
    section: 'mirror',
    variant: 'gray',
    durationMs: 6000,
    type: 'scenario',
    icon: 'home',
    text: 'Bills are due. Food money is gone. You\'re borrowing again.',
  },
  {
    id: 'scenario-4',
    section: 'mirror',
    variant: 'gray',
    durationMs: 6500,
    type: 'scenario',
    icon: 'beach',
    text: 'That trip you wanted? Still "next month." Because the money never stays.',
  },
  {
    id: 'mirror-quote',
    section: 'mirror',
    variant: 'gray',
    durationMs: 8000,
    type: 'quote',
  },
  // Section 3 — What is Jiokoe
  {
    id: 'what-title',
    section: 'what',
    variant: 'light',
    durationMs: 6000,
    type: 'what-title',
  },
  {
    id: 'what-body',
    section: 'what',
    variant: 'light',
    durationMs: 8500,
    type: 'what-body',
  },
  {
    id: 'daily-label',
    section: 'what',
    variant: 'light',
    durationMs: 4500,
    type: 'card-label',
    label: 'Daily schedule example',
    icon: 'clock',
  },
  {
    id: 'daily-card',
    section: 'what',
    variant: 'light',
    durationMs: 8000,
    type: 'daily-card',
  },
  {
    id: 'connector',
    section: 'what',
    variant: 'light',
    durationMs: 9000,
    type: 'connector',
  },
  {
    id: 'trip-label',
    section: 'what',
    variant: 'light',
    durationMs: 4500,
    type: 'card-label',
    label: 'Trip wallet example',
    icon: 'beach',
  },
  {
    id: 'trip-card',
    section: 'what',
    variant: 'light',
    durationMs: 7500,
    type: 'trip-card',
  },
  {
    id: 'trip-close',
    section: 'what',
    variant: 'light',
    durationMs: 8000,
    type: 'trip-close',
  },
  // Section 4 — Promise
  {
    id: 'promise-header',
    section: 'promise',
    variant: 'dark',
    durationMs: 6500,
    type: 'promise-header',
  },
  {
    id: 'promise-1',
    section: 'promise',
    variant: 'dark',
    durationMs: 7500,
    type: 'promise-item',
    icon: 'lock',
    title: "You can't touch it",
    subtitle:
      "Once it's in, it's locked. The impulsive version of you cannot undo what the rational version decided.",
  },
  {
    id: 'promise-2',
    section: 'promise',
    variant: 'dark',
    durationMs: 7500,
    type: 'promise-item',
    icon: 'clock',
    title: 'Arrives exactly on time',
    subtitle: '6:00 AM transport. 12:00 PM lunch. Not "sometime today." The exact minute you said.',
  },
  {
    id: 'promise-3',
    section: 'promise',
    variant: 'dark',
    durationMs: 7000,
    type: 'promise-item',
    icon: 'phone',
    title: 'Straight to your Mpesa',
    subtitle: 'No extra apps. No new accounts. It hits your Mpesa number like any other send money.',
  },
  {
    id: 'promise-4',
    section: 'promise',
    variant: 'dark',
    durationMs: 7500,
    type: 'promise-item',
    icon: 'calculator',
    title: 'Exact amount. One prompt.',
    subtitle: 'We calculate everything upfront. One STK push. You lock it once and never think about it again.',
  },
  // Section 5 — Tagline
  {
    id: 'tagline',
    section: 'tagline',
    variant: 'light',
    durationMs: 7000,
    type: 'tagline',
  },
]
