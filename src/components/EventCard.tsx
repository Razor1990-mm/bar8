import Link from "next/link";
import { ClubImage } from "./ClubImage";
import { AvatarStack, type AvatarStackMember } from "./AvatarStack";

export type EventCardData = {
  slug: string;
  title: string;
  dateLabel: string; // "OCT 10"
  category: string; // "DRIVE" | "TRACK" | ...
  imageUrl: string;
  attending: number;
  capacity?: number | null;
  members?: AvatarStackMember[];
};

/** The tap target that arrives via WhatsApp. Image → data line → title →
 *  social proof. Hairline above, air below — never a boxed card. */
export function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link href={`/events/${event.slug}`} className="group block border-t border-hairline pt-4">
      <ClubImage
        src={event.imageUrl}
        alt={event.title}
        sizes="(max-width: 768px) 100vw, 33vw"
        className="aspect-[3/2] mb-4 transition-transform duration-500 group-hover:scale-[1.01]"
      />
      <p className="type-label mb-1.5">
        {event.dateLabel} · {event.category}
      </p>
      <h3 className="type-display text-xl md:text-2xl mb-2">{event.title}</h3>
      <div className="flex items-center justify-between">
        {event.members && event.members.length > 0 ? (
          <AvatarStack members={event.members} size={28} />
        ) : (
          <span />
        )}
        <span className="type-data text-sm text-muted">
          {event.capacity ? `${event.attending} / ${event.capacity}` : `${event.attending} going`}
        </span>
      </div>
    </Link>
  );
}
