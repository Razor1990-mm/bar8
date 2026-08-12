/** Hairline rule — BAR8 uses these instead of card borders/shadows. */
export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-hairline ${className}`} />;
}
