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

const EVENT_CATEGORY_DETAILS: Record<string, { title: string; label: string; icon: string }> = {
    Catering: { title: "Food for every celebration", label: "Catering", icon: "🍽️" },
    Photography: { title: "Moments worth keeping", label: "Photography", icon: "📷" },
    DJ: { title: "Music & entertainment", label: "Live entertainment", icon: "🎶" },
    "Mehendi & Makeup": { title: "Artistry for your occasion", label: "Beauty & culture", icon: "✨" },
    Restaurant: { title: "Gather, stay and celebrate", label: "Hotels & venues", icon: "🏨" },
};

const FEATURED_DESTINATIONS = [
    { district: "Gaya", name: "Bodh Gaya", category: "Buddhist heritage" },
    { district: "Nalanda", name: "Nalanda", category: "Ancient university" },
    { district: "Rajgir", name: "Rajgir", category: "Hills & heritage" },
    { district: "Vaishali", name: "Vaishali", category: "Archaeological heritage" },
    { district: "Madhubani", name: "Madhubani", category: "Mithila art & culture" },
    { district: "Sitamarhi", name: "Sitamarhi", category: "Punaura Dham" },
];

const TRAVEL_PACK_IMAGES = [
    { src: "/tourism/jamui/lachhuar_jain.png", alt: "Lachhuar Jain temple in Jamui, Bihar" },
    { src: "/tourism/nalanda_mahavihara.jpg", alt: "Ancient brick monastery ruins at Nalanda Mahavihara" },
    { src: "/tourism/rajgir_shanti_stupa.jpg", alt: "Vishwa Shanti Stupa at Rajgir" },
    { src: "/tourism/sitamarhi_punaura_dham.jpg", alt: "Punaura Dham in Sitamarhi" },
];

const TRUST_BENEFITS = [
    { icon: "◇", title: "Local choices", description: "Explore Bihar-based services and destinations." },
    { icon: "✓", title: "Partner listings", description: "Browse the partners listed on Evigo." },
    { icon: "↗", title: "Easy booking", description: "Send booking requests through the site." },
    { icon: "☎", title: "Support contacts", description: "Reach the team by email or phone." },
];

