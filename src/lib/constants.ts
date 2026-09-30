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

export const TOURISM_DISTRICTS = [
  { id: "Jamui", name: "Jamui", available: true, count: 8, tagline: "Hills, Jain Pilgrimage & Ancient Heritage" },
  { id: "Patna", name: "Patna", available: false, count: 0, tagline: "Ancient Pataliputra & Ganges Ghats" },
  { id: "Gaya", name: "Gaya & Bodh Gaya", available: false, count: 0, tagline: "Mahabodhi Temple & Spiritual Trails" },
  { id: "Rajgir", name: "Nalanda & Rajgir", available: false, count: 0, tagline: "Ancient University & Hot Springs" },
  { id: "Vaishali", name: "Vaishali", available: false, count: 0, tagline: "Ashokan Pillar & Buddhist Stupa" },
  { id: "Bhagalpur", name: "Bhagalpur", available: false, count: 0, tagline: "Silk City & Dolphin Sanctuary" },
  { id: "Munger", name: "Munger", available: false, count: 0, tagline: "Historic Fort & Yoga Capital" },
  { id: "Darbhanga", name: "Darbhanga", available: false, count: 0, tagline: "Royal Palaces & Mithila Culture" },
] as const;

export const BIHAR_DESTINATIONS = [
  { name: "Patna", tag: "Ganges Ghats", img: "/patna_ganges.png", district: "Patna" },
  { name: "Gaya", tag: "Buddhist Circuit", img: "/gaya_buddhist.png", district: "Gaya" },
  { name: "Rajgir", tag: "Hot Springs & Hills", img: "/rajgir_hills.png", district: "Rajgir" },
  { name: "Vaishali", tag: "Ancient Ruins", img: "/vaishali_ruins.png", district: "Vaishali" },
  { name: "Jamui", tag: "Wildlife & Nature", img: "/jamui_nature.png", district: "Jamui" },
] as const;

export const TOURISM_PLACES: TourismPlace[] = [
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
    lat: 24.8581,
    lng: 86.3003,
    featured: true,
  },
  {
    id: "giddheshwar-mandir",
    name: "Giddheshwar/Gidheshwar Mandir",
    district: "Jamui",
    category: "Religious / Shiva temple",
    description: "A Shiva temple on rocky boulders, about 15 km south of Jamui headquarters according to the District Administration.",
    overview: "The District Administration describes Giddheswar as a temple of Lord Shiva on top of stone boulders.",
    historicalBackground: "The official source reviewed does not provide a founding date, historical chronology, or associated documented event. No legend is presented as historical fact.",
    significance: "A Hindu Shaiva place of worship, located on a rocky outcrop according to the District Administration.",
    location: "About 15 km south of Jamui district headquarters, as listed by the District Administration.",
    howToReach: "The District Administration gives the approximate distance from headquarters but no transport instructions. Use the existing map directions for navigation; official hours and entry fee were not found.",
    historySources: [
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/giddheshwar.png",
    lat: 24.8579,
    lng: 86.3004,
  },
  {
    id: "patneshwar-mandir",
    name: "Patneshwar Mandir",
    district: "Jamui",
    category: "Religious / Temple",
    description: "A Shiva temple on Station Road, about 5 km north of Jamui headquarters according to the District Administration.",
    overview: "The District Administration lists Patneswar Mandir as a temple of Lord Shiva on Station Road, Jamui.",
    historicalBackground: "The official source reviewed provides no construction date, medieval-period attribution, architectural dating, or historical event. Evigo's previous description included those claims, but they are not corroborated by the official source reviewed and are not repeated here as established facts.",
    significance: "A local Hindu place of worship dedicated to Lord Shiva, as described by the District Administration.",
    location: "On Station Road, about 5 km north of Jamui headquarters, according to the District Administration.",
    howToReach: "The District Administration gives the Station Road location and approximate distance. Official transport instructions, timings, and entry fee were not found.",
    historySources: [
      { label: "Jamui District Administration — Places of Interest", url: "https://jamui.nic.in/places-of-interest/" },
    ],
    image: "/tourism/jamui/patneshwar.png",
    lat: 24.9208,
    lng: 86.1754,
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
    featured: true,
  },
];