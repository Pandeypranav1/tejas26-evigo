import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Providers",
  description:
    "Browse verified event service providers across Bihar — Catering, Photography, DJ, Mehendi & Makeup, and Restaurant/Hotel services. Real listings, no fake vendors.",
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
