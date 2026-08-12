import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClubImage } from "@/components/ClubImage";
import { SectionHeader } from "@/components/SectionHeader";
import { Stat } from "@/components/Stat";
import { getMember, getMembers, getEvents } from "@/lib/data";

export async function generateStaticParams() {
  const members = await getMembers();
  return members.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/members/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const member = await getMember(slug);
  if (!member) return {};
  return { title: member.name };
}

/** Member profile — person, then garage, then participation. */
export default async function MemberProfilePage({
  params,
}: PageProps<"/members/[slug]">) {
  const { slug } = await params;
  const member = await getMember(slug);
  if (!member) notFound();

  const events = await getEvents();
  const attended = events.filter((e) =>
    e.attendance.some((a) => a.memberId === member.id),
  );

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10 md:px-12 md:py-16">
      <header className="mb-14 flex items-start gap-6 md:gap-10">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-charcoal text-2xl text-muted md:h-28 md:w-28">
          {member.firstName.charAt(0)}
        </span>
        <div>
          <h1 className="type-display text-3xl md:text-5xl">{member.name}</h1>
          <p className="type-label mt-3">
            {[member.city, member.role, `Member since ${member.memberSince}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>

      {member.bio && (
        <section className="mb-14">
          <SectionHeader kicker="About" className="mb-6" />
          <p className="type-editorial text-muted">{member.bio}</p>
        </section>
      )}

      <section className="mb-14">
        <SectionHeader kicker="Garage" className="mb-8" />
        {member.cars.length > 0 ? (
          <div className="space-y-10">
            {member.cars.map((car) => (
              <div key={car.id}>
                <ClubImage
                  alt={car.label}
                  className="mb-4 aspect-[3/2] w-full md:aspect-[21/9]"
                />
                <div className="flex items-baseline justify-between">
                  <h2 className="type-display text-xl md:text-3xl">
                    {car.label}
                  </h2>
                  {car.isPrimary && <span className="type-label">Primary</span>}
                </div>
                {car.exteriorColor && (
                  <p className="type-label mt-2">{car.exteriorColor}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="type-editorial border-t border-hairline pt-6 text-muted">
            Garage not filled in yet.
          </p>
        )}
      </section>

      <section className="mb-14">
        <SectionHeader kicker="Club" className="mb-8" />
        <Stat value={attended.length} label="Events attended" />
      </section>

      {attended.length > 0 && (
        <section>
          <SectionHeader kicker="Recent Events" className="mb-6" />
          <ul>
            {attended.map((e) => (
              <li key={e.slug} className="border-t border-hairline">
                <Link
                  href={`/events/${e.slug}`}
                  className="flex items-baseline justify-between py-4 transition-colors hover:text-bone"
                >
                  <span>{e.title}</span>
                  <span className="type-data text-sm text-muted">
                    {e.shortDateLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
