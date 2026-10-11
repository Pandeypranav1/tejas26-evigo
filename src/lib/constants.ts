export const SERVICE_CATEGORIES = [
  "Catering",
  "Photography",
  "DJ",
  "Mehendi & Makeup",
  "Restaurant",
] as const;

// Transport remains a supported service type for existing transport logic,
// but it is intentionally excluded from the generic homepage/service-category cards.
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number] | "Transport";

export const CATEGORY_TAGLINE: Record<ServiceCategory, string> = {
  Catering: "Buffet, snacks, and full-service menus",
  Photography: "Wedding shoots, candid moments, and reels",
  DJ: "Party-ready sound, lights, and vibes",
  "Mehendi & Makeup": "Bridal mehendi and makeover artists",
  Restaurant: "Verified hotels, banquets, and fine dining",
  Transport: "Cabs, car rentals, and local travel",
};

export const CATEGORY_IMAGE: Record<ServiceCategory, string> = {
  Catering: "/catering_service_1777314249262.png",
  Photography: "/photography_service_1777314265964.png",
  DJ: "/dj_service_1777314281684.png",
  "Mehendi & Makeup": "/mehendi_service_1777314296728.png",
  Restaurant: "/partners/events/genx_brij/genx_brij_1.png",
  Transport: "/partners/transport_faabcab.png",
};

export const EMPOWERMENT_IMAGES: { src: string; label: string; sub: string; accent: string }[] = [
  {
    src: "/emp_mehendi_1777315417623.png",
    label: "Mehendi Artistry",
    sub: "Traditional artists sharing their craft",
    accent: "#f59e0b",
  },
  {
    src: "/emp_makeup_1777315436915.png",
    label: "Professional Makeover",
    sub: "Independent makeup experts",
    accent: "#06b6d4",
  },
  {
    src: "/emp_catering_1777315455487.png",
    label: "Catering Excellence",
    sub: "Women-led cooking teams",
    accent: "#8b5cf6",
  },
  {
    src: "/emp_photographer_1777315475083.png",
    label: "Event Photography",
    sub: "Capturing moments professionally",
    accent: "#ec4899",
  },
  {
    src: "/emp_cultural_1777315492625.png",
    label: "Madhubani Artists",
    sub: "Preserving cultural heritage",
    accent: "#10b981",
  },
];

// ── Trusted Partners ──────────────────────────────────────────
// Add new entries here as partnerships are confirmed.
// Format: { name, location, description, image }
// Image path: place file in /public/partners/<filename>.jpg
export interface TrustedPartner {
  name: string;
  location: string;
  description: string;
  image: string;
}

export const TRUSTED_PARTNERS: TrustedPartner[] = [
  {
    name: "Hotel Usha Nand Palace",
    location: "Jamui, Bihar",
    description: "Premium rooms & banquet — ideal for weddings and events.",
    image: "/partners/hotel_usha_nand_palace.png",
  },
  {
    name: "GenX Brij",
    location: "Jamui, Bihar",
    description: "Luxury stay with modern interiors and top-class amenities.",
    image: "/partners/events/genx_brij/genx_brij_1.png",
  },
  {
    name: "Hotel JP Grand",
    location: "Jamui, Bihar",
    description: "Elegant property with serene garden lounge and fine dining.",
    image: "/partners/events/jp_grand/jp_grand_1.png",
  },
  {
    name: "Hotel Nirmala Inn",
    location: "Jamui, Bihar",
    description: "A/C banquet hall, restaurant & conference facilities.",
    image: "/partners/events/nirmala_inn/nirmala_inn_1.png",
  },
  {
    name: "Shagun Vatika",
    location: "Jamui, Bihar",
    description: "Best hotels and banquet hall booking service providers in Jamui.",
    image: "/partners/hotel_shagun_vatika.jpeg",
  },
];

// ── Hotel Partners (Zero-cost nearby search) ──────────────────
// Used by NearbyHotelsV2. No API key needed — radius search runs
// client-side using Haversine distance against this curated list.
export interface HotelPartner {
  id: string;                   // unique slug, e.g. "hotel-patliputra-patna"
  name: string;
  address: string;
  city: string;
  districtBihar: string;        // e.g. "Patna", "Gaya", "Jamui"
  lat: number;
  lng: number;
  category: "hotel" | "restaurant" | "homestay" | "resort";
  photos: string[];             // 1–5 image paths/URLs. First = thumbnail.
  phone?: string;               // optional — shown as "Call" CTA on card
  priceRange?: string;          // e.g. "₹800–₹2,500/night"
  description?: string;
  mapillaryImageId?: string;
}

