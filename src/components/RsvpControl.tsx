"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { decideRsvpState } from "@/lib/rsvp/decision";
import {
  declineAction,
  rsvpGoingAction,
} from "@/app/(member)/events/[slug]/actions";

export type RsvpCarOption = { id: string; label: string };

export function RsvpControl({
  eventId,
  slug,
  authenticated,
  capacity,
  attendeeCount,
  isAttending: initialIsAttending,
  carId: initialCarId,
  cars,
}: {
  eventId: string;
  slug: string;
  authenticated: boolean;
  capacity: number | null;
  attendeeCount: number;
  isAttending: boolean;
  carId: string | null;
  cars: RsvpCarOption[];
}) {
  const [isAttending, setIsAttending] = useState(initialIsAttending);
  const [carId, setCarId] = useState(initialCarId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const state = decideRsvpState({
    authenticated,
    lumaUrl: null, // this component only ever renders the native path
    isAttending,
    capacity,
    attendeeCount,
  });

  if (state === "login") {
    return (
      <Link
        href={`/login?next=/events/${slug}`}
        className="type-label transition-colors hover:text-bone"
      >
        Member login →
      </Link>
    );
  }

  function submitRsvp(selectedCarId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await rsvpGoingAction({
        eventId,
        slug,
        carId: selectedCarId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCarId(selectedCarId);
      setIsAttending(true);
      setPickerOpen(false);
    });
  }

  function submitDecline() {
    setError(null);
    startTransition(async () => {
      const result = await declineAction({ eventId, slug });
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsAttending(false);
      setPickerOpen(false);
    });
  }

  if (state === "going") {
    const chosenCar = cars.find((c) => c.id === carId);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-5">
          <span className="type-label text-signal">You&rsquo;re going ✓</span>
          <button
            type="button"
            className="type-label transition-colors hover:text-bone"
            onClick={() => setPickerOpen((v) => !v)}
            disabled={isPending}
          >
            Change car
          </button>
          <button
            type="button"
            className="type-label transition-colors hover:text-bone"
            onClick={submitDecline}
            disabled={isPending}
          >
            Can&rsquo;t make it
          </button>
        </div>
        {chosenCar && !pickerOpen && (
          <p className="type-data text-muted">{chosenCar.label}</p>
        )}
        {pickerOpen && (
          <CarPicker
            cars={cars}
            onPick={submitRsvp}
            onDecideLater={() => submitRsvp(null)}
            disabled={isPending}
          />
        )}
        {error && <p className="type-label text-signal">{error}</p>}
      </div>
    );
  }

  if (state === "full") {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="ghost" disabled title="This event is at capacity">
          Event full
        </Button>
        {error && <p className="type-label text-signal">{error}</p>}
      </div>
    );
  }

  // not-going
  return (
    <div className="flex flex-col gap-3">
      {!pickerOpen && (
        <Button
          variant="primary"
          onClick={() => setPickerOpen(true)}
          disabled={isPending}
        >
          RSVP
        </Button>
      )}
      {pickerOpen && (
        <CarPicker
          cars={cars}
          onPick={submitRsvp}
          onDecideLater={() => submitRsvp(null)}
          disabled={isPending}
        />
      )}
      {error && <p className="type-label text-signal">{error}</p>}
    </div>
  );
}

function CarPicker({
  cars,
  onPick,
  onDecideLater,
  disabled,
}: {
  cars: RsvpCarOption[];
  onPick: (carId: string) => void;
  onDecideLater: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border-t border-hairline pt-4">
      <p className="type-label mb-3">Which car?</p>
      <div className="flex flex-wrap gap-3">
        {cars.map((car) => (
          <Button
            key={car.id}
            type="button"
            variant="ghost"
            onClick={() => onPick(car.id)}
            disabled={disabled}
          >
            {car.label}
          </Button>
        ))}
        <button
          type="button"
          className="type-label transition-colors hover:text-bone"
          onClick={onDecideLater}
          disabled={disabled}
        >
          Decide later
        </button>
      </div>
    </div>
  );
}
