import type { Metadata } from "next";
import { MemberCard } from "@/components/MemberCard";
import { getMembers } from "@/lib/fixtures";

export const metadata: Metadata = { title: "Members" };

/** Private directory — human first, car second. Search moves client-side
 *  when the roster is big enough to need it; with the founding group a
 *  simple server-rendered list is correct. */
export default async function MembersPage() {
  const members = await getMembers();

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10 md:px-12 md:py-16">
      <h1 className="type-display mb-3 text-4xl md:text-6xl">Members</h1>
      <p className="type-data mb-10 text-muted">
        {members.length} {members.length === 1 ? "member" : "members"}
      </p>

      <div className="grid gap-8 md:grid-cols-3">
        {members.map((m) => {
          const primary = m.cars.find((c) => c.isPrimary) ?? m.cars[0] ?? null;
          return (
            <MemberCard
              key={m.id}
              member={{
                slug: m.slug,
                name: m.name,
                city: m.city ?? "—",
                role: m.role,
                primaryCar: primary?.label ?? null,
                avatarUrl: m.avatarUrl,
              }}
            />
          );
        })}
      </div>
    </main>
  );
}
