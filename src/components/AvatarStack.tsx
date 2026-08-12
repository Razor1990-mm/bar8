import Image from "next/image";

export type AvatarStackMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

/** Overlapping member avatars + overflow count — the social-proof row.
 *  Attendance visibility is the product's engine; this appears on every
 *  event surface. No links here; parent decides tap behavior. */
export function AvatarStack({
  members,
  max = 5,
  size = 32,
}: {
  members: AvatarStackMember[];
  max?: number;
  size?: number;
}) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <span
          key={m.id}
          className="relative rounded-full border-2 border-ink bg-charcoal overflow-hidden shrink-0"
          style={{ width: size, height: size, marginLeft: i === 0 ? 0 : -size / 4 }}
          title={m.name}
        >
          {m.avatarUrl ? (
            <Image src={m.avatarUrl} alt={m.name} fill sizes={`${size}px`} className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-muted">
              {m.name.charAt(0)}
            </span>
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span className="type-data ml-2 text-sm text-muted">+{overflow}</span>
      )}
    </div>
  );
}
