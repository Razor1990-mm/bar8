import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/Button";
import { togglePublish } from "./actions";

export const metadata: Metadata = { title: "Events · Admin" };

/** Event list with publish toggles. Creation/editing form is the next
 *  slice; publish state is the immediately-useful control. */
export default async function EventsAdminPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, category, starts_at, capacity, status, luma_event_url")
    .order("starts_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="type-display mb-10 text-3xl md:text-5xl">Events</h1>
      <div className="space-y-0">
        {(events ?? []).map((e) => (
          <article
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline py-5"
          >
            <div>
              <h2 className="font-medium">{e.title}</h2>
              <p className="type-data mt-1 text-sm text-muted">
                {new Date(e.starts_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · "}
                {e.category}
                {e.capacity ? ` · cap ${e.capacity}` : ""}
                {e.luma_event_url ? " · Luma linked" : " · no Luma URL"}
              </p>
            </div>
            <form action={togglePublish} className="flex items-center gap-4">
              <input type="hidden" name="id" value={e.id} />
              <span className="type-label">{e.status}</span>
              <Button type="submit" variant="ghost">
                {e.status === "published" ? "Unpublish" : "Publish"}
              </Button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
