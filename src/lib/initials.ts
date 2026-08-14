/** Derives a 1-2 char initials string for avatar badges, e.g. "Ken" "Ito" -> "KI". */
export function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const first = (firstName ?? "").trim().charAt(0);
  const last = (lastName ?? "").trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
}
