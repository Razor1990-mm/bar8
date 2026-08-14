import type { Metadata } from "next";
import Link from "next/link";
import { ClubImage } from "@/components/ClubImage";
import { ButtonLink } from "@/components/Button";
import { createClient } from "@/lib/supabase/server";
import { buildCarLabel } from "@/lib/data";

export const metadata: Metadata = { title: "Garage" };

/** The signed-in viewer's own garage. Cars are queried by profile_id for
 *  clarity; RLS (cars_select_members) is the real enforcement layer. */
export default async function GaragePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  let cars: {
    id: string;
    label: string;
    exteriorColor: string | null;
    isPrimary: boolean;
  }[] = [];

  if (user) {
    const [{ data: profile }, { data: carRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("cars")
        .select(
          "id, year, make, model, trim, exterior_color, is_primary, sort_order",
        )
        .eq("profile_id", user.id)
        .order("sort_order", { ascending: true })
        .limit(50),
    ]);

    firstName = (profile?.first_name as string | undefined) ?? null;
    cars = (carRows ?? []).map((c) => ({
      id: c.id as string,
      label: buildCarLabel(
        c.year as number | null,
        c.make as string,
        c.model as string,
        c.trim as string | null,
      ),
      exteriorColor: c.exterior_color as string | null,
      isPrimary: c.is_primary as boolean,
    }));
  }

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10 md:px-12 md:py-16">
      <div className="mb-10 flex items-end justify-between">
        <h1 className="type-display text-4xl md:text-6xl">
          {firstName ? `${firstName}'s Garage` : "Garage"}
        </h1>
        <ButtonLink href="/garage/new" variant="ghost">
          Add a car +
        </ButtonLink>
      </div>

      <div className="space-y-14">
        {cars.map((car) => (
          <article key={car.id}>
            <Link href={`/garage/${car.id}/edit`}>
              <ClubImage
                alt={car.label}
                className="mb-5 aspect-[3/2] w-full md:aspect-[21/9]"
              />
            </Link>
            <div className="flex items-baseline justify-between">
              <Link href={`/garage/${car.id}/edit`} className="group">
                <h2 className="type-display text-2xl transition-colors group-hover:text-muted md:text-4xl">
                  {car.label}
                </h2>
              </Link>
              {car.isPrimary && <span className="type-label">Primary</span>}
            </div>
            {car.exteriorColor && (
              <p className="type-label mt-2">{car.exteriorColor}</p>
            )}
          </article>
        ))}
        {cars.length === 0 && (
          <p className="type-editorial text-muted">
            No cars yet — add your first one.
          </p>
        )}
      </div>
    </main>
  );
}
