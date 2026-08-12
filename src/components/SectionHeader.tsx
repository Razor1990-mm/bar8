import { Rule } from "./Rule";

/** Section opener: hairline, small-caps kicker, optional display title.
 *  e.g. kicker="NEXT DRIVE" title="Skyline → Alice's → Half Moon Bay" */
export function SectionHeader({
  kicker,
  title,
  className = "",
}: {
  kicker: string;
  title?: string;
  className?: string;
}) {
  return (
    <header className={className}>
      <Rule className="mb-4" />
      <p className="type-label">{kicker}</p>
      {title && (
        <h2 className="type-display mt-3 text-3xl md:text-5xl">{title}</h2>
      )}
    </header>
  );
}
