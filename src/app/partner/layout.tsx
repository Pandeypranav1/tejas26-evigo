import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Registration",
  description:
    "Register your event service on Evigo and start receiving bookings from clients across Bihar. List Catering, Photography, DJ, Mehendi & Makeup, or Restaurant services.",
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
