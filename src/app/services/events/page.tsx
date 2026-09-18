"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EVENT_VENUES, EventVenue } from "@/lib/constants";
import { Container } from "@/components/Container";

function HotelCard({ venue }: { venue: EventVenue }) {
  const [currentImage, setCurrentImage] = useState(0);

  const nextImage = () => {
    if (venue.images.length > 0) {
      setCurrentImage((prev) => (prev + 1) % venue.images.length);
    }
  };

  const prevImage = () => {
    if (venue.images.length > 0) {
      setCurrentImage((prev) => (prev - 1 + venue.images.length) % venue.images.length);
    }
  };

  return (
    <div className="bg-[#0f0a1e] border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_8px_40px_rgba(0,0,0,0.6)] mb-8 transition-all hover:border-violet-500/50">
      
      {/* Image Gallery */}
      <div className="relative w-full md:w-2/5 aspect-[4/3] md:aspect-auto bg-black shrink-0">
        {venue.images.length > 0 ? (
          <>
            <Image
              src={venue.images[currentImage]}
              alt={`${venue.name} - Image ${currentImage + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            {venue.images.length > 1 && (
              <>
                <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 z-10">
                  {venue.images.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all ${idx === currentImage ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={(e) => { e.preventDefault(); prevImage(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                  onClick={(e) => { e.preventDefault(); nextImage(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-white/30 text-sm font-medium">
            Images coming soon
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 flex flex-col flex-1">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-1.5">{venue.name}</h2>
            <div className="flex items-center gap-1.5 text-white/60 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {venue.location}
            </div>
          </div>
          
          {venue.googleRating && (
            <div className="shrink-0 flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <div className="text-lg font-black text-white">{venue.googleRating}</div>
              <div className="flex flex-col">
                <div className="flex text-amber-400 text-xs">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < Math.floor(venue.googleRating!) ? '★' : '☆'}</span>
                  ))}
                </div>
                {venue.reviewCount && (
                  <div className="text-[10px] text-white/50 font-medium leading-none mt-0.5">Google Rating ({venue.reviewCount})</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Safety Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {venue.safetyFeatures.map((feat) => (
            <span key={feat} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
              ✓ {feat}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
          <Link href="/contact" className="flex-1 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            Book Now
          </Link>
          <a href="tel:+918809988099" className="flex-1 flex items-center justify-center rounded-xl bg-white/10 border border-white/20 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
            Call Now
          </a>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-[#05030f] text-white">
      {/* Header section */}
      <section className="relative pt-24 pb-12 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 to-transparent" />
        <Container>
          <div className="relative z-10 max-w-3xl">
            <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-400 hover:text-violet-300 mb-6 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Services
            </Link>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              Events & Venues
            </h1>
            <p className="text-lg text-white/60">
              Discover top-rated hotel partners, premium banquet halls, and verified event spaces across Bihar. Every venue meets our strict safety and quality standards.
            </p>
          </div>
        </Container>
      </section>

      {/* Listing section */}
      <section className="py-12 md:py-20">
        <Container>
          <div className="max-w-5xl mx-auto">
            {EVENT_VENUES.map((venue) => (
              <HotelCard key={venue.id} venue={venue} />
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
