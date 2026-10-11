"use client";

import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Combo Packs", href: "/combo-packs" },
  { label: "Events", href: "/events" },
  { label: "Travel & Tourism", href: "/travel-tourism" },
  { label: "Hotels & Venues", href: "/hotels" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const SERVICES = [
  "Catering",
  "Photography",
  "DJ",
  "Mehendi & Makeup",
  "Restaurant",
];

const TOURISM_LINKS = [
  { label: "Jamui Tourism", href: "/services/tourism" },
  { label: "Patna", href: "/services/tourism?district=Patna" },
  { label: "Gaya & Bodh Gaya", href: "/services/tourism?district=Gaya" },
  { label: "Rajgir", href: "/services/tourism?district=Rajgir" },
  { label: "Nalanda", href: "/services/tourism?district=Nalanda" },
  { label: "Vaishali", href: "/services/tourism?district=Vaishali" },
  { label: "Madhubani", href: "/services/tourism?district=Madhubani" },
  { label: "Sitamarhi", href: "/services/tourism?district=Sitamarhi" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
    href: "#",
  },
  {
    label: "LinkedIn",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    href: "#",
  },
  {
    label: "Facebook",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
    href: "#",
  },
];

export function Footer() {
  return (
    <footer
      className="w-full"
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <PageContainer className="py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 sm:gap-8">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" style={{ textDecoration: "none" }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  background: "linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.03em",
                }}
              >
                Evigo
              </span>
            </Link>
            <p
              style={{
                marginTop: 14,
                fontSize: 14,
                lineHeight: 1.7,
                color: "#94a3b8",
                maxWidth: 280,
              }}
            >
              Bihar&apos;s trusted event services marketplace. Connecting clients
              with verified providers for weddings, celebrations &amp; more.
            </p>

            {/* Social Links */}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  className="hover:border-violet-500 hover:text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Quick Links
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {QUICK_LINKS.map((link) => (
                <li key={link.label} style={{ marginBottom: 10 }}>
                  <Link
                    href={link.href}
                    style={{
                      fontSize: 14,
                      color: "#94a3b8",
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tourism Links */}
          <div>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Tourism
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {TOURISM_LINKS.map((link) => (
                <li key={link.label} style={{ marginBottom: 10 }}>
                  <Link
                    href={link.href}
                    style={{
                      fontSize: 14,
                      color: "#94a3b8",
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Event Services
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {SERVICES.map((s) => (
                <li key={s} style={{ marginBottom: 10 }}>
                  <Link
                    href={s === "Restaurant" ? "/hotels" : `/explore?category=${encodeURIComponent(s)}`}
                    style={{
                      fontSize: 14,
                      color: "#94a3b8",
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-white"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Contact Us
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Email */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(6, 182, 212, 0.1)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Email
                  </div>
                  <a
                    href="mailto:support.evigo@gmail.com"
                    style={{
                      fontSize: 14,
                      color: "#94a3b8",
                      textDecoration: "none",
                      transition: "color 0.2s",
                      wordBreak: "break-all",
                    }}
                    className="hover:text-cyan-400"
                  >
                    support.evigo@gmail.com
                  </a>
                </div>
              </div>

              {/* Contact No. */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(6, 182, 212, 0.1)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Contact No.
                  </div>
                  <a
                    href="tel:+917808807340"
                    style={{
                      fontSize: 14,
                      color: "#94a3b8",
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    className="hover:text-cyan-400"
                  >
                    7808807340
                  </a>
                </div>
              </div>

              {/* Location */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(6, 182, 212, 0.1)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Location
                  </div>
                  <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.4 }}>
                    Samastipur, Bihar, India
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: "#64748b" }}>
            &copy; {new Date().getFullYear()} Evigo. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <Link
              href="/privacy-policy"
              style={{ fontSize: 13, textDecoration: "none" }}
              className="rounded-sm text-[#64748b] transition-colors hover:text-gray-400 active:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-and-conditions"
              style={{ fontSize: 13, textDecoration: "none" }}
              className="rounded-sm text-[#64748b] transition-colors hover:text-gray-400 active:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