export const HOTEL_PARTNERS: HotelPartner[] = [
  {
    id: "hotel-usha-nand-palace",
    name: "Hotel Usha Nand Palace",
    address: "Near Town Centre",
    city: "Jamui",
    districtBihar: "Jamui",
    lat: 24.9278,
    lng: 86.2265,
    category: "hotel",
    photos: [
      "/partners/events/usha_nand/usha_nand_1.png",
      "/partners/events/usha_nand/usha_nand_2.jpg",
      "/partners/events/usha_nand/usha_nand_3.jpg",
      "/partners/events/usha_nand/usha_nand_4.jpg",
      "/partners/events/usha_nand/usha_nand_5.jpg",
    ],
    phone: "+91 98765 00001",
    priceRange: "₹1,500–₹4,000/night",
    description: "Premium rooms & grand banquet — ideal for weddings, corporate events, and family functions.",
  },
  {
    id: "genx-brij",
    name: "GenX Brij",
    address: "Main Road",
    city: "Jamui",
    districtBihar: "Jamui",
    lat: 24.9240,
    lng: 86.2210,
    category: "hotel",
    photos: [
      "/partners/events/genx_brij/genx_brij_1.png",
      "/partners/events/genx_brij/genx_brij_2.png",
      "/partners/events/genx_brij/genx_brij_3.png",
      "/partners/events/genx_brij/genx_brij_4.png",
      "/partners/events/genx_brij/genx_brij_5.png",
    ],
    phone: "+91 98765 00002",
    priceRange: "₹1,200–₹3,500/night",
    description: "Luxury stay with modern interiors, Punjabi Junction restaurant, and Bake & Chill café.",
  },
  {
    id: "hotel-jp-grand",
    name: "Hotel JP Grand",
    address: "JP Grand Road",
    city: "Jamui",
    districtBihar: "Jamui",
    lat: 24.9310,
    lng: 86.2290,
    category: "hotel",
    photos: [
      "/partners/events/jp_grand/jp_grand_1.png",
      "/partners/events/jp_grand/jp_grand_2.png",
      "/partners/events/jp_grand/jp_grand_3.png",
      "/partners/events/jp_grand/jp_grand_4.png",
      "/partners/events/jp_grand/jp_grand_5.png",
    ],
    phone: "+91 98765 00003",
    priceRange: "₹1,000–₹3,000/night",
    description: "Elegant property with serene garden lounge, fine dining, and well-equipped banquet facilities.",
  },
  {
    id: "hotel-nirmala-inn",
    name: "Hotel Nirmala Inn",
    address: "Station Road",
    city: "Jamui",
    districtBihar: "Jamui",
    lat: 24.9215,
    lng: 86.2230,
    category: "hotel",
    photos: [
      "/partners/events/nirmala_inn/nirmala_inn_1.png",
      "/partners/events/nirmala_inn/nirmala_inn_2.png",
      "/partners/events/nirmala_inn/nirmala_inn_3.png",
      "/partners/events/nirmala_inn/nirmala_inn_4.png",
      "/partners/events/nirmala_inn/nirmala_inn_5.png",
    ],
    phone: "+91 98765 00004",
    priceRange: "₹800–₹2,500/night",
    description: "Fully A/C banquet hall, multi-cuisine restaurant, family suites and conference facilities.",
  },
  {
    id: "hotel-shagun-vatika",
    name: "Shagun Vatika",
    address: "Jamui, Bihar — Premier hotel & banquet venue",
    city: "Jamui",
    districtBihar: "Jamui",
    lat: 24.9278,
    lng: 86.2265,
    category: "hotel",
    photos: [
      "/partners/events/shagun_vatika/shagun_vatika_1.jpeg",
      "/partners/events/shagun_vatika/shagun_vatika_2.jpeg",
      "/partners/events/shagun_vatika/shagun_vatika_3.jpeg",
      "/partners/events/shagun_vatika/shagun_vatika_4.jpeg",
      "/partners/events/shagun_vatika/shagun_vatika_5.jpeg",
    ],
    phone: "+91 9473455717",
    priceRange: "₹1,500–₹4,000/night",
    description: "Best hotels and banquet hall booking service providers in Jamui.",
  }
];

// ── Bihar City Centroids (for city-dropdown & manual search fallback) ──
// Used as the origin lat/lng when searching. No external geocoding API needed.
export const BIHAR_CITIES: { name: string; lat: number; lng: number; aliases?: string[] }[] = [
  { name: "Jamui", lat: 24.9278, lng: 86.2265, aliases: ["jamui", "jamui bihar", "jamui town", "jamui station", "malaypur"] },
  { name: "Patna", lat: 25.5941, lng: 85.1376, aliases: ["patna", "patna city", "pataliputra", "danapur"] },
  { name: "Gaya", lat: 24.7955, lng: 85.0002, aliases: ["gaya", "gaya ji", "bodh gaya", "bodhgaya"] },
  { name: "Muzaffarpur", lat: 26.1197, lng: 85.3910, aliases: ["muzaffarpur", "muz"] },
  { name: "Bhagalpur", lat: 25.2425, lng: 86.9842, aliases: ["bhagalpur", "silk city"] },
  { name: "Rajgir", lat: 25.0303, lng: 85.4182, aliases: ["rajgir", "rajgriha"] },
  { name: "Nalanda", lat: 25.1359, lng: 85.4442, aliases: ["nalanda", "bihar sharif"] },
  { name: "Vaishali", lat: 25.6870, lng: 85.1290, aliases: ["vaishali", "hajipur"] },
  { name: "Bodh Gaya", lat: 24.6961, lng: 84.9911, aliases: ["bodhgaya", "bodh gaya"] },
  { name: "Munger", lat: 25.3743, lng: 86.4730, aliases: ["munger", "monghyr", "jamalpur"] },
  { name: "Begusarai", lat: 25.4182, lng: 86.1272, aliases: ["begusarai", "barauni"] },
  { name: "Darbhanga", lat: 26.1542, lng: 85.8918, aliases: ["darbhanga", "mithila"] },
  { name: "Sitamarhi", lat: 26.5936, lng: 85.4899, aliases: ["sitamarhi"] },
  { name: "Motihari", lat: 26.6503, lng: 84.9183, aliases: ["motihari", "east champaran"] },
  { name: "Samastipur", lat: 25.8614, lng: 85.7795, aliases: ["samastipur"] },
  { name: "Purnia", lat: 25.7771, lng: 87.4753, aliases: ["purnia", "purnea"] },
  { name: "Katihar", lat: 25.5541, lng: 87.5683, aliases: ["katihar"] },
  { name: "Saharsa", lat: 25.8835, lng: 86.6006, aliases: ["saharsa"] },
  { name: "Deoghar", lat: 24.4826, lng: 86.6974, aliases: ["deoghar", "baba dham"] },
  { name: "Simultala", lat: 24.7115, lng: 86.5415, aliases: ["simultala", "simultala hill station"] },
];

/**
 * Fuzzy search for a Bihar city by query string
 */
export function resolveBiharCity(query: string): { name: string; lat: number; lng: number } | null {
  if (!query) return null;
  const clean = query.trim().toLowerCase().replace(/[,.-]/g, " ").replace(/\s+/g, " ");

  // 1. Direct name match
  for (const city of BIHAR_CITIES) {
    if (city.name.toLowerCase() === clean) return city;
  }

  // 2. Alias match
  for (const city of BIHAR_CITIES) {
    if (city.aliases?.some((a) => a === clean || clean.includes(a) || a.includes(clean))) {
      return city;
    }
  }

  // 3. Partial substring match
  for (const city of BIHAR_CITIES) {
    if (clean.includes(city.name.toLowerCase()) || city.name.toLowerCase().includes(clean)) {
      return city;
    }
  }

  return null;
}

