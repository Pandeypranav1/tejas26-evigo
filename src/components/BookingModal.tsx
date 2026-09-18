"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import type { DemoProvider } from "@/lib/demoStore";
import { saveDemoBooking, getDemoUser } from "@/lib/demoStore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function BookingModal({
  open,
  provider,
  onClose,
}: {
  open: boolean;
  provider: DemoProvider | null;
  onClose: () => void;
}) {
  const { user, role } = useAuth();
  const router = useRouter();
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canBook = !!user && role === "client";
  const title = provider ? `Book ${provider.businessName}` : "Book";

  const submit = () => {
    setError(null);
    if (!provider) return;
    if (!user || role !== "client") {
      router.push("/login/client");
      return;
    }
    if (!eventDate || !location) {
      setError("Please fill event date and location.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const u = getDemoUser();
      saveDemoBooking({
        providerId: provider.id,
        providerOwnerUid: provider.ownerUid,
        clientUid: u?.uid ?? user.id,
        clientPhone: u?.phone ?? user.phone,
        eventDate,
        location,
        notes,
      });
      setSubmitting(false);
      setDone(true);
    }, 700);
  };

  const handleClose = () => {
    setEventDate("");
    setLocation("");
    setNotes("");
    setError(null);
    setDone(false);
    onClose();
  };

  return (
    <Modal open={open} title={title} onClose={handleClose}>
      {!provider ? null : done ? (
        <div className="text-center py-4">
          <div style={{ fontSize: 48 }}>✅</div>
          <div className="mt-3 text-lg font-black text-zinc-900">Booking Requested!</div>
          <div className="mt-1 text-sm font-semibold text-zinc-500">
            Your request has been sent to {provider.businessName}.
          </div>
          <Button onClick={handleClose} className="mt-5 w-full">
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {!canBook && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Please login as a client to book.{" "}
              <a href="/login/client" className="underline font-bold">
                Login →
              </a>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="text-xs font-semibold text-zinc-600">Event date</div>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
              />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold text-zinc-600">Location</div>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City / venue"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
              />
            </label>
          </div>
          <label className="space-y-1 block">
            <div className="text-xs font-semibold text-zinc-600">Notes (optional)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any requirements (timing, budget, style, etc.)"
              className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </label>

          {error && <div className="text-sm font-semibold text-red-600">{error}</div>}

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || !canBook}>
              {submitting ? "Submitting…" : "Submit Booking"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
