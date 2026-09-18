"use client";

import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { NearbyHotelsV2 } from "@/components/NearbyHotelsV2";
import {
  CATEGORY_IMAGE,
  CATEGORY_TAGLINE,
  SERVICE_CATEGORIES,
  TRUSTED_PARTNERS,
} from "@/lib/constants";

const CATEGORY_ICON: Record<string, string> = {
  Catering: "🍽️",
  Photography: "📸",
  DJ: "🎧",
  "Mehendi & Makeup": "💅",
  Restaurant: "🏨",
};

export default function Home() {
  return (
    <main className="flex-1 w-full overflow-x-hidden">
      {/* ── 1) Hero ── */}
      <section className="bg-gradient-to-b from-zinc-50 to-white py-8 sm:py-14 w-full">
        <Container>
          <div className="grid items-center gap-8 sm:gap-10 md:grid-cols-2">
            {/* Left */}
            <ScrollReveal animation="fade-right" duration={800}>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                  ✦ OTP Login • Real-time Bookings • 5 Services
                </div>
                <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-900 leading-tight">
                  Book trusted event services in minutes.
                </h1>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base font-medium leading-7 text-zinc-600">
                  Evigo connects you to verified providers across{" "}
                  <span className="font-black text-zinc-900">
                    Catering, Photography, DJ, Mehendi &amp; Makeup, Restaurant
                  </span>
                  . No fake listings — providers appear only after registration.
                </p>
                <div className="mt-5 sm:mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/explore" className="w-full sm:w-auto">
                    <Button className="w-full">Explore Providers →</Button>
                  </Link>
                  <Link href="/partner" className="w-full sm:w-auto">
                    <Button variant="secondary" className="w-full">
                      Become a Partner
                    </Button>
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="mt-5 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                  {["OTP Login", "No Fake Vendors", "Bihar Network", "24×7 Support"].map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-zinc-200 bg-white px-2.5 sm:px-3 py-1 text-xs font-semibold text-zinc-600"
                    >
                      ✓ {b}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Right — Collage + feature cards */}
            <ScrollReveal animation="fade-left" duration={800} delay={200}>
              <div className="grid gap-3">
                {/* Hero event image */}
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-200/50 bg-zinc-900 shadow-2xl" style={{ aspectRatio: "16/10" }}>
                  <Image
                    src="/evigo-hero.png"
                    alt="Evigo — Premium Event Services"
                    fill
                    className="object-cover opacity-80"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.1) 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="text-base sm:text-lg font-black text-white leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
                      All Event Services in One Place
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 sm:gap-2">
                      {SERVICE_CATEGORIES.map((c) => (
                        <span
                          key={c}
                          className="rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white"
                          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}
                        >
                          {CATEGORY_ICON[c] || "✨"} {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 hover:border-violet-200 hover:bg-violet-50 transition">
                    <div className="text-xs sm:text-sm font-black text-zinc-900">Real-time bookings</div>
                    <div className="mt-1 text-[11px] sm:text-xs font-semibold text-zinc-500">
                      Providers accept/reject in dashboard
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 hover:border-cyan-200 hover:bg-cyan-50 transition">
                    <div className="text-xs sm:text-sm font-black text-zinc-900">Call instantly</div>
                    <div className="mt-1 text-[11px] sm:text-xs font-semibold text-zinc-500">
                      One tap &ldquo;Call Now&rdquo; via tel link
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* ── 2) Travel & Tourism ── */}
      <section id="travel-tourism" className="py-12 sm:py-16 md:py-20 bg-zinc-50 border-y border-zinc-200 w-full overflow-hidden">
        <Container>
          <ScrollReveal animation="fade-up">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-1 mb-3 sm:mb-4 text-xs sm:text-[13px] font-bold text-amber-700" style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  🧭 Discover Bihar
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-[34px] font-black text-zinc-900 leading-tight">
                  Travel & Tourism
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-semibold">
                  Explore Bihar's heritage and culture through verified local hosts.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" staggerChildren={100}>
            {/* Clean responsive grid without negative margin bleed */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {[
                { name: "Patna", tag: "Ganges Ghats", img: "/patna_ganges.png" },
                { name: "Gaya", tag: "Buddhist Circuit", img: "/gaya_buddhist.png" },
                { name: "Rajgir", tag: "Hot Springs & Hills", img: "/rajgir_hills.png" },
                { name: "Vaishali", tag: "Ancient Ruins", img: "/vaishali_ruins.png" },
                { name: "Jamui", tag: "Wildlife & Nature", img: "/jamui_nature.png" },
              ].map((dest) => (
                <div key={dest.name} className="rounded-2xl overflow-hidden group border border-zinc-200 bg-white relative aspect-[4/5] shadow-sm hover:shadow-lg transition-all duration-300">
                  <Image src={dest.img} alt={dest.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 600px) 50vw, 240px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <div className="text-base sm:text-lg font-black text-white">{dest.name}</div>
                    <div className="text-[11px] sm:text-xs font-semibold text-white/80 mt-0.5">{dest.tag}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={200}>
            <div className="mt-8 sm:mt-12 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10 max-w-lg">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-bold mb-3 border border-amber-500/30">
                  🔥 Special Offer
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Travel Pack Combo</h3>
                <p className="text-sm text-white/70 leading-relaxed font-medium">
                  Book a complete travel experience — local guide, homestay, and transport — in one combo, at one transparent price.
                </p>
              </div>
              <div className="relative z-10 shrink-0 w-full sm:w-auto">
                <Link href="/services/tourism" className="w-full sm:w-auto block">
                  <Button className="w-full whitespace-nowrap bg-white text-indigo-950 hover:bg-zinc-100 hover:text-indigo-950 shadow-xl border-none">
                    Explore Jamui Tourism →
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── 3) Core Services (5-card row with Restaurant) ── */}
      <section className="py-12 sm:py-16 md:py-20 bg-white w-full">
        <Container>
          {/* Heading */}
          <ScrollReveal animation="fade-up">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-1 mb-3 sm:mb-4 text-xs sm:text-[13px] font-bold text-violet-700" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)" }}>
                  🎯 5 Verified Categories
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-[34px] font-black text-zinc-900 leading-tight">
                  Core Services
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-semibold">
                  Curated for Bihar&apos;s event market — only the services that matter.
                </p>
              </div>
              <Link href="/explore" className="text-sm font-extrabold text-violet-600 hover:text-violet-700 whitespace-nowrap shrink-0">
                View All Providers →
              </Link>
            </div>
          </ScrollReveal>

          {/* Cards grid — strict 5 cards: Catering, Photography, DJ, Mehendi & Makeup, Restaurant */}
          <ScrollReveal animation="fade-up" staggerChildren={120}>
            <div className="evigo-services-grid">
              {SERVICE_CATEGORIES.map((c) => (
                <Link
                  href={c === "Restaurant" ? "/hotels" : `/explore?category=${encodeURIComponent(c)}`}
                  key={c}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    className="rounded-2xl sm:rounded-[20px] border border-zinc-200 overflow-hidden bg-white h-full flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_0_2px_#8b5cf6,0_20px_48px_rgba(139,92,246,0.18)] hover:border-violet-500"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)", cursor: "pointer" }}
                  >
                    <div className="evigo-svc-img-wrap">
                      <Image
                        src={CATEGORY_IMAGE[c]}
                        alt={c}
                        fill
                        className="svc-img object-cover transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                        loading="lazy"
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)" }} />
                      <div className="absolute top-2.5 left-2.5 w-8 h-8 rounded-[10px] bg-white/90 backdrop-blur-sm flex items-center justify-center text-lg shadow-md">
                        {CATEGORY_ICON[c] || "✨"}
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      <div className="text-sm font-black text-zinc-900">{c}</div>
                      <div className="text-xs text-zinc-500 mt-1 leading-relaxed font-semibold">
                        {CATEGORY_TAGLINE[c]}
                      </div>
                      <div className="mt-auto pt-3">
                        <div className="inline-flex items-center gap-1 text-xs font-extrabold grad-text">
                          {c === "Restaurant" ? "Browse verified hotels & banquets →" : "Top verified professionals near you →"}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── 4) Our Trusted Partners ── */}
      <section className="py-14 sm:py-20 w-full" style={{ background: "linear-gradient(180deg,#09090b 0%,#0f0a1e 100%)" }}>
        <Container>
          {/* Heading */}
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 sm:mb-5" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)" }}>
                <span className="text-base">🤝</span>
                <span className="text-xs sm:text-[13px] font-bold text-cyan-400 tracking-wide">Verified Partners</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                Our Trusted Partners
              </h2>
              <p className="text-sm sm:text-[15px] text-gray-400 max-w-md mx-auto mt-3 sm:mt-4 leading-relaxed">
                Hotels and restaurants we&apos;ve personally verified across Bihar.
              </p>
            </div>
          </ScrollReveal>

          {/* Partner card grid */}
          <ScrollReveal animation="fade-up" staggerChildren={150}>
            <div className="evigo-partners-grid">
              {TRUSTED_PARTNERS.map((partner, i) => {
                const accents = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"];
                const accent = accents[i % accents.length];
                return (
                  <div
                    key={partner.name}
                    className="relative rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-3 hover:scale-[1.02]"
                    style={{
                      aspectRatio: "3/4",
                      border: `1px solid ${accent}22`,
                      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                      background: "#0f0a1e",
                    }}
                  >
                    <Image
                      src={partner.image}
                      alt={`${partner.name}, ${partner.location}`}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 480px) 100vw, (max-width: 720px) 50vw, (max-width: 1200px) 25vw, 25vw"
                      loading="lazy"
                    />
                    <div
                      className="absolute inset-0 flex flex-col justify-end p-4"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }}
                    >
                      <div className="text-white font-bold text-sm sm:text-base mb-0.5">{partner.name}</div>
                      <div className="text-gray-300 text-xs font-semibold mb-0.5">{partner.location}</div>
                      <div className="text-gray-400 text-xs font-medium">{partner.description}</div>
                    </div>
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px]"
                      style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55)` }}
                    />
                    <div
                      className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                      style={{ background: "rgba(6,182,212,0.85)", backdropFilter: "blur(6px)" }}
                    >
                      ✓ Verified
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          {/* ── Find Hotels Near You (Interactive Zero-Cost Leaflet + Bihar Map) ── */}
          <ScrollReveal animation="fade-up" delay={200}>
            <div className="mt-10 sm:mt-14 w-full">
              <NearbyHotelsV2 />
            </div>
          </ScrollReveal>
        </Container>
      </section>
    </main>
  );
}
