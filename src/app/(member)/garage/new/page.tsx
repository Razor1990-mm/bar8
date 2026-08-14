import type { Metadata } from "next";
import { CarForm } from "@/components/CarForm";
import { createCarAction } from "@/app/(member)/garage/actions";

export const metadata: Metadata = { title: "Add a Car" };

export default function NewCarPage() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-10 md:px-12 md:py-16">
      <h1 className="type-display mb-10 text-4xl md:text-6xl">Add a Car</h1>
      <CarForm onSubmit={createCarAction} submitLabel="Add car" />
    </main>
  );
}
