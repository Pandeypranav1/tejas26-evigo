import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { PageTracker } from "@/components/PageTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Evigo — Real-time Event Services in Bihar",
    template: "%s | Evigo",
  },
  description:
    "Book trusted event service providers in minutes — Catering, Photography, DJ, Mehendi & Makeup, and Restaurant/Hotel services across Bihar. No fake vendors, real-time bookings.",
  keywords: [
    "Evigo",
    "event services Bihar",
    "catering Bihar",
    "photography Bihar",
    "DJ booking",
    "mehendi makeup",
    "cultural services",
    "wedding services India",
    "event booking platform",
  ],
  authors: [{ name: "Evigo" }],
  creator: "Evigo",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://evigo.in",
    siteName: "Evigo",
    title: "Evigo — Real-time Event Services in Bihar",
    description:
      "Book trusted event service providers in minutes. Catering, Photography, DJ, Mehendi & Makeup, Restaurant & Hotel services.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Evigo — Real-time Event Services",
    description:
      "Book verified event service providers across Bihar in minutes.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <AuthProvider>
          <PageTracker />
          <Header />
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
