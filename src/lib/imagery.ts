/** Static editorial imagery (licensed stock — see public/imagery/CREDITS.md).
 *
 *  Interim layer: events and stories eventually carry their own photography
 *  in Storage (hero_photo_path). Until then, slugs resolve here so nothing
 *  renders an empty charcoal slot. Real photos win automatically — the data
 *  layer only falls back to this map when the DB has no hero. */

const eventImagery: Record<string, string> = {
  "skyline-half-moon-bay": "/imagery/story-skyline.jpg",
};

const storyImagery: Record<string, string> = {
  "napa-run": "/imagery/story-napa.jpg",
  "skyline-morning-run": "/imagery/story-skyline.jpg",
  "laguna-seca": "/imagery/story-laguna.jpg",
};

const categoryImagery: Record<string, string> = {
  drive: "/imagery/experience-drive.jpg",
  track: "/imagery/experience-track.jpg",
  dinner: "/imagery/experience-dinner.jpg",
  social: "/imagery/club.jpg",
  trip: "/imagery/experience-trip.jpg",
  access: "/imagery/experience-access.jpg",
};

export function eventHero(slug: string, category?: string): string | null {
  return (
    eventImagery[slug] ?? (category ? (categoryImagery[category] ?? null) : null)
  );
}

export function storyHero(slug: string): string | null {
  return storyImagery[slug] ?? null;
}
