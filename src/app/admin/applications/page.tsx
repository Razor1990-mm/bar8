import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/Button";
import { approveApplication, declineApplication } from "./actions";

export const metadata: Metadata = { title: "Applications · Admin" };

/** The application queue — the club's front door. Newest first, decisions
 *  inline, no modal ceremony. */
export default async function ApplicationsAdminPage() {
  const supabase = await createClient();
  const { data: apps } = await supabase
    .from("membership_applications")
    .select(
      "id, first_name, last_name, email, phone, city, primary_car, other_cars, referred_by, about, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const open = (apps ?? []).filter(
    (a) => a.status === "new" || a.status === "reviewing",
  );
  const decided = (apps ?? []).filter(
    (a) => a.status === "approved" || a.status === "declined",
  );

  return (
    <div>
      <h1 className="type-display mb-2 text-3xl md:text-5xl">Applications</h1>
      <p className="type-data mb-10 text-muted">{open.length} awaiting review</p>

      {open.length === 0 && (
        <p className="type-editorial border-t border-hairline pt-6 text-muted">
          Queue is clear.
        </p>
      )}

      <div className="space-y-10">
        {open.map((a) => (
          <article key={a.id} className="border-t border-hairline pt-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-medium">
                {a.first_name} {a.last_name}
              </h2>
              <span className="type-data text-sm text-muted">
                {new Date(a.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <dl className="type-data mb-4 grid grid-cols-1 gap-x-8 gap-y-1 text-sm text-muted md:grid-cols-2">
              <div>{a.email}</div>
              {a.phone && <div>{a.phone}</div>}
              {a.city && <div>{a.city}</div>}
              {a.primary_car && <div className="text-bone">{a.primary_car}</div>}
              {a.other_cars && <div>Also: {a.other_cars}</div>}
              {a.referred_by && <div>Referred by {a.referred_by}</div>}
            </dl>
            {a.about && (
              <p className="type-editorial mb-5 text-bone/90">{a.about}</p>
            )}
            <div className="flex gap-4">
              <form action={approveApplication}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit">Approve</Button>
              </form>
              <form action={declineApplication}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" variant="ghost">
                  Decline
                </Button>
              </form>
            </div>
          </article>
        ))}
      </div>

      {decided.length > 0 && (
        <section className="mt-16">
          <p className="type-label mb-4">Decided</p>
          <ul>
            {decided.map((a) => (
              <li
                key={a.id}
                className="flex items-baseline justify-between border-t border-hairline py-3"
              >
                <span>
                  {a.first_name} {a.last_name}
                </span>
                <span
                  className={`type-label ${a.status === "approved" ? "" : "text-muted"}`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