export default function Home() {
    const destinations = FEATURED_DESTINATIONS.map((featured) => ({
        ...featured,
        destination: BIHAR_DESTINATIONS.find((item) => item.district === featured.district),
    })).filter((item) => item.destination);

    return (
        <main className="flex-1 bg-white">
            <section className="relative isolate min-h-[570px] overflow-hidden bg-[#081629] text-white sm:min-h-[620px]">
                <Image
                    src="/tourism/patna_ganga_ghat.jpg"
                    alt="Ganga riverfront at Patna, Bihar"
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#071629] via-[#0b1b31]/90 to-[#0b1b31]/25" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071629]/70 via-transparent to-[#071629]/10" />
                <Container className="relative z-10 flex min-h-[570px] flex-col justify-center py-20 sm:min-h-[620px]">
                    <div className="max-w-3xl">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300 sm:text-sm">
                            Explore <span className="px-1.5 text-orange-400">•</span> Experience <span className="px-1.5 text-orange-400">•</span> Belong
                        </p>
                        <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                            Gather well.
                            <br />
                            <span className="text-orange-400">Go further.</span>
                        </h1>
                        <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
                            Your local marketplace for events, travel, stays and unforgettable experiences in Bihar.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/events"
                                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-600"
                            >
                                Explore Events <span className="ml-2" aria-hidden="true">→</span>
                            </Link>
                            <Link
                                href="/travel-tourism"
                                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/35 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                            >
                                Explore Travel &amp; Tourism <span className="ml-2" aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                    <div className="absolute bottom-6 right-5 sm:bottom-8 sm:right-8">
                        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-[#081629]/75 px-4 py-3 shadow-lg backdrop-blur-md">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-400/15 text-lg text-cyan-300" aria-hidden="true">⌖</span>
                            <span>
                                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Featured riverfront</span>
                                <span className="mt-0.5 block text-sm font-bold text-white">Patna, Bihar</span>
                            </span>
                        </div>
                    </div>
                </Container>
            </section>

            <section className="py-16 sm:py-20" aria-labelledby="events-heading">
                <Container>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Celebrate together</p>
                            <h2 id="events-heading" className="mt-2 text-3xl font-black tracking-tight text-[#10213a] sm:text-4xl">
                                Events in Bihar
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                                From cultural festivals to music, weddings, exhibitions and more.
                            </p>
                        </div>
                        <Link href="/events" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-800 transition hover:text-cyan-600">
                            View All Events <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                    <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                        {SERVICE_CATEGORIES.map((category) => {
                            const details = EVENT_CATEGORY_DETAILS[category];
                            const href = category === "Restaurant"
                                ? "/hotels"
                                : `/explore?category=${encodeURIComponent(category)}`;
                            return (
                                <Link
                                    key={category}
                                    href={href}
                                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-700/30 hover:shadow-xl"
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                                        <Image
                                            src={CATEGORY_IMAGE[category]}
                                            alt={`${category} services for events in Bihar`}
                                            fill
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                            className="object-cover transition duration-700 group-hover:scale-105"
                                        />
                                        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
                                            {details.label}
                                        </span>
                                    </div>
                                    <div className="flex min-h-36 flex-col p-4">
                                        <p className="text-xs font-semibold text-cyan-800">{details.icon} <span className="ml-1">{category}</span></p>
                                        <h3 className="mt-2 text-base font-black leading-snug text-[#10213a]">{details.title}</h3>
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{CATEGORY_TAGLINE[category]}</p>
                                        <span className="mt-auto pt-4 text-xs font-bold text-cyan-800">Explore options <span aria-hidden="true">→</span></span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </Container>
            </section>

            <section className="bg-[#0b1930] py-16 text-white sm:py-20" aria-labelledby="travel-heading">
                <Container>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">A place for every kind of journey</p>
                            <h2 id="travel-heading" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Discover Bihar</h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                                Ancient heritage, spiritual destinations, natural beauty and vibrant culture.
                            </p>
                        </div>
                        <Link href="/travel-tourism" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-100">
                            View All Destinations <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                    <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {destinations.map(({ district, name, category, destination }) => (
                            <Link
                                key={district}
                                href={`/services/tourism?district=${encodeURIComponent(district)}`}
                                className="group relative isolate aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-lg"
                            >
                                <Image
                                    src={destination!.img}
                                    alt={destination!.alt}
                                    fill
                                    unoptimized={destination!.img.startsWith("https://")}
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
                                    className="object-cover transition duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#06101f] via-[#06101f]/15 to-transparent opacity-90 transition group-hover:opacity-100" />
                                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-200">{category}</span>
                                    <h3 className="mt-1 text-base font-black text-white sm:text-lg">{name}</h3>
                                    {destination!.imageAttribution && (
                                        <p className="mt-1 truncate text-[9px] text-white/60">
                                            Photo: {destination!.imageAttribution.name} · {destination!.imageAttribution.license}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </Container>
            </section>

            <section className="bg-[#f5f8fb] py-16 sm:py-20" aria-labelledby="stay-heading">
                <Container>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Rest easy, celebrate beautifully</p>
                            <h2 id="stay-heading" className="mt-2 text-3xl font-black tracking-tight text-[#10213a] sm:text-4xl">Stay &amp; Celebrate</h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                                Find the perfect place for your events, stays and special occasions.
                            </p>
                        </div>
                        <Link href="/hotels" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-800 transition hover:text-cyan-600">
                            View All Hotels &amp; Venues <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                    <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {EVENT_VENUES.slice(0, 3).map((venue) => (
                            <Link
                                key={venue.id}
                                href={`/hotels#${venue.id}`}
                                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                                    <Image
                                        src={venue.images[0]}
                                        alt={`${venue.name} property`}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover transition duration-700 group-hover:scale-105"
                                    />
                                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-900 shadow-sm">
                                        Hotel &amp; venue
                                    </span>
                                </div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-black text-[#10213a]">{venue.name}</h3>
                                            <p className="mt-1 text-sm text-slate-500">{venue.location}</p>
                                        </div>
                                        {venue.googleRating && venue.reviewCount && venue.reviewCount > 0 && (
                                            <span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-800">
                                                ★ {venue.googleRating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    {venue.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{venue.description}</p>}
                                    <span className="mt-4 inline-flex text-sm font-bold text-cyan-800">View property <span className="ml-1" aria-hidden="true">→</span></span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Container>
            </section>

            <section className="py-16 sm:py-20" aria-label="Travel package and transport promotions">
                <Container>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <article className="overflow-hidden rounded-3xl border border-orange-100 bg-[#fff8ef] shadow-sm">
                            <div className="grid min-h-full sm:grid-cols-[0.9fr_1.1fr]">
                                <div className="grid min-h-64 grid-cols-2 grid-rows-2 gap-1.5 bg-orange-100 p-1.5 sm:min-h-full">
                                    {TRAVEL_PACK_IMAGES.map((image) => (
                                        <div key={image.src} className="relative min-h-28 overflow-hidden rounded-xl">
                                            <Image src={image.src} alt={image.alt} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col p-6 sm:p-7">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-800">Bihar • Curated Journey</p>
                                    <h2 className="mt-3 text-2xl font-black tracking-tight text-[#10213a] sm:text-3xl">Travel Pack Combo</h2>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">
                                        Combine local guides, comfortable stays, and transport at a transparent price for your journey.
                                    </p>
                                    <ul className="mt-5 space-y-2.5 text-sm font-semibold text-slate-700">
                                        {["Local Guide", "Comfortable Stays", "Transport Included"].map((benefit) => (
                                            <li key={benefit} className="flex items-center gap-2.5">
                                                <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-100 text-xs font-black text-teal-800" aria-hidden="true">✓</span>
                                                {benefit}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link href="/combo-packs" className="mt-6 inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600">
                                        Explore Travel Packs <span className="ml-2" aria-hidden="true">→</span>
                                    </Link>
                                </div>
                            </div>
                        </article>

                        <article className="overflow-hidden rounded-3xl border border-[#223956] bg-[#0b1930] text-white shadow-sm">
                            <div className="grid min-h-full sm:grid-cols-[1.1fr_0.9fr]">
                                <div className="flex flex-col p-6 sm:p-7">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Transport Partner</p>
                                    <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">FaabCab</h2>
                                    <p className="mt-3 text-sm leading-6 text-white/70">
                                        Explore transport services for journeys across Bihar.
                                    </p>
                                    <ul className="mt-5 grid grid-cols-2 gap-2 text-xs font-semibold text-white/80">
                                        {["Inter-city trips", "Airport transfers", "Railway pickup & drop", "Local hourly rentals"].map((service) => (
                                            <li key={service} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">{service}</li>
                                        ))}
                                    </ul>
                                    <Link href="/travel-tourism/faabcab" className="mt-6 inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600">
                                        Book a FaabCab <span className="ml-2" aria-hidden="true">→</span>
                                    </Link>
                                </div>
                                <div className="relative min-h-64 bg-[#111c2c] sm:min-h-full">
                                    <Image
                                        src="/faabcab-vehicle.jpg"
                                        alt="FaabCab SUV on a road at sunset"
                                        fill
                                        sizes="(max-width: 640px) 100vw, 440px"
                                        className="object-contain"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1930]/60 via-transparent to-transparent sm:bg-gradient-to-r sm:from-[#0b1930]/30 sm:via-transparent sm:to-transparent" />
                                </div>
                            </div>
                        </article>
                    </div>
                </Container>
            </section>

            <section className="border-t border-slate-200 bg-[#f5f8fb] py-9" aria-label="Evigo benefits">
                <Container>
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                        {TRUST_BENEFITS.map((benefit) => (
                            <div key={benefit.title} className="flex items-start gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-100 text-lg font-bold text-cyan-800" aria-hidden="true">
                                    {benefit.icon}
                                </span>
                                <div>
                                    <h2 className="text-sm font-black text-[#10213a]">{benefit.title}</h2>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{benefit.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>
        </main>
    );
}
