/** Oversized number + small-caps label — the BAR8 data signature.
 *  `18 CARS · 74 MILES` is brand voice; always tabular numerals. */
export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="type-data text-3xl md:text-4xl leading-none">{value}</span>
      <span className="type-label">{label}</span>
    </div>
  );
}

/** Inline stat row, e.g. under an event card: `18 cars · 74 miles` */
export function StatLine({ items }: { items: string[] }) {
  return (
    <span className="type-data text-sm text-muted">
      {items.join(" · ")}
    </span>
  );
}
