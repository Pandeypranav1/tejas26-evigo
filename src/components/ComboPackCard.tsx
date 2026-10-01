"use client";

import Image from "next/image";
import { ComboPack, COMBO_CATEGORY_METADATA } from "@/lib/combo";

interface ComboPackCardProps {
  pack: ComboPack;
  onSelect: (pack: ComboPack) => void;
}

export function ComboPackCard({ pack, onSelect }: ComboPackCardProps) {
  const meta = COMBO_CATEGORY_METADATA[pack.category] || {
    icon: "🎁",
    gradient: "from-cyan-500 to-violet-600",
  };

  const hasDiscount = pack.discount > 0;

  return (
    <div className="group relative flex flex-col rounded-3xl border border-white/10 bg-[#0d091e]/90 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-400/40 hover:shadow-[0_15px_40px_rgba(6,182,212,0.15)]">
      {/* Ambient background glow on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-cyan-500/10 via-transparent to-violet-600/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Image Banner */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-zinc-900">
        {pack.image_url ? (
          <Image
            src={pack.image_url}
            alt={pack.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-950 to-cyan-950 text-4xl">
            {meta.icon}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0d091e] via-[#0d091e]/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            <span>{meta.icon}</span>
            <span>{pack.category}</span>
          </span>
        </div>

        <div className="absolute bottom-3 right-3">
          <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 backdrop-blur-md">
            ⏱️ {pack.duration}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
          <span>📍</span>
          <span>{pack.city}</span>
        </div>

        <h3 className="mt-1 text-xl font-black text-white transition-colors group-hover:text-cyan-300">
          {pack.name}
        </h3>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-300">
          {pack.description}
        </p>

        {/* Included Services List */}
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Included in this Combo:
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pack.items && pack.items.length > 0 ? (
              pack.items.map((item, idx) => (
                <span
                  key={item.id || idx}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-200"
                >
                  <span className="text-cyan-400">✓</span>
                  <span>{item.service_type}</span>
                  {item.quantity > 1 && (
                    <span className="rounded bg-white/10 px-1 text-[9px] font-bold text-white">
                      x{item.quantity}
                    </span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">Curated multi-service bundle</span>
            )}
          </div>
        </div>

        {/* Footer: Price & CTA */}
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between border-t border-white/10 pt-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Combo Price
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-white">
                  ₹{pack.final_price.toLocaleString("en-IN")}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-xs text-zinc-500 line-through">
                      ₹{pack.base_price.toLocaleString("en-IN")}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                      Save ₹{pack.discount.toLocaleString("en-IN")}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelect(pack)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 hover:brightness-110"
            >
              <span>View & Book</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
