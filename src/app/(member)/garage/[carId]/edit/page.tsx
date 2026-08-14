import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CarForm } from "@/components/CarForm";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/server";
import { buildCarLabel } from "@/lib/data";
import {
  updateCarAction,
  deleteCarAction,
  makePrimaryAction,
} from "@/app/(member)/garage/actions";

export const metadata: Metadata = { title: "Edit Car" };

const carIdSchema = z.uuid();

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ carId: string }>;
}) {
  const { carId } = await params;
  const idParsed = carIdSchema.safeParse(carId);
  if (!idParsed.success) notFound();
  const validCarId = idParsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: car } = await supabase
    .from("cars")
    .select(
      "id, year, make, model, trim, exterior_color, interior_color, modifications, story, ownership, is_primary, profile_id",
    )
    .eq("id", validCarId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!car) notFound();

  const updateWithId = async (payload: Parameters<typeof updateCarAction>[1]) =>
    updateCarAction(validCarId, payload);

  async function handleDelete() {
    "use server";
    await deleteCarAction(validCarId);
  }

  async function handleMakePrimary() {
    "use server";
    await makePrimaryAction(validCarId);
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-10 md:px-12 md:py-16">
      <div className="mb-10 flex items-end justify-between">
        <h1 className="type-display text-4xl md:text-6xl">
          {buildCarLabel(
            car.year as number | null,
            car.make as string,
            car.model as string,
            car.trim as string | null,
          )}
        </h1>
        {!(car.is_primary as boolean) && (
          <form action={handleMakePrimary}>
            <Button type="submit" variant="ghost">
              Make primary
            </Button>
          </form>
        )}
      </div>

      <CarForm
        defaultValues={{
          year: car.year as number | null,
          make: car.make as string,
          model: car.model as string,
          trim: car.trim as string | null,
          exterior_color: car.exterior_color as string | null,
          interior_color: car.interior_color as string | null,
          modifications: car.modifications as string | null,
          story: car.story as string | null,
          ownership: car.ownership as "current" | "former",
        }}
        onSubmit={updateWithId}
        submitLabel="Save changes"
      />

      <form action={handleDelete} className="mt-10 border-t border-hairline pt-6">
        <Button type="submit" variant="ghost">
          Delete car
        </Button>
      </form>
    </main>
  );
}
