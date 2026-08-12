import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = {
  title: "Request to Join",
  description: "Tell us what you drive and why.",
};

export default function JoinPage() {
  return (
    <main className="relative flex-1">
      <PublicNav />
      <div className="mx-auto max-w-xl px-6 pb-24 pt-32 md:pt-44">
        <p className="type-label mb-6">Request to Join</p>
        <h1 className="type-display mb-6 text-4xl md:text-6xl">
          Tell us about yourself.
        </h1>
        <p className="type-editorial mb-12 text-muted">
          Applications are read by a person, not a scoring system. The car
          matters less than why you drive it.
        </p>
        <JoinForm />
      </div>
    </main>
  );
}
