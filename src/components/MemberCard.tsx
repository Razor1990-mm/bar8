import Link from "next/link";
import Image from "next/image";

export type MemberCardData = {
  slug: string;
  name: string;
  city: string;
  role?: string | null; // "Founder" — shown sparingly, never a hierarchy
  primaryCar?: string | null; // "2017 Audi R8 V10+"
  avatarUrl?: string | null;
  carThumbUrl?: string | null;
};

/** Directory card — human first, car second, per the brief. */
export function MemberCard({ member }: { member: MemberCardData }) {
  return (
    <Link
      href={`/members/${member.slug}`}
      className="group block border-t border-hairline pt-4"
    >
      <div className="flex items-center gap-4">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-charcoal">
          {member.avatarUrl ? (
            <Image
              src={member.avatarUrl}
              alt={member.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg text-muted">
              {member.name.charAt(0)}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-medium">{member.name}</h3>
          <p className="type-label mt-0.5">
            {member.city}
            {member.role ? ` · ${member.role}` : ""}
          </p>
        </div>
      </div>
      {member.primaryCar && (
        <div className="mt-3 flex items-center gap-3">
          {member.carThumbUrl && (
            <span className="relative h-8 w-12 shrink-0 overflow-hidden bg-charcoal">
              <Image
                src={member.carThumbUrl}
                alt={member.primaryCar}
                fill
                sizes="48px"
                className="object-cover [filter:saturate(0.82)]"
              />
            </span>
          )}
          <span className="type-data truncate text-sm text-muted">
            {member.primaryCar}
          </span>
        </div>
      )}
    </Link>
  );
}
