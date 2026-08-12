import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/Button";
import { toggleActive } from "./actions";

export const metadata: Metadata = { title: "Members · Admin" };

export default async function MembersAdminPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, city, status, is_admin, member_since")
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <div>
      <h1 className="type-display mb-10 text-3xl md:text-5xl">Members</h1>
      <div>
        {(members ?? []).map((m) => (
          <article
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline py-4"
          >
            <div>
              <span className="font-medium">
                {m.first_name} {m.last_name}
              </span>
              <span className="type-data ml-3 text-sm text-muted">
                {m.city ?? "—"}
                {m.is_admin ? " · admin" : ""}
              </span>
            </div>
            <form action={toggleActive} className="flex items-center gap-4">
              <input type="hidden" name="id" value={m.id} />
              <span className="type-label">{m.status}</span>
              <Button type="submit" variant="ghost">
                {m.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
