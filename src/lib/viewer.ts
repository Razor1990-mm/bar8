import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  city: string | null;
  bio: string | null;
  instagram: string | null;
  linkedin: string | null;
  avatar_path: string | null;
  is_admin: boolean;
  status: string;
};

/** Server-only: the signed-in member's profile row, or null if unauthenticated
 *  or the profile row doesn't exist (e.g. pending applicant). Cached per
 *  request via React `cache()` so multiple callers in one render share a
 *  single query. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, slug, city, bio, instagram, linkedin, avatar_path, is_admin, status",
    )
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return profile as Viewer;
});
