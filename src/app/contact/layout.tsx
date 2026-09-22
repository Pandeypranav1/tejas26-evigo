import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us - Evigo",
  description: "Get in touch with the Evigo team for support, partnerships, or inquiries.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
