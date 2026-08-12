/** Placeholder content for pre-database development.
 *
 *  Every page reads through the async accessors at the bottom of this file,
 *  never the arrays directly — so switching to Supabase means reimplementing
 *  four functions and deleting the data, with no page changes.
 *
 *  All people here are fictional. Real member details never live in this repo. */

export type StorySummary = {
  slug: string;
  title: string;
  dateLabel: string;
  dek: string;
  stats: string[];
  heroUrl?: string | null;
};

export type Story = StorySummary & {
  body: string[];
  attendeeCount: number;
  carBreakdown: { label: string; count: number }[];
  routeLabel?: string;
};

const stories: Story[] = [
  {
    slug: "napa-run",
    title: "Napa Run",
    dateLabel: "October 10, 2026",
    dek: "21 cars. 146 miles. One very long lunch.",
    stats: ["21 cars", "146 miles", "one very long lunch"],
    routeLabel: "San Francisco → Napa Valley",
    attendeeCount: 21,
    carBreakdown: [
      { label: "Audi R8", count: 8 },
      { label: "Porsche 911", count: 5 },
      { label: "Ferrari", count: 2 },
      { label: "McLaren", count: 2 },
      { label: "Lamborghini", count: 1 },
      { label: "Other", count: 3 },
    ],
    body: [
      "The Golden Gate at 7:15 is the only time it belongs to anyone. Twenty-one cars went over it in a loose line, and by the time the fog gave up somewhere past San Rafael the group had already sorted itself into the people who wanted to press on and the people who wanted to talk.",
      "128 through the hills was the reason for the day. Tight, badly surfaced in the good way, and empty enough that nobody had to make a decision they would regret. The R8s sounded like the road was theirs. The GT3 disagreed, loudly.",
      "Lunch was supposed to be ninety minutes. It was three hours. Nobody minded, and two people have since bought cars because of conversations that happened at that table.",
    ],
  },
  {
    slug: "skyline-morning-run",
    title: "Skyline Morning Run",
    dateLabel: "September 12, 2026",
    dek: "18 cars. 74 miles. Home before most people were up.",
    stats: ["18 cars", "74 miles"],
    routeLabel: "Skyline → Alice's → Half Moon Bay",
    attendeeCount: 18,
    carBreakdown: [
      { label: "Audi R8", count: 7 },
      { label: "Porsche 911", count: 4 },
      { label: "BMW M", count: 3 },
      { label: "Lotus", count: 2 },
      { label: "Other", count: 2 },
    ],
    body: [
      "Meet at 6:45, depart at 7:00, and the club is unusually good at both. Eighteen cars left on time in the half-dark and picked up Skyline while the ridge was still under cloud.",
      "Alice's at 8:30 is a scene whether you want one or not. We stayed twenty minutes, drank bad coffee, answered questions about the camo R8, and dropped down 84 to the coast.",
      "Breakfast in Half Moon Bay, everyone home by noon. The best kind of Saturday: over before it costs you the day.",
    ],
  },
  {
    slug: "laguna-seca",
    title: "Laguna Seca",
    dateLabel: "August 22, 2026",
    dek: "14 cars, one corkscrew, zero incidents.",
    stats: ["14 cars", "full day"],
    routeLabel: "WeatherTech Raceway Laguna Seca",
    attendeeCount: 14,
    carBreakdown: [
      { label: "Porsche 911", count: 5 },
      { label: "Audi R8", count: 4 },
      { label: "McLaren", count: 2 },
      { label: "Corvette", count: 2 },
      { label: "Other", count: 1 },
    ],
    body: [
      "Six novices, four people who should know better, and four who genuinely do. Instruction in the morning, open sessions after lunch, and a long conversation in the paddock about tyre pressures that nobody won.",
      "The Corkscrew humbles everyone the first time and most people the second. By the last session the group had stopped chasing lap times and started chasing each other, which is more fun and considerably slower.",
      "Everything went home on its own wheels.",
    ],
  },
];

/* -- Accessors. Swap these bodies for Supabase queries; pages stay put. -- */

export async function getStories(): Promise<StorySummary[]> {
  return stories;
}

export async function getStory(slug: string): Promise<Story | null> {
  return stories.find((s) => s.slug === slug) ?? null;
}

export async function getStorySlugs(): Promise<string[]> {
  return stories.map((s) => s.slug);
}