// ── Haversine distance utility ────────────────────────────────
// Returns straight-line distance in km between two lat/lng pairs.
// Used for the zero-cost radius search (no API call).
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Event Venues ──────────────────────────────────────────────
export interface EventVenue {
  id: string;
  name: string;
  location: string;
  city: string;
  address: string;
  phone?: string;
  priceRange?: string;          // e.g. "₹1,500–₹5,000/night"
  description?: string;
  images: string[];             // Numbered: {slug}_{n}.png
  googleRating?: number;
  reviewCount?: number;
  safetyFeatures: string[];
  services: string[];           // e.g. ["Room Booking", "Banquet Hall", "Catering"]
}

export const EVENT_VENUES: EventVenue[] = [
  {
    id: "usha-nand-palace",
    name: "Hotel Usha Nand Palace",
    location: "Jamui, Bihar",
    city: "Jamui",
    address: "Jamui, Bihar — Near Town Centre",
    phone: "+91 98765 00001",
    priceRange: "₹1,500–₹4,000/night",
    description: "Premium rooms & grand banquet — ideal for weddings, corporate events, and family functions.",
    images: [
      "/partners/events/usha_nand/usha_nand_1.png",
      "/partners/events/usha_nand/usha_nand_2.jpg",
      "/partners/events/usha_nand/usha_nand_3.jpg",
      "/partners/events/usha_nand/usha_nand_4.jpg",
      "/partners/events/usha_nand/usha_nand_5.jpg",
    ],
    googleRating: 4.7,
    reviewCount: 57,
    safetyFeatures: ["CCTV Surveillance", "Fire Safety"],
    services: ["Room Booking", "Banquet Hall", "Restaurant & Dining", "Conference Room"],
  },
  {
    id: "genx-brij",
    name: "GenX Brij",
    location: "Jamui, Bihar",
    city: "Jamui",
    address: "Jamui, Bihar — Main Road",
    phone: "+91 98765 00002",
    priceRange: "₹1,200–₹3,500/night",
    description: "Luxury stay with modern interiors, Punjabi Junction restaurant, and Bake & Chill café.",
    images: [
      "/partners/events/genx_brij/genx_brij_1.png",
      "/partners/events/genx_brij/genx_brij_2.png",
      "/partners/events/genx_brij/genx_brij_3.png",
      "/partners/events/genx_brij/genx_brij_4.png",
      "/partners/events/genx_brij/genx_brij_5.png",
    ],
    googleRating: 4.5,
    reviewCount: 42,
    safetyFeatures: ["CCTV Surveillance", "Fire Safety", "24/7 Security"],
    services: ["Room Booking", "Banquet Hall Booking", "Restaurant & Café", "Event Catering"],
  },
  {
    id: "hotel-jp-grand",
    name: "Hotel JP Grand",
    location: "Jamui, Bihar",
    city: "Jamui",
    address: "Jamui, Bihar — JP Grand Road",
    phone: "+91 98765 00003",
    priceRange: "₹1,000–₹3,000/night",
    description: "Elegant property with serene garden lounge, fine dining, and well-equipped banquet facilities.",
    images: [
      "/partners/events/jp_grand/jp_grand_1.png",
      "/partners/events/jp_grand/jp_grand_2.png",
      "/partners/events/jp_grand/jp_grand_3.png",
      "/partners/events/jp_grand/jp_grand_4.png",
      "/partners/events/jp_grand/jp_grand_5.png",
    ],
    googleRating: 4.6,
    reviewCount: 38,
    safetyFeatures: ["CCTV Surveillance", "Fire Safety", "24/7 Security"],
    services: ["Room Booking", "Banquet Hall Booking", "Fine Dining", "Outdoor Catering"],
  },
  {
    id: "hotel-nirmala-inn",
    name: "Hotel Nirmala Inn",
    location: "Jamui, Bihar",
    city: "Jamui",
    address: "Jamui, Bihar — Station Road",
    phone: "+91 98765 00004",
    priceRange: "₹800–₹2,500/night",
    description: "Fully A/C banquet hall, multi-cuisine restaurant, family suites and conference facilities.",
    images: [
      "/partners/events/nirmala_inn/nirmala_inn_1.png",
      "/partners/events/nirmala_inn/nirmala_inn_2.png",
      "/partners/events/nirmala_inn/nirmala_inn_3.png",
      "/partners/events/nirmala_inn/nirmala_inn_4.png",
      "/partners/events/nirmala_inn/nirmala_inn_5.png",
    ],
    googleRating: 4.4,
    reviewCount: 29,
    safetyFeatures: ["CCTV Surveillance", "Fire Safety", "24/7 Security"],
    services: ["Room Booking", "Banquet Hall Booking", "Restaurant", "Conference Room", "Event Catering"],
  },
  {
    id: "shagun-vatika",
    name: "Shagun Vatika",
    location: "Jamui, Bihar",
    city: "Jamui",
    address: "Jamui, Bihar — Premier hotel & banquet venue",
    phone: "+91 9473455717",
    priceRange: "₹1,500–₹4,000/night",
    description: "Best hotels and banquet hall booking service providers in Jamui.",
    images: [
      "/partners/events/shagun_vatika/shagun_vatika_1.jpeg",
      "/partners/events/shagun_vatika/shagun_vatika_2.jpeg",
      "/partners/events/shagun_vatika/shagun_vatika_3.jpeg",
      "/partners/events/shagun_vatika/shagun_vatika_4.jpeg",
      "/partners/events/shagun_vatika/shagun_vatika_5.jpeg",
    ],
    googleRating: 4.5,
    reviewCount: 0,
    safetyFeatures: ["CCTV Surveillance", "Fire Safety"],
    services: ["Room Booking", "Banquet Hall", "Restaurant & Dining", "Conference Room"],
  }
];

// ── Demo Providers & Seeding ──────────────────────────────────
export const PROVIDERS_KEY = "sev_demo_providers_v1";

export interface DemoProvider {
  id: string;
  ownerUid: string;
  ownerName: string;
  businessName: string;
  category: ServiceCategory;
  phone: string;
  city: string;
  startingPrice: number;
  experienceYears: number;
  description: string;
  imageUrl: string;
  createdAt: number;
  isActive: boolean;
}

export function getDemoProviders(): DemoProvider[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    const providers = raw
      ? (JSON.parse(raw) as Array<DemoProvider & { category?: string }>)
      : [];

    // FaabCab is now managed through Supabase as the real transport partner.
    // Remove any legacy local demo Transport/FaabCab entries so they cannot
    // reappear in older browser localStorage data.
    const filteredProviders = providers.filter(
      (provider) => provider.category !== "Transport"
    ) as DemoProvider[];

    if (filteredProviders.length !== providers.length) {
      localStorage.setItem(
        PROVIDERS_KEY,
        JSON.stringify(filteredProviders)
      );
    }

    return filteredProviders;
  } catch {
    return [];
  }
}

