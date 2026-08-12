/** Placeholder content for pre-database development.
 *
 *  Every page reads through the async accessors at the bottom of this file,
 *  never the arrays directly — so switching to Supabase means reimplementing
 *  four functions and deleting the data, with no page changes.
 *
 *  Members are real (founder-approved for this public repo): names, cities and
 *  cars only. Never add phone numbers, emails, or social handles here. */

export type Member = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  name: string;
  city: string | null;
  role: string | null;
  memberSince: string;
  bio: string | null;
  avatarUrl?: string | null;
  cars: Car[];
};

export type Car = {
  id: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  exteriorColor: string | null;
  isPrimary: boolean;
  ownership: "current" | "former";
  /** "2017 Audi R8 V10+" — the display line used everywhere */
  label: string;
};

export type ScheduleItem = { time: string; label: string };

export type ClubEvent = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: "drive" | "track" | "social" | "dinner" | "trip" | "access";
  dateLabel: string; // "Saturday, September 12"
  shortDateLabel: string; // "SEP 12"
  meetTime: string | null;
  departTime: string | null;
  startLocation: string | null;
  routeSummary: string | null;
  distanceMiles: number | null;
  estDriveMinutes: number | null;
  capacity: number | null;
  lumaUrl: string | null;
  whatsappUrl: string | null;
  schedule: ScheduleItem[];
  /** memberId → carId being brought (null = not yet chosen) */
  attendance: { memberId: string; carId: string | null }[];
  isPast: boolean;
  heroUrl?: string | null;
};

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

/* SAMPLE CONTENT: these three recaps are invented events written in the
 * intended editorial voice. Replace with real club history. */
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

/* -- Members (real; details pending for Ken and Mike) ------------------- */

const members: Member[] = [
  {
    id: "m-raza",
    slug: "raza",
    firstName: "Raza",
    lastName: "Rafiq",
    name: "Raza Rafiq",
    city: "Mountain View",
    role: "Founder",
    memberSince: "2026",
    bio: null,
    cars: [
      {
        id: "c-raza-r8",
        year: 2017,
        make: "Audi",
        model: "R8",
        trim: "V10 Plus",
        exteriorColor: "Matte Camo Green",
        isPrimary: true,
        ownership: "current",
        label: "2017 Audi R8 V10+",
      },
      {
        id: "c-raza-911",
        year: 2009,
        make: "Porsche",
        model: "911",
        trim: null,
        exteriorColor: null,
        isPrimary: false,
        ownership: "current",
        label: "2009 Porsche 911",
      },
    ],
  },
  {
    id: "m-ken",
    slug: "ken",
    firstName: "Ken",
    lastName: "Toy",
    name: "Ken Toy",
    city: null, // pending
    role: null,
    memberSince: "2026",
    bio: null,
    cars: [], // pending — car details from Ken
  },
  {
    id: "m-mike",
    slug: "mike",
    firstName: "Mike",
    lastName: "Hong",
    name: "Mike Hong",
    city: null, // pending
    role: null,
    memberSince: "2026",
    bio: null,
    cars: [], // pending — car details from Mike
  },
];

/* -- Events -------------------------------------------------------------
 * One realistic upcoming drive so every member surface has something to
 * render. Replace with the club's real calendar; date is deliberately
 * near-term relative to the Ken demo. */

const events: ClubEvent[] = [
  {
    id: "e-skyline",
    slug: "skyline-half-moon-bay",
    title: "Skyline → Alice's → Half Moon Bay",
    subtitle: "The classic loop, before the fog burns off.",
    category: "drive",
    dateLabel: "Saturday, September 12",
    shortDateLabel: "SEP 12",
    meetTime: "6:45 AM",
    departTime: "7:00 AM",
    startLocation: "Alice's Restaurant, Woodside",
    routeSummary: "Woodside → Skyline Blvd → Alice's → HWY 84 → Half Moon Bay",
    distanceMiles: 74,
    estDriveMinutes: 150,
    capacity: 25,
    lumaUrl: null, // pending — real Luma event
    whatsappUrl: null, // pending — group invite link
    schedule: [
      { time: "6:45 AM", label: "Meet" },
      { time: "7:00 AM", label: "Depart" },
      { time: "8:30 AM", label: "Coffee at Alice's" },
      { time: "9:15 AM", label: "Down 84 to the coast" },
      { time: "10:00 AM", label: "Breakfast, Half Moon Bay" },
    ],
    attendance: [
      { memberId: "m-raza", carId: "c-raza-r8" },
      { memberId: "m-ken", carId: null },
      { memberId: "m-mike", carId: null },
    ],
    isPast: false,
  },
];

/* -- Accessors. Swap these bodies for Supabase queries; pages stay put. -- */

export async function getMembers(): Promise<Member[]> {
  return members;
}

export async function getMember(slug: string): Promise<Member | null> {
  return members.find((m) => m.slug === slug) ?? null;
}

export async function getEvents(): Promise<ClubEvent[]> {
  return events;
}

export async function getEvent(slug: string): Promise<ClubEvent | null> {
  return events.find((e) => e.slug === slug) ?? null;
}

export async function getNextEvent(): Promise<ClubEvent | null> {
  return events.find((e) => !e.isPast) ?? null;
}

/** Resolve an event's attendance into member + chosen-car pairs. */
export async function getEventAttendees(
  event: ClubEvent,
): Promise<{ member: Member; car: Car | null }[]> {
  return event.attendance
    .map((a) => {
      const member = members.find((m) => m.id === a.memberId);
      if (!member) return null;
      const car = member.cars.find((c) => c.id === a.carId) ?? null;
      return { member, car };
    })
    .filter((x): x is { member: Member; car: Car | null } => x !== null);
}

export async function getStories(): Promise<StorySummary[]> {
  return stories;
}

export async function getStory(slug: string): Promise<Story | null> {
  return stories.find((s) => s.slug === slug) ?? null;
}

export async function getStorySlugs(): Promise<string[]> {
  return stories.map((s) => s.slug);
}
