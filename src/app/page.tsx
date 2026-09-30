import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";
import {
    BIHAR_DESTINATIONS,
    CATEGORY_IMAGE,
    CATEGORY_TAGLINE,
    EVENT_VENUES,
    SERVICE_CATEGORIES,
} from "@/lib/constants";

const CATEGORY_ICON: Record<string, string> = {
    Catering: "🍽️",
    Photography: "📸",
    DJ: "🎧",
    "Mehendi & Makeup": "💄",
    Restaurant: "🏨",
};

const FAABCAB_SERVICES = [
    "Inter-city One Way / Round Trip",
    "Local Hourly Rental",
    "Airport Transfer",
    "Railway Pickup & Drop",
];

export default function Home() {
    return (
        <main className="flex-1">
            <section className="relative overflow-hidden bg-[#101b18] text-white">
                <div className="absolute inset-0">
                    <Image
                        src="/evigo-hero.png"
                        alt="A celebration brought together by Evigo"
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover opacity-35"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#101b18] via-[#101b18]/85 to-[#101b18]/35" />
                </div>
                <Container className="relative py-14 sm:py-20">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
                        Evigo · Bihar
                    </p>
                    <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                        Gather well. Go further.
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-7 text-white/75">
                        Trusted local services for your celebrations, and considered ways
                        to discover Bihar.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href="/events"
                            className="rounded-md bg-white px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-emerald-50"
                        >
                            Explore Events <span aria-hidden="true">→</span>
                        </Link>
                        <Link
                            href="/travel-tourism"
                            className="rounded-md border border-white/40 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Explore Travel &amp; Tourism <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                </Container>
            </section>

            <section className="py-12 sm:py-16" aria-labelledby="events-heading">
                <Container>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
                                01 / Celebrate
                            </p>
                            <h2 id="events-heading" className="mt-2 text-3xl font-black text-zinc-950 sm:text-4xl">
                                Events
                            </h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                                Plan your event with trusted services, venues and local partners.
                            </p>
                        </div>
                        <Link href="/events" className="text-sm font-bold text-emerald-800 hover:text-emerald-950">
                            Explore Events <span aria-hidden="true">→</span>
                        </Link>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-base font-black text-zinc-900">Event services</h3>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {SERVICE_CATEGORIES.map((category) => (
                                <Link
                                    key={category}
                                    href={category === "Restaurant" ? "/hotels" : `/explore?category=${encodeURIComponent(category)}`}
                                    className="group overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-emerald-700/50 hover:shadow-md"
                                >
                                    <div className="relative aspect-[5/3] bg-zinc-100">
                                        <Image
                                            src={CATEGORY_IMAGE[category]}
                                            alt={category}
                                            fill
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                            className="object-cover transition duration-500 group-hover:scale-105"
                                        />
                                        <span className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-lg shadow">
                                            {CATEGORY_ICON[category]}
                                        </span>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="text-sm font-black text-zinc-950">{category}</h4>
                                        <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-600">
                                            {CATEGORY_TAGLINE[category]}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <h3 className="text-base font-black text-zinc-900">Trusted Hotels &amp; Venues</h3>
                                <p className="mt-1 text-sm text-zinc-600">Verified partners in Jamui, Bihar.</p>
                            </div>
                            <Link href="/hotels" className="shrink-0 text-sm font-bold text-emerald-800 hover:text-emerald-950">
                                All hotels <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {EVENT_VENUES.slice(0, 3).map((venue) => (
                                <Link
                                    key={venue.id}
                                    href={`/hotels#${venue.id}`}
                                    className="group overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-emerald-700/50 hover:shadow-md"
                                >
                                    <div className="relative aspect-[16/9] bg-zinc-100">
                                        <Image
                                            src={venue.images[0]}
                                            alt={venue.name}
                                            fill
                                            sizes="(max-width: 640px) 100vw, 33vw"
                                            className="object-cover transition duration-500 group-hover:scale-105"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 p-3">
                                        <div>
                                            <h4 className="text-sm font-black text-zinc-950">{venue.name}</h4>
                                            <p className="mt-1 text-xs text-zinc-600">{venue.location}</p>
                                        </div>
                                        {venue.googleRating && (
                                            <span className="shrink-0 text-sm font-bold text-amber-700">
                                                ★ {venue.googleRating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </Container>
            </section>

            <section className="border-y border-zinc-800 bg-[#151b19] py-12 text-white sm:py-16" aria-labelledby="travel-heading">
                <Container>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-300">
                                02 / Discover
                            </p>
                            <h2 id="travel-heading" className="mt-2 text-3xl font-black sm:text-4xl">
                                Travel &amp; Tourism
                            </h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                                Discover Bihar, plan your journey and explore local destinations.
                            </p>
                        </div>
                        <Link href="/travel-tourism" className="text-sm font-bold text-amber-300 hover:text-amber-200">
                            Explore Travel &amp; Tourism <span aria-hidden="true">→</span>
                        </Link>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {BIHAR_DESTINATIONS.map((destination) => (
                            <Link
                                key={destination.name}
                                href={`/services/tourism?district=${encodeURIComponent(destination.district)}`}
                                className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-800"
                            >
                                <Image
                                    src={destination.img}
                                    alt={destination.name}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                    className="object-cover transition duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-3">
                                    <h3 className="font-black text-white">{destination.name}</h3>
                                    <p className="mt-0.5 text-xs text-white/75">{destination.tag}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                        <div className="flex flex-col justify-between rounded-lg bg-[#284a40] p-5 sm:p-6">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">Jamui · Travel idea</p>
                                <h3 className="mt-2 text-xl font-black">Travel Pack Combo</h3>
                                <p className="mt-2 text-sm leading-6 text-white/75">
                                    A guide, homestay and transport concept for planning a complete local journey.
                                </p>
                            </div>
                            <Link href="/services/tourism?district=Jamui" className="mt-5 text-sm font-bold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                                Explore Jamui tourism <span aria-hidden="true">→</span>
                            </Link>
                        </div>

                        <div className="rounded-lg border border-white/15 bg-white/[0.04] p-5 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">Transport partner</p>
                                    <h3 className="mt-2 text-xl font-black">FaabCab</h3>
                                    <p className="mt-1 text-sm text-white/70">Reliable transport services across Jamui, Bihar.</p>
                                </div>
                                <Link href="/travel-tourism/faabcab" className="inline-flex shrink-0 rounded-md bg-amber-300 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-200">
                                    Book transport <span className="ml-2" aria-hidden="true">→</span>
                                </Link>
                            </div>
                            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {FAABCAB_SERVICES.map((service) => (
                                    <Link
                                        key={service}
                                        href="/travel-tourism/faabcab"
                                        className="rounded-md border border-white/10 px-3 py-2.5 text-sm font-medium text-white/85 transition hover:border-amber-200/60 hover:text-white"
                                    >
                                        {service}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </Container>
            </section>
        </main>
    );
}