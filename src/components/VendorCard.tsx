"use client";

import Image from "next/image";
import { Button } from "@/components/Button";
import type { DemoProvider } from "@/lib/demoStore";

export function VendorCard({
  provider,
  onBook,
}: {
  provider: DemoProvider;
  onBook: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={provider.imageUrl}
          alt={provider.businessName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-black text-zinc-900">
              {provider.businessName}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-zinc-600">
              {provider.category} • {provider.city}
            </div>
            <div className="mt-1 text-xs font-semibold text-zinc-500">
              By {provider.ownerName} • {provider.experienceYears}+ yrs experience
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-zinc-500">Starting</div>
            <div className="text-sm font-black">₹{provider.startingPrice}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          {provider.description}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={onBook} className="flex-1">
            Book Now
          </Button>
          <a
            className="flex-1"
            href={`tel:${provider.phone}`}
            aria-label={`Call ${provider.businessName}`}
          >
            <Button variant="secondary" className="w-full">
              Call Now
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

