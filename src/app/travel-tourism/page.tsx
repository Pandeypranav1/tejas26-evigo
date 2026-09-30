import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";
import { BIHAR_DESTINATIONS } from "@/lib/constants";

const FAABCAB_SERVICES = [
    "Inter-city One Way / Round Trip",
    "Local Hourly Rental",
    "Airport Transfer",
    "Railway Pickup & Drop",
];

export const metadata = {
    title: "Travel & Tourism",
    description:
        "Discover Bihar, explore local destinations and plan your journey with Evigo.",
};

export default function TravelTourismPage() {
    return (
        <main className="flex-1 bg-white">
            <section className="border-b border-zinc-200 bg-[#f4f7f4] py-14 sm:py-20">
                <Container>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-800">
                        Evigo Travel · Bihar
                    </p>
                    <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-zinc-950 sm:text-5xl">
                        Find your next reason to explore.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
                        Discover Bihar, plan your journey and explore local destinations.
                        Start with the places and travel services already on Evigo.
                    </p>
                </Container>
            </section>

            <section className="py-12 sm:py-16">
                <Container>
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-sm font-bold text-emerald-800">01 / DESTINATIONS</p>
                            <h2 className="mt-2 text-2xl font-black text-zinc-950 sm:text-3xl">
                                Explore Bihar
                            </h2>
                        </div>
                        <Link
                            href="/services/tourism"
                            className="hidden text-sm font-bold text-emerald-800 hover:text-emerald-950 sm:inline"
                        >
                            Open tourism explorer <span aria-hidden="true">→</span>
                        </Link>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                        {BIHAR_DESTINATIONS.map((destination) => (
                            <Link
                                key={destination.name}
                                href={`/services/tourism?district=${encodeURIComponent(destination.district)}`}
                                className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200"
                            >
                                <Image
                                    src={destination.img}
                                    alt={destination.name}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                    className="object-cover transition duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                                    <h3 className="text-lg font-black text-white">{destination.name}</h3>
                                    <p className="mt-0.5 text-xs font-medium text-white/80">
                                        {destination.tag}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                    <Link
                        href="/services/tourism"
                        className="mt-5 inline-flex text-sm font-bold text-emerald-800 hover:text-emerald-950 sm:hidden"
                    >
                        Open tourism explorer <span className="ml-1" aria-hidden="true">→</span>
                    </Link>
                </Container>
            </section>

            <section className="border-y border-zinc-200 bg-[#f7f8f5] py-10 sm:py-14">
                <Container>
                    <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
                        <div className="relative overflow-hidden rounded-lg bg-[#173c35] p-6 text-white sm:p-8">
                            <div className="relative z-10 max-w-xl">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                                    Jamui · Curated journey
                                </p>
                                <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                                    Travel Pack Combo
                                </h2>
                                <p className="mt-3 max-w-lg text-sm leading-6 text-white/80">
                                    A travel experience concept bringing together a local guide,
                                    homestay and transport at one transparent price.
                                </p>
                                <Link
                                    href="/services/tourism?district=Jamui"
                                    className="mt-6 inline-flex rounded-md bg-white px-4 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50"
                                >
                                    Explore Jamui tourism <span className="ml-2" aria-hidden="true">→</span>
                                </Link>
                            </div>
                            <div className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full border border-white/10" />
                            <div className="absolute -bottom-12 -right-4 h-44 w-44 rounded-full border border-white/10" />
                        </div>

                        <div className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                                    Official transport partner
                                </p>
                                <h2 className="mt-3 text-2xl font-black text-zinc-950">FaabCab</h2>
                                <p className="mt-2 text-sm leading-6 text-zinc-600">
                                    Reliable transport services across Jamui, Bihar.
                                </p>
                                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                                    {FAABCAB_SERVICES.map((service) => (
                                        <li
                                            key={service}
                                            className="border-l-2 border-emerald-700 pl-3 text-sm font-medium text-zinc-700"
                                        >
                                            {service}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Link
                                href="/travel-tourism/faabcab"
                                className="mt-6 inline-flex w-fit rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-950"
                            >
                                Book with FaabCab <span className="ml-2" aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                </Container>
            </section>

            <section className="py-8">
                <Container>
                    <Link
                        href="/services/tourism?district=Jamui"
                        className="inline-flex text-sm font-bold text-emerald-800 hover:text-emerald-950"
                    >
                        Explore Jamui places, map and tourism assistant
                        <span className="ml-2" aria-hidden="true">→</span>
                    </Link>
                </Container>
            </section>
        </main>
    );
}