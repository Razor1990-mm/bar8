import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

/** Viewer edits their own profile. proxy.ts already fail-closed gates
 *  /settings to an authenticated session; the redirect here is a second
 *  line of defense in case the profile row is missing (e.g. pending
 *  applicant without a profiles row yet). */
export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  return (
    <main className="mx-auto max-w-md px-6 py-10 md:px-12 md:py-16">
      <p className="type-label mb-6">Settings</p>
      <h1 className="type-display mb-10 text-3xl md:text-5xl">
        Your Profile
      </h1>
      <SettingsForm viewer={viewer} />
    </main>
  );
}
