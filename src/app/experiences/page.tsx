import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { ClubImage } from "@/components/ClubImage";
import { Rule } from "@/components/Rule";

export const metadata: Metadata = {
  title: "Experiences",
  description:
    "Morning drives, track days, small tables, long weekends and access to things worth seeing.",
};

/** The five experience categories from the brief, presented editorially —
 *  alternating full-bleed imagery, not a feature grid. Category keys match
 *  the `events.category` enum so this page and the events filter agree. */
const experiences = [
  {
    key: "drive",
    name: "Morning Drives",
    line: "Great roads, early starts, breakfast afterward.",
    body: "Out before the traffic, back before the day begins. Skyline, Alice's, the coast — the roads are the reason, the table afterward is why people stay.",
  },
  {
    key: "track",
    name: "Track",
    line: "Track days, driving experiences and motorsport.",
    body: "Laguna Seca, Thunderhill, Sonoma. Instruction for anyone who wants it, no pressure on anyone who doesn't. Bring the car you actually want to drive.",
  },
  {
    key: "dinner",
    name: "Tables",
    line: "Small dinners and gatherings.",
    body: "Ten or twelve people, one long table, no agenda. The part of the club that has nothing to do with cars and somehow matters most.",
  },
  {
    key: "trip",
    name: "Weekends",
    line: "Napa, Tahoe, Los Angeles, Monterey, Vegas.",
    body: "Two or three days, a real route, somewhere worth arriving at. Car Week, wine country, the desert in winter.",
  },
  {
    key: "access",
    name: "Access",
    line: "Garages, collections, launches.",
    body: "Private collections that are not open to the public, workshops mid-restoration, the occasional launch. Doors that open because someone in the group knows someone.",
  },
];

export default function ExperiencesPage() {
  return (
    <main className="relative flex-1">
      <PublicNav />

      <section className="px-6 pb-12 pt-32 md:px-12 md:pb-20 md:pt-44">
        <p className="type-label mb-6">Experiences</p>
        <h1 className="type-display max-w-3xl text-4xl md:text-7xl">
          What we actually do.
        </h1>
      </section>

      {experiences.map((x, i) => (
        <article key={x.key} className="mb-16 md:mb-24">
          <ClubImage
            alt={x.name}
            className="aspect-[4/3] w-full md:aspect-[21/9]"
          />
          <div className="mx-auto max-w-[1120px] px-6 pt-8 md:px-12 md:pt-10">
            <div className="grid gap-6 md:grid-cols-[1fr_2fr] md:gap-16">
              <div>
                <p className="type-label mb-3">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="type-display text-3xl md:text-4xl">{x.name}</h2>
              </div>
              <div>
                <p className="mb-4 text-xl text-bone md:text-2xl">{x.line}</p>
                <p className="type-editorial text-muted">{x.body}</p>
              </div>
            </div>
          </div>
        </article>
      ))}

      <div className="mx-auto max-w-[1120px] px-6 pb-24 md:px-12">
        <Rule />
        <p className="type-label pt-6">
          Members see the full calendar. Everyone else sees what we have already
          done.
        </p>
      </div>
    </main>
  );
}
