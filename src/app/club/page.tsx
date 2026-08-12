import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { ClubImage } from "@/components/ClubImage";
import { Stat } from "@/components/Stat";
import { SectionHeader } from "@/components/SectionHeader";
import { ButtonLink } from "@/components/Button";

export const metadata: Metadata = {
  title: "The Club",
  description:
    "A private community built around great cars, great roads and the people behind the wheel.",
};

/** Public "Club" page — the brief's Community section. Brief, restrained,
 *  and explicit that eligibility is about people, not price or badge. */
export default function ClubPage() {
  return (
    <main className="relative flex-1">
      <PublicNav />

      <section className="px-6 pb-16 pt-32 md:px-12 md:pb-24 md:pt-44">
        <p className="type-label mb-6">The Club</p>
        <h1 className="type-display max-w-3xl text-4xl md:text-7xl">
          Cars are the introduction. The people are the point.
        </h1>
      </section>

      <ClubImage
        alt="Members gathered at an early morning meet"
        className="aspect-[4/5] w-full md:aspect-[21/9]"
      />

      <section className="mx-auto max-w-[1120px] px-6 py-16 md:px-12 md:py-24">
        <div className="type-editorial space-y-6 text-lg text-bone/90">
          <p>
            BAR8 began around a handful of Audi R8 owners who kept running into
            each other on the same roads before sunrise. It grew the way these
            things do — someone brought a friend, the friend brought a car
            nobody had seen before, and breakfast ran long.
          </p>
          <p>
            Today the group includes 911s and GT cars, Ferraris, McLarens,
            Lamborghinis, AMGs, M cars, Corvettes, Lotuses, and a steady supply
            of vintage and genuinely strange machinery. The R8s are still here.
            They are no longer the requirement.
          </p>
          <p className="text-bone">
            There is no minimum price, no approved badge list, and no waiting
            room. We care what you drive because of what it says about how you
            think — not what it cost.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pb-16 md:px-12 md:pb-24">
        <SectionHeader kicker="What that looks like" className="mb-10" />
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <Stat value="Early" label="Starts" />
          <Stat value="Great" label="Roads" />
          <Stat value="Small" label="Tables" />
          <Stat value="No" label="Dues" />
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pb-24 md:px-12 md:pb-32">
        <SectionHeader
          kicker="Membership"
          title="By introduction, mostly."
          className="mb-8"
        />
        <p className="type-editorial mb-10 text-muted">
          Most members arrive through someone already here. If that is not you,
          write to us anyway — tell us what you drive and why. Applications are
          read by a person.
        </p>
        <ButtonLink href="/join">Request to Join</ButtonLink>
      </section>
    </main>
  );
}