// ── Tourism Places ────────────────────────────────────────────
export interface TourismPlace {
  id: string;
  name: string;
  district: string;
  category: string;
  description: string;
  overview: string;
  historicalBackground: string;
  significance: string;
  location: string;
  howToReach: string;
  timings?: string;
  entryFee?: string;
  historySources: { label: string; url: string }[];
  image?: string;
  lat?: number;
  lng?: number;
  featured?: boolean;
}

export interface TourismImageAttribution {
  name: string;
  source: string;
  license: string;
  licenseUrl: string;
}

export interface TourismDistrict {
  id: string;
  name: string;
  available: boolean;
  count: number;
  tagline: string;
  description: string;
  heroImage: string;
  heroImageAlt: string;
  bestTimeToVisit?: string;
  imageAttribution?: TourismImageAttribution;
}

export const TOURISM_DESTINATION_IMAGES: Record<
  string,
  {
    src: string;
    alt: string;
    objectPosition?: string;
    imageAttribution?: TourismImageAttribution;
  }
> = {
  Jamui: {
    src: "/tourism/jamui/giddheshwar_actual.jpg",
    alt: "Giddheshwar Temple and surrounding landscape in Jamui, Bihar",
  },
  Patna: {
    src: "https://upload.wikimedia.org/wikipedia/commons/d/db/The_Evening_View_from_Ghandhi_Ghat_Patna_01.jpg",
    alt: "Evening view of Gandhi Ghat on the Ganga in Patna, Bihar",
    objectPosition: "center 58%",
    imageAttribution: {
      name: "AnkitAnand073",
      source: "https://commons.wikimedia.org/wiki/File:The_Evening_View_from_Ghandhi_Ghat_Patna_01.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  Gaya: {
    src: "/tourism/bodh_gaya_mahabodhi.jpg",
    alt: "Stone Buddha reliefs on the south wall of Mahabodhi Temple, Bodh Gaya, Bihar",
    imageAttribution: {
      name: "Sumitsurai",
      source: "https://commons.wikimedia.org/wiki/File:Mahabodhi_Temple_South_Wall_(2).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  Rajgir: {
    src: "/tourism/rajgir_shanti_stupa.jpg",
    alt: "Vishwa Shanti Stupa at Rajgir, Bihar",
    imageAttribution: {
      name: "Photo Dharma",
      source: "https://commons.wikimedia.org/wiki/File:Shanti_Stupa_at_Rajgir.jpg",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    },
  },
  Nalanda: {
    src: "/tourism/nalanda_mahavihara.jpg",
    alt: "Brick monastery ruins at Nalanda Mahavihara, Bihar",
    imageAttribution: {
      name: "Sumitsurai",
      source: "https://commons.wikimedia.org/wiki/File:Monastery_5_-_Nalanda_Mahavihara_(1).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  Sitamarhi: {
    src: "/tourism/sitamarhi_punaura_dham.jpg",
    alt: "Punaura Dham temple in Sitamarhi, Bihar",
    imageAttribution: {
      name: "Skrsingh009",
      source: "https://commons.wikimedia.org/wiki/File:Punaura_Dham.jpg",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    },
  },
  Vaishali: {
    src: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Ashokan_Pillar_and_Buddhist_Stupa_at_Vaishali%2C_Bihar_%28350840154%29.jpg",
    alt: "Ashokan Pillar and Buddhist stupa at Vaishali, Bihar",
    imageAttribution: {
      name: "Chandan Singh",
      source: "https://commons.wikimedia.org/wiki/File:Ashokan_Pillar_and_Buddhist_Stupa_at_Vaishali,_Bihar_(350840154).jpg",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    },
  },
  Madhubani: {
    src: "/tourism/madhubani_art.jpg",
    alt: "Mithila paintings displayed at a Madhubani art market in Bihar",
  },
};

export const TOURISM_DISTRICTS: TourismDistrict[] = [
  {
    id: "Jamui",
    name: "Jamui",
    available: true,
    count: 8,
    tagline: "Hills, Jain Pilgrimage & Ancient Heritage",
    description: "Explore Jain pilgrimage, heritage and nature across Jamui.",
    heroImage: TOURISM_DESTINATION_IMAGES.Jamui.src,
    heroImageAlt: TOURISM_DESTINATION_IMAGES.Jamui.alt,
    bestTimeToVisit: "Oct - Mar",
  },
  {
    id: "Patna",
    name: "Patna",
    available: true,
    count: 1,
    tagline: "Ancient Pataliputra & Ganges Ghats",
    description: "Discover the Ganga riverfront, historic landmarks and urban heritage.",
    heroImage: TOURISM_DESTINATION_IMAGES.Patna.src,
    heroImageAlt: TOURISM_DESTINATION_IMAGES.Patna.alt,
    imageAttribution: TOURISM_DESTINATION_IMAGES.Patna.imageAttribution,
  },
  {
    id: "Gaya",
    name: "Gaya & Bodh Gaya",
    available: true,
    count: 1,
    tagline: "Mahabodhi Temple & Spiritual Trails",
    description: "Explore Buddhist heritage and pilgrimage architecture at Bodh Gaya.",
    heroImage: TOURISM_DESTINATION_IMAGES.Gaya.src,
    heroImageAlt: TOURISM_DESTINATION_IMAGES.Gaya.alt,
    imageAttribution: TOURISM_DESTINATION_IMAGES.Gaya.imageAttribution,
  },
  {
    id: "Rajgir",
    name: "Nalanda & Rajgir",
    available: true,
    count: 2,
    tagline: "Ancient University & Hot Springs",
    description: "Discover Nalanda heritage, Rajgir hills and the Shanti Stupa.",
    heroImage: TOURISM_DESTINATION_IMAGES.Rajgir.src,
    heroImageAlt: TOURISM_DESTINATION_IMAGES.Rajgir.alt,
    imageAttribution: TOURISM_DESTINATION_IMAGES.Rajgir.imageAttribution,
  },
  {
    id: "Nalanda",
    name: "Nalanda",
    available: true,
    count: 1,
    tagline: "Ancient University & Buddhist Heritage",
    description: "Explore the UNESCO-listed Nalanda Mahavihara and its ancient university ruins.",
    heroImage: TOURISM_DESTINATION_IMAGES.Nalanda.src,
    heroImageAlt: TOURISM_DESTINATION_IMAGES.Nalanda.alt,
    imageAttribution: TOURISM_DESTINATION_IMAGES.Nalanda.imageAttribution,
  },
  {
    id: "Sitamarhi",
    name: "Sitamarhi",
    available: true,
    count: 1,
    tagline: "Punaura Dham & Mithila Heritage",
    description: "Visit Punaura Dham, a religious destination in Sitamarhi district.",
    heroImage: TOURISM_DESTINATION_IMAGES.Sitamarhi.src,
    heroImageAlt: TOURISM_DESTINATION_IMAGES.Sitamarhi.alt,
    imageAttribution: TOURISM_DESTINATION_IMAGES.Sitamarhi.imageAttribution,
  },
  {
    id: "Vaishali",
    name: "Vaishali",
    available: true,
    count: 1,
    tagline: "Buddhist Heritage & Republic",
    description: "Explore the ancient republic where Buddha delivered his last sermon.",
    heroImage: TOURISM_DESTINATION_IMAGES.Vaishali.src,
    heroImageAlt: TOURISM_DESTINATION_IMAGES.Vaishali.alt,
    imageAttribution: TOURISM_DESTINATION_IMAGES.Vaishali.imageAttribution,
  },
  {
    id: "Madhubani",
    name: "Madhubani",
    available: true,
    count: 1,
    tagline: "Mithila Art & Culture",
    description: "Discover the vibrant Madhubani paintings and Mithila culture.",
    heroImage: TOURISM_DESTINATION_IMAGES.Madhubani.src,
    heroImageAlt: TOURISM_DESTINATION_IMAGES.Madhubani.alt,
  },
];

export interface BiharDestination {
  name: string;
  tag: string;
  img: string;
  alt: string;
  district: string;
  objectPosition?: string;
  imageAttribution?: TourismImageAttribution;
}

export const BIHAR_DESTINATIONS: BiharDestination[] = [
  {
    name: "Patna",
    tag: "Ganges Ghats & Cultural Landmarks",
    img: TOURISM_DESTINATION_IMAGES.Patna.src,
    alt: TOURISM_DESTINATION_IMAGES.Patna.alt,
    district: "Patna",
    objectPosition: TOURISM_DESTINATION_IMAGES.Patna.objectPosition,
    imageAttribution: TOURISM_DESTINATION_IMAGES.Patna.imageAttribution,
  },
  {
    name: "Jamui",
    tag: "Jain Pilgrimage, Heritage & Nature",
    img: TOURISM_DESTINATION_IMAGES.Jamui.src,
    alt: TOURISM_DESTINATION_IMAGES.Jamui.alt,
    district: "Jamui",
  },
  {
    name: "Gaya",
    tag: "Bodh Gaya & Buddhist Heritage",
    img: TOURISM_DESTINATION_IMAGES.Gaya.src,
    alt: TOURISM_DESTINATION_IMAGES.Gaya.alt,
    district: "Gaya",
  },
  {
    name: "Rajgir",
    tag: "Hills, Ropeway & Heritage",
    img: TOURISM_DESTINATION_IMAGES.Rajgir.src,
    alt: TOURISM_DESTINATION_IMAGES.Rajgir.alt,
    district: "Rajgir",
    objectPosition: TOURISM_DESTINATION_IMAGES.Rajgir.objectPosition,
    imageAttribution: TOURISM_DESTINATION_IMAGES.Rajgir.imageAttribution,
  },
  {
    name: "Nalanda",
    tag: "Ancient University",
    img: TOURISM_DESTINATION_IMAGES.Nalanda.src,
    alt: TOURISM_DESTINATION_IMAGES.Nalanda.alt,
    district: "Nalanda",
    imageAttribution: TOURISM_DESTINATION_IMAGES.Nalanda.imageAttribution,
  },
  {
    name: "Sitamarhi",
    tag: "Punaura Dham & Mithila Heritage",
    img: TOURISM_DESTINATION_IMAGES.Sitamarhi.src,
    alt: TOURISM_DESTINATION_IMAGES.Sitamarhi.alt,
    district: "Sitamarhi",
    imageAttribution: TOURISM_DESTINATION_IMAGES.Sitamarhi.imageAttribution,
  },
  {
    name: "Vaishali",
    tag: "Buddhist Heritage",
    img: TOURISM_DESTINATION_IMAGES.Vaishali.src,
    alt: TOURISM_DESTINATION_IMAGES.Vaishali.alt,
    district: "Vaishali",
    imageAttribution: TOURISM_DESTINATION_IMAGES.Vaishali.imageAttribution,
  },
  {
    name: "Madhubani",
    tag: "Mithila Art & Culture",
    img: TOURISM_DESTINATION_IMAGES.Madhubani.src,
    alt: TOURISM_DESTINATION_IMAGES.Madhubani.alt,
    district: "Madhubani",
  },
];

export const HERO_SLIDER_IMAGES: {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  imageAttribution?: TourismImageAttribution;
}[] = [
  {
    src: "/tourism/patna_ganga_ghat.jpg",
    alt: "Ganga riverfront in Patna, Bihar",
    title: "Patna Ganga Riverfront",
    subtitle: "Riverfront views along the Ganga",
  },
  {
    src: "/tourism/jamui/simultala.png",
    alt: "Simultala hills in Jamui, Bihar",
    title: "Simultala Hills",
    subtitle: "A quiet nature escape in Jamui",
  },
] as const;

export const CURATED_EXPERIENCES: {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  link: string;
  imageAttribution?: TourismImageAttribution;
}[] = [
  {
    id: "spiritual",
    title: "Spiritual Circuit",
    description: "Visit sacred sites and experience Bihar's spiritual heritage",
    image: "/tourism/nunthardham_shiva.jpg",
    imageAlt: "Shiva shrine at Nunthardham, Jamui, Bihar",
    link: "/services/tourism?category=religious"
  },
  {
    id: "heritage",
    title: "Heritage Trail",
    description: "Walk through ancient ruins and historical landmarks",
    image: "/tourism/munger_fort.jpg",
    imageAlt: "Historic Munger Fort beside the Ganga in Bihar",
    imageAttribution: {
      name: "Rkrjmp",
      source: "https://commons.wikimedia.org/wiki/File:Munger_Fort,_Bihar.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    link: "/services/tourism?category=historical"
  },
  {
    id: "nature",
    title: "Nature & Adventure",
    description: "Explore hills, forests, rivers and adventure activities",
    image: "/tourism/jamui/simultala.png",
    imageAlt: "Green hills around Simultala in Jamui, Bihar",
    link: "/services/tourism?category=nature"
  },
  {
    id: "food",
    title: "Food & Culture",
    description: "Taste local flavors and experience Mithila's vibrant culture",
    image: "/mithila_cultural_1777314631804.png",
    imageAlt: "Mithila cultural art and traditions from Bihar",
    link: "/services/tourism"
  }
] as const;

export const TOURISM_PLACES: TourismPlace[] = [
  {
    id: "mahabodhi-temple",
    name: "Mahabodhi Temple",
    district: "Gaya",
    category: "Religious / Buddhist temple",
    description: "UNESCO World Heritage Site and the place where Buddha attained enlightenment.",
    overview: "The Mahabodhi Temple complex in Bodh Gaya is the most sacred site in Buddhism.",
    historicalBackground: "The original temple was built by Emperor Ashoka in the 3rd century BCE. The current structure dates to the 5th-6th century CE during the Gupta period.",
    significance: "The holiest site in Buddhism, marking the location where Siddhartha Gautama attained enlightenment.",
    location: "Bodh Gaya, Gaya district, Bihar",
    howToReach: "Well connected by road, rail, and air. Gaya has its own airport with connections to major Indian cities.",
    timings: "5:00 AM - 9:00 PM (open throughout the year)",
    entryFee: "Free for all",
    historySources: [
      { label: "UNESCO World Heritage Centre", url: "https://whc.unesco.org/en/list/1056" },
      { label: "Bihar Tourism", url: "https://tourism.bihar.gov.in/en/destinations/gaya/bodh-gaya" },
    ],
    image: TOURISM_DESTINATION_IMAGES.Gaya.src,
    lat: 24.6954,
    lng: 84.991358,
    featured: true,
  },
  {
    id: "vishwa-shanti-stupa",
    name: "Vishwa Shanti Stupa",
    district: "Rajgir",
    category: "Religious / Buddhist temple",
    description: "Peace Pagoda built on the Ratnagiri hill in Rajgir.",
    overview: "A beautiful white stupa built by Japanese Buddhists to promote world peace.",
    historicalBackground: "Built in 1969 and inaugurated in 1970 by the Japanese Buddhist monk Nichidatsu Fujii.",
    significance: "One of the Peace Pagodas built around the world to promote world peace and non-violence.",
    location: "Ratnagiri Hill, Rajgir, Nalanda district, Bihar",
    howToReach: "Can be reached by ropeway from Rajgir or by road trekking.",
    timings: "6:00 AM - 6:00 PM",
    entryFee: "Free",
    historySources: [
      { label: "Bihar Tourism", url: "https://tourism.bihar.gov.in/en/destinations/rajgir" },
    ],
    image: TOURISM_DESTINATION_IMAGES.Rajgir.src,
    lat: 25.0044,
    lng: 85.4427,
    featured: true,
  },
  {
    id: "nalanda-ruins",
    name: "Nalanda Mahavihara Ruins",
    district: "Nalanda",
    category: "Historical / Monument",
    description: "Ancient Buddhist university that was a center of learning from 5th to 12th century CE.",
    overview: "The most famous and prestigious university of ancient India.",
    historicalBackground: "Founded in 427 CE during the Gupta dynasty, it attracted scholars from all over Asia including Hiuen Tsang.",
    significance: "UNESCO World Heritage Site representing the pinnacle of ancient Indian education.",
    location: "Nalanda, near Rajgir, Bihar",
    howToReach: "Well connected by road from Patna and Rajgir",
    timings: "9:00 AM - 5:00 PM (closed on Mondays)",
    entryFee: "₹15 for Indians, ₹200 for foreigners",
    historySources: [
      { label: "UNESCO World Heritage Centre", url: "https://whc.unesco.org/en/list/1502" },
      { label: "Bihar Tourism", url: "https://tourism.bihar.gov.in/en/destinations/nalanda" },
    ],
    image: TOURISM_DESTINATION_IMAGES.Nalanda.src,
    lat: 25.1358,
    lng: 85.4758,
    featured: true,
  },
  {
    id: "ashokan-pillar-vaishali",
    name: "Ashokan Pillar",
    district: "Vaishali",
    category: "Historical / Monument",
    description: "Ancient pillar erected by Emperor Ashoka at Kolhua to mark Buddha's last sermon.",
    overview: "One of the most important archaeological sites in Bihar associated with Buddhism.",
    historicalBackground: "Erected in the 3rd century BCE by Emperor Ashoka to commemorate the last sermon of Buddha.",
    significance: "Marks the site where Buddha delivered his last sermon before attaining Mahaparinirvana.",
    location: "Kolhua, Vaishali district, Bihar",
    howToReach: "About 55 km from Patna, accessible by road.",
    timings: "6:00 AM - 6:00 PM",
    entryFee: "Free",
    historySources: [
      { label: "Bihar Tourism", url: "https://tourism.bihar.gov.in/en/destinations/vaishali" },
    ],
    image: TOURISM_DESTINATION_IMAGES.Vaishali.src,
    lat: 25.9890,
    lng: 85.3490,
    featured: true,
  },
  {
    id: "madhubani-art-village",
    name: "Madhubani Art Village",
    district: "Madhubani",
    category: "Cultural / Art",
    description: "Traditional Mithila painting village showcasing the ancient art form of Bihar.",
    overview: "Experience the vibrant and intricate Madhubani paintings passed down through generations.",
    historicalBackground: "Madhubani painting originated in the Mithila region of Bihar, dating back to the Ramayana period.",
    significance: "UNESCO Intangible Cultural Heritage representing the rich cultural heritage of Mithila.",
    location: "Madhubani district, Bihar",
    howToReach: "About 140 km from Patna, accessible by road and rail.",
    timings: "10:00 AM - 6:00 PM",
    entryFee: "Free to visit, workshops may charge a fee",
    historySources: [
      { label: "UNESCO Intangible Cultural Heritage", url: "https://ich.unesco.org/en/RL/mithila-painting-01052" },
      { label: "Bihar Tourism", url: "https://tourism.bihar.gov.in/en/destinations/madhubani" },
    ],
    image: "/tourism/madhubani_art.jpg",
    lat: 26.3718,
    lng: 86.0831,
    featured: true,
  },
  {
    id: "gandhi-ghat-patna",
    name: "Gandhi Ghat",
    district: "Patna",
    category: "Historical / Heritage",
    description: "Historic ghat on the banks of the Ganges river in Patna.",
    overview: "Named after Mahatma Gandhi, this ghat is famous for its evening aarti and spiritual atmosphere.",
    historicalBackground: "The ghat was where Gandhi's ashes were immersed in the Ganges.",
    significance: "Important pilgrimage site and a place of historical significance for India's independence movement.",
    location: "Patna, Bihar",
    howToReach: "Central location in Patna, easily accessible by auto-rickshaw and taxi.",
    timings: "Open 24 hours",
    entryFee: "Free",
    historySources: [
      { label: "Bihar Tourism", url: "https://tourism.bihar.gov.in/en/destinations/patna" },
    ],
    image: TOURISM_DESTINATION_IMAGES.Patna.src,
    lat: 25.6100,
    lng: 85.1500,
    featured: true,
  },
  {
    id: "punaura-dham",
    name: "Punaura Dham",
    district: "Sitamarhi",
    category: "Religious / Temple",
    description: "A religious destination listed by the Sitamarhi District Administration and associated in local tradition with Sita.",
    overview: "Punaura Dham is a pilgrimage destination in Sitamarhi district.",
    historicalBackground: "The Sitamarhi District Administration lists Punaura Dham as a tourist place. Its association with Sita is part of local religious tradition.",
    significance: "A local Hindu pilgrimage destination.",
    location: "Punaura, Sitamarhi district, Bihar",
    howToReach: "The official tourist listing does not specify current public transport or visitor timings; confirm locally before travel.",
    historySources: [
      { label: "Sitamarhi District Administration — Tourist Places", url: "https://sitamarhi.nic.in/tourist-places/" },
    ],
    image: TOURISM_DESTINATION_IMAGES.Sitamarhi.src,
    featured: true,
  },
  {
    id: "simultala-hill-station",
    name: "Simultala Hill Station",
    district: "Jamui",
    category: "Nature / Hill station",
    description: "Scenic hills and pleasant weather; local tradition regards it as a Tapobhumi associated with Sri Ramakrishna Paramhans.",
    overview: "The Jamui District Administration describes Simultala for its scenic hills and pleasant weather.",
    historicalBackground: "No construction date or documented historical chronology was provided in the official sources reviewed. The District Administration says Simultala is supposed to be a Tapobhumi associated with Sri Ramakrishna Paramhans; this is an attributed tradition, not established here as a proven historical event.",
    significance: "A hill and nature destination. Its association with Sri Ramakrishna is described by the District Administration as a supposition/tradition.",
    location: "Simultala, Jamui district. The existing Evigo map coordinates are retained.",
    howToReach: "The official district source reviewed does not publish a transport route or distance. Use the existing map directions for navigation.",
    historySources: [
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/simultala.png",
    // Verified: Simultala Railway Station area, Jamui district
    lat: 24.71407,
    lng: 86.54201,
    featured: true,
  },
  {
    id: "kshatriya-kund-gram",
    name: "Kshatriya Kund Gram",
    district: "Jamui",
    category: "Religious / Jain pilgrimage",
    description: "A Jain pilgrimage destination that Jain tradition reveres as Lord Mahavira's birthplace.",
    overview: "Kshatriya Kund Gram is a Jain pilgrimage destination associated with Lord Mahavira.",
    historicalBackground: "According to Jain tradition, Kshatriya Kund Gram is revered as the birthplace of Lord Mahavira. Bihar Tourism describes Lachhuar as the gateway to the place believed to be his birthplace. This is a religious tradition; the sources reviewed do not provide archaeological evidence or an independently verified date.",
    significance: "A Jain pilgrimage site. Its birthplace association is presented by the sources as a belief/tradition, not as independently established history.",
    location: "Kshatriya Kund Gram, Jamui district. Bihar Tourism places the Lachhuar gateway in Sikandra block, about 20 km west of Jamui headquarters.",
    howToReach: "Bihar Tourism describes Lachhuar as the gateway to Kund and says regular treks are organized from the temple. It lists auto-rickshaws and local buses from Jamui town to Lachhuar; check locally for current onward access.",
    historySources: [
      { label: "Bihar Tourism — Lachhuar Jain Temple", url: "https://tourism.bihar.gov.in/en/destinations/jamui/jain-temple-lachuar" },
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/kund_gram.png",
    // Verified: ~20km west of Jamui HQ, near Lachhuar in Sikandra block
    // Source: Bihar govt records — 24°55'N, 85°50'E
    lat: 24.9167,
    lng: 85.8333,
    featured: true,
  },
  {
    id: "lachhuar-jain-mandir",
    name: "Lachhuar Jain Mandir",
    district: "Jamui",
    category: "Religious / Jain temple",
    description: "Large Jain temple and dharamshala serving pilgrims near Kshatriya Kund Gram.",
    overview: "The Jain temple and dharamshala at Lachhuar serve pilgrims and are described by Bihar Tourism as the gateway to Kshatriya Kund Gram.",
    historicalBackground: "Bihar Tourism states that the temple and dharamshala were built in 1874 and describes a 65-room pilgrims' rest house. The same page reports a claim that the black-stone Mahavira idol is more than 2,600 years old; the source does not provide dating evidence, so that age is presented only as a source-attributed claim.",
    significance: "A Jain place of worship and pilgrim rest house dedicated to Lord Mahavira and other Tirthankaras. Its role as a gateway to Kshatriya Kund is noted by Bihar Tourism.",
    location: "Lachuar, Jamui, Bihar 811307. Bihar Tourism places it in Sikandra block, approximately 20 km west of Jamui headquarters.",
    howToReach: "Bihar Tourism lists auto-rickshaws and local buses from Jamui town, and says the temple organizes regular treks to Kund.",
    timings: "5:00 AM–9:00 PM (Bihar Tourism). Confirm locally before travel.",
    entryFee: "Free (Bihar Tourism). Confirm locally before travel.",
    historySources: [
      { label: "Bihar Tourism — Lachhuar Jain Temple", url: "https://tourism.bihar.gov.in/en/destinations/jamui/jain-temple-lachuar" },
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/lachhuar.png",
    lat: 24.9145,
    lng: 86.0144,
    featured: true,
  },
  {
    id: "kali-mandir-malaypur",
    name: "Kali Mandir, Malaypur",
    district: "Jamui",
    category: "Religious / Temple",
    description: "Temple of Goddess Kali in Malaypur, near Jamui Railway Station; the District Administration notes an annual Kali Mela.",
    overview: "The District Administration identifies this as a temple of Goddess Kali in Malaypur, near Jamui Railway Station.",
    historicalBackground: "The official sources reviewed do not give a construction date or historical chronology. The District Administration records an annual Kali Mela; this is a continuing local religious tradition.",
    significance: "A Hindu place of worship dedicated to Goddess Kali and the venue of the locally noted annual Kali Mela.",
    location: "Malaypur village, Barhat block, near Jamui Railway Station, Jamui district.",
    howToReach: "The District Administration says the temple is beside Jamui Railway Station. No separate route, hours, or entry fee were published in the sources reviewed.",
    historySources: [
      { label: "Jamui District Administration — Kali Mandir Malaypur", url: "https://jamui.nic.in/tourist-place/kali-mandir/" },
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/kali_mandir.png",
    lat: 24.9265,
    lng: 86.2241,
  },
  {
    id: "minto-tower-gidhaur",
    name: "Minto Tower (Gidhaur)",
    district: "Jamui",
    category: "Historical / Monument",
    description: "A Gidhaur market landmark; official district accounts date construction to 1909 but conflict with Evigo's existing account of the commemorated viceroy.",
    overview: "Minto Tower is a landmark in Gidhaur Market on the Jamui–Jhajha state highway, according to the Jamui District Administration.",
    historicalBackground: "The District Administration states the tower was built by the Maharaja of Gidhaur in 1909. Its official pages say it commemorated a visit by Viceroy Lord Irwin, while the existing Evigo description names Lord Minto. Because these accounts conflict and the source's 1909/Viceroy attribution needs archival confirmation, the visitor/dedication is not presented here as settled fact.",
    significance: "A Gidhaur town landmark associated in the District Administration's account with the area's princely-era and colonial-period history.",
    location: "Gidhaur Market, on the main Jamui–Jhajha state highway, Jamui district.",
    howToReach: "The District Administration locates it in the middle of Gidhaur Market on the Jamui–Jhajha highway. Official sources reviewed do not publish visiting hours or an entry fee.",
    historySources: [
      { label: "Jamui District Administration — Minto Tower", url: "https://jamui.nic.in/tourist-place/khandagir-udayagiri-6/" },
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/minto_tower.png",
    lat: 24.8735,
    lng: 86.2296,
  },
  {
    id: "patneshwar-mandir",
    name: "Patneshwar Mandir",
    district: "Jamui",
    category: "Religious / Temple",
    description: "Hindu temple at Patneshwar Hill, noted for Shiva worship and seasonal fairs according to the District Administration.",
    overview: "The District Administration identifies this as a Shiva temple on Patneshwar Hill.",
    historicalBackground: "The official sources reviewed do not provide a construction date or historical chronology. The District Administration notes seasonal fairs; this is a continuing local religious tradition.",
    significance: "A Hindu place of worship dedicated to Lord Shiva and the venue of locally noted seasonal fairs.",
    location: "Patneshwar Hill, Jamui district. The existing Evigo map coordinates are retained.",
    howToReach: "The official district source reviewed does not publish a route or transport guidance. Use the existing map directions for navigation.",
    historySources: [
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/patneshwar.png",
    lat: 24.8434,
    lng: 86.1686,
  },
  {
    id: "giddheshwar-temple",
    name: "Giddheshwar Temple",
    district: "Jamui",
    category: "Religious / Temple",
    description: "Hindu temple dedicated to Lord Shiva; the District Administration notes scenic surroundings and seasonal fairs.",
    overview: "The District Administration identifies this as a Shiva temple and notes scenic surroundings.",
    historicalBackground: "The official sources reviewed do not give a construction date or historical chronology. The District Administration records seasonal fairs; this is a continuing local religious tradition.",
    significance: "A Hindu place of worship dedicated to Lord Shiva, set in scenic surroundings according to the District Administration.",
    location: "Giddheshwar Temple area, Jamui district. The existing Evigo map coordinates are retained.",
    howToReach: "The official district source reviewed does not publish a route or transport guidance. Use the existing map directions for navigation.",
    historySources: [
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/giddheshwar_actual.jpg",
    lat: 24.8954,
    lng: 86.2041,
  },
  {
    id: "nagi-dam-bhimbandh",
    name: "Nagi Dam / Bhimbandh Wildlife Sanctuary",
    district: "Jamui",
    category: "Nature / Wildlife",
    description: "The existing Evigo record combines Nagi Dam and Bhim Bandh; official district details reviewed cover Bhim Bandh's hot-water springs, not Nagi Dam history.",
    overview: "This existing Evigo record combines Nagi Dam and Bhim Bandh. The District Administration source reviewed describes Bhim Bandh's hot-water springs and winter picnic use, but does not document Nagi Dam or establish that the two are one site.",
    historicalBackground: "No historical chronology for Nagi Dam or Bhim Bandh was supplied by the official sources reviewed. The District Administration describes Bhim Bandh as a winter picnic spot; no origin date or associated event is stated.",
    significance: "The Jamui District Administration notes hot-water springs at Bhim Bandh. The current Evigo record also names Nagi Dam, but historical or ecological claims specific to Nagi Dam require a source not located in this review.",
    location: "The District Administration places Bhim Bandh between the Lakshmipur and Haveli Kharagpur forest area. The existing Evigo map coordinates are retained for the Nagi Dam pin; the sources reviewed do not establish that these names identify one location.",
    howToReach: "The official district source reviewed does not publish a route or transport guidance. Confirm the intended destination locally before travelling because this existing record combines two place names.",
    historySources: [
      { label: "Jamui District Administration — Places of Interest (Bhim Bandh)", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/nagi_dam.png",
    lat: 24.8175,
    lng: 86.4000,
  },
];