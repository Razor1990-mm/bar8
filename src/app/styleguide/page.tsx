import { Stat, StatLine } from "@/components/Stat";
import { Rule } from "@/components/Rule";
import { AvatarStack } from "@/components/AvatarStack";
import { EventCard } from "@/components/EventCard";
import { MemberCard } from "@/components/MemberCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Button, ButtonLink } from "@/components/Button";

/** Internal design-system review page. Not linked from nav; remove or
 *  gate before launch. Fixture data only. */

const members = [
  { id: "1", name: "Raza" },
  { id: "2", name: "Alex" },
  { id: "3", name: "Jordan" },
  { id: "4", name: "Sam" },
  { id: "5", name: "Priya" },
  { id: "6", name: "Marcus" },
  { id: "7", name: "Dana" },
];

export default function Styleguide() {
  return (
    <main className="mx-auto max-w-[1120px] space-y-16 px-6 py-16 md:px-12">
      <header>
        <p className="type-label mb-2">BAR8 · Design System</p>
        <h1 className="type-display text-4xl md:text-6xl">Styleguide</h1>
      </header>

      <section>
        <SectionHeader kicker="Type voices" className="mb-8" />
        <h2 className="type-display text-5xl md:text-7xl">
          Built to be driven.
        </h2>
        <p className="type-editorial mt-6 text-muted">
          Editorial voice — comfortable measure, used for stories and recaps.
          The community began around Audi R8 owners but includes members with
          other enthusiast and performance cars.
        </p>
        <p className="type-label mt-6">
          Label voice · Small caps · Tracked wide
        </p>
        <p className="type-data mt-2 text-2xl">21 / 25 · 146 miles · 6:45 AM</p>
      </section>

      <section>
        <SectionHeader kicker="Stats" className="mb-8" />
        <div className="flex gap-12">
          <Stat value={18} label="Cars" />
          <Stat value={74} label="Miles" />
          <Stat value={12} label="Events attended" />
        </div>
        <div className="mt-6">
          <StatLine items={["18 cars", "74 miles", "one very long lunch"]} />
        </div>
      </section>

      <section>
        <SectionHeader kicker="Actions" className="mb-8" />
        <div className="flex flex-wrap items-center gap-6">
          <Button>RSVP</Button>
          <Button variant="signal">You&rsquo;re going ✓</Button>
          <ButtonLink href="/club" variant="ghost">
            Explore the Club →
          </ButtonLink>
        </div>
      </section>

      <section>
        <SectionHeader kicker="Social proof" className="mb-8" />
        <AvatarStack members={members} />
        <p className="type-data mt-4 text-sm text-muted">
          R8 V10+ · GT3 · 750S · Huracán · 911 Turbo S +16
        </p>
      </section>

      <section>
        <SectionHeader kicker="Event cards" className="mb-8" />
        <div className="grid gap-10 md:grid-cols-3">
          <EventCard
            event={{
              slug: "napa-run",
              title: "Napa Run",
              dateLabel: "OCT 10",
              category: "DRIVE",

              attending: 21,
              capacity: 25,
              members,
            }}
          />
          <EventCard
            event={{
              slug: "cars-and-coffee",
              title: "Cars & Coffee",
              dateLabel: "SEP 26",
              category: "SOCIAL",

              attending: 32,
              members: members.slice(0, 4),
            }}
          />
          <EventCard
            event={{
              slug: "laguna-seca",
              title: "Laguna Seca",
              dateLabel: "OCT 24",
              category: "TRACK",

              attending: 14,
              capacity: 20,
              members: members.slice(2),
            }}
          />
        </div>
      </section>

      <section>
        <SectionHeader kicker="Member cards" className="mb-8" />
        <div className="grid gap-8 md:grid-cols-3">
          <MemberCard
            member={{
              slug: "raza",
              name: "Raza",
              city: "Mountain View",
              role: "Founder",
              primaryCar: "2017 Audi R8 V10+",
            }}
          />
          <MemberCard
            member={{
              slug: "alex",
              name: "Alex",
              city: "San Francisco",
              primaryCar: "2024 Porsche 911 GT3",
            }}
          />
          <MemberCard
            member={{ slug: "dana", name: "Dana", city: "Palo Alto" }}
          />
        </div>
      </section>

      <Rule />
      <p className="type-label pb-8">Internal — remove before launch</p>
    </main>
  );
}
