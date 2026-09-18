import React from "react";
import Link from "next/link";
import Image from "next/image";
import { PageContainer } from "@/components/PageContainer";

export const metadata = {
  title: "Services - Evigo",
  description: "Explore the services offered by Evigo.",
};

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#05030f] text-white selection:bg-violet-500/30 relative w-full overflow-x-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px]" />
      </div>

      <main className="flex-1 relative z-10 w-full py-16 sm:py-20">
        <PageContainer>
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">
              Our Services
            </h1>
            <p className="text-lg text-white/60 max-w-2xl">
              Verified venues and professionals for your next big event.
            </p>
          </div>

          {/* Services Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Events Category Card */}
            <Link href="/services/events" className="group block">
              <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:-translate-y-1">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image 
                    src="/partners/events/genx_brij/hall.png"
                    alt="Events & Venues"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05030f] via-[#05030f]/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 text-[11px] font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30">
                      🥂 Premium Venues
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-violet-400 transition-colors">
                      Events
                    </h3>
                    <p className="text-sm text-white/70">
                      Explore top-rated hotel partners, banquet halls, and event spaces across Bihar.
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Tourism Category Card */}
            <Link href="/services/tourism" className="group block">
              <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:-translate-y-1">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image 
                    src="/jamui_nature.png"
                    alt="Tourism in Bihar"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05030f] via-[#05030f]/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 text-[11px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30">
                      🧭 Explore Bihar
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                      Tourism
                    </h3>
                    <p className="text-sm text-white/70">
                      Discover scenic hills, sacred temples, bird sanctuaries & historic landmarks across Jamui district.
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Other Services Card (Coming Soon) */}
            <div className="group block relative cursor-default">
              <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] opacity-85 hover:opacity-100">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image 
                    src="/tourism/jamui/jamui_hero.png"
                    alt="Other Services"
                    fill
                    className="object-cover grayscale-[25%] transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05030f] via-[#05030f]/70 to-[#05030f]/30" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30">
                      ⏳ Coming Soon
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1 text-white/90 group-hover:text-amber-300 transition-colors">
                      Other Services
                    </h3>
                    <p className="text-sm text-white/60">
                      Local tourist guides, homestays, and cab services — launching soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  );
}
