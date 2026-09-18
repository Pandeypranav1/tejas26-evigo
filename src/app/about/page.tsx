"use client";

import { Container } from "@/components/Container";
import { ScrollReveal } from "@/components/ScrollReveal";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";

export default function AboutPage() {
  return (
    <main className="flex-1 bg-zinc-50 pt-16 pb-24">
      <Container>
        <div className="max-w-4xl mx-auto text-center mb-16">
          <ScrollReveal animation="fade-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-zinc-900 tracking-tight leading-tight">
              Revolutionizing Event Services in <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-cyan-500">Bihar</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-600 font-medium leading-relaxed max-w-2xl mx-auto">
              Evigo is a premium platform connecting clients with verified, top-tier event professionals. No middle-men, no fake listings, just transparent and instant bookings.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
          <ScrollReveal animation="fade-right">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-zinc-200">
              <Image 
                src="/evigo-hero.png" 
                alt="Evigo About" 
                fill 
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8">
                <div className="text-white font-bold text-2xl">Building Trust</div>
                <div className="text-white/80 font-medium">Through technology and verification</div>
              </div>
            </div>
          </ScrollReveal>
          
          <ScrollReveal animation="fade-left" delay={200}>
            <h2 className="text-3xl font-black text-zinc-900 mb-6">Our Mission</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-xl shrink-0">🤝</div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Verified Partners Only</h3>
                  <p className="text-zinc-600 font-medium leading-relaxed">Every professional on Evigo goes through a strict verification process. We ensure high quality and reliable services for every event.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-xl shrink-0">⚡</div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Instant Connect</h3>
                  <p className="text-zinc-600 font-medium leading-relaxed">No more waiting. Clients can view portfolios, check pricing, and instantly connect via call or WhatsApp.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-xl shrink-0">🌸</div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Women Empowerment</h3>
                  <p className="text-zinc-600 font-medium leading-relaxed">We strongly focus on onboarding female professionals in catering, mehendi, makeup, and cultural arts, giving them a platform to earn and grow.</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal animation="fade-up">
          <div className="bg-zinc-900 rounded-[2rem] p-10 sm:p-16 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 relative z-10">Join the Evigo Network</h2>
            <p className="text-zinc-400 font-medium max-w-xl mx-auto mb-10 text-lg relative z-10">
              Whether you are looking to book a service or list your business, we make it seamless and secure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link href="/explore">
                <Button className="w-full sm:w-auto bg-white text-zinc-900 hover:bg-zinc-100">Explore Services</Button>
              </Link>
              <Link href="/partner">
                <Button className="w-full sm:w-auto bg-violet-600 text-white hover:bg-violet-500 border-none">List Your Business</Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>

      </Container>
    </main>
  );
}
