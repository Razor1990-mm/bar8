import type { Metadata } from "next";
import { ClubImage } from "@/components/ClubImage";
import { Button } from "@/components/Button";
import { getMember } from "@/lib/fixtures";

export const metadata: Metadata = { title: "Garage" };

/** The viewer's own garage. Hardcoded to Raza until auth lands; add/edit
 *  becomes live with Supabase (forms are Phase 5 wiring). */
export default async function GaragePage() {
  const member = await getMember("raza"); // TODO(auth): session profile
  const cars = member?.cars ?? [];

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10 md:px-12 md:py-16">
      <div className="mb-10 flex items-end justify-between">
        <h1 className="type-display text-4xl md:text-6xl">
          {member ? `${member.firstName}'s Garage` : "Garage"}
        </h1>
        <Button
          variant="ghost"
          disabled
          title="Available once accounts are live"
        >
          Add a car +
        </Button>
      </div>

      <div className="space-y-14">
        {cars.map((car) => (
          <article key={car.id}>
            <ClubImage
              alt={car.label}
              className="mb-5 aspect-[3/2] w-full md:aspect-[21/9]"
            />
            <div className="flex items-baseline justify-between">
              <h2 className="type-display text-2xl md:text-4xl">{car.label}</h2>
              {car.isPrimary && <span className="type-label">Primary</span>}
            </div>
            {car.exteriorColor && (
              <p className="type-label mt-2">{car.exteriorColor}</p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
