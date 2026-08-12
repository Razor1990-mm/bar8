import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/Button";

export const metadata: Metadata = { title: "Member Login" };

/** Magic-link login. The form posts nowhere until Supabase auth lands —
 *  the page exists so the flow and layout are reviewable now. */
export default function LoginPage() {
  return (
    <main className="relative flex-1">
      <PublicNav />
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
        <p className="type-label mb-6">Member Login</p>
        <h1 className="type-display mb-10 text-3xl md:text-5xl">
          Welcome back.
        </h1>
        <form className="space-y-8">
          <label className="block">
            <span className="type-label">Email</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              className="w-full border-0 border-b border-hairline bg-transparent px-0 py-3 text-bone placeholder:text-muted/60 transition-colors focus:border-bone focus:outline-none focus:ring-0"
              placeholder="you@example.com"
            />
          </label>
          <Button
            type="button"
            disabled
            title="Login opens with member accounts"
          >
            Send sign-in link
          </Button>
          <p className="type-label">
            No passwords. We email you a link that signs you in.
          </p>
        </form>
      </div>
    </main>
  );
}
