export const SERVICE_CATEGORIES = [
  "Catering",
  "Photography",
  "DJ",
  "Mehendi & Makeup",
  "Restaurant",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const CATEGORY_TAGLINE: Record<ServiceCategory, string> = {
  Catering:          "Buffet, snacks, and full-service menus",
  Photography:       "Wedding shoots, candid moments, and reels",
  DJ:                "Party-ready sound, lights, and vibes",
  "Mehendi & Makeup":"Bridal mehendi and makeover artists",
  Restaurant:        "Verified hotels, banquets, and fine dining",
};

export const CATEGORY_IMAGE: Record<ServiceCategory, string> = {
  Catering:          "/catering_service_1777314249262.png",
  Photography:       "/photography_service_1777314265964.png",
  DJ:                "/dj_service_1777314281684.png",
  "Mehendi & Makeup":"/mehendi_service_1777314296728.png",
  Restaurant:        "/partners/events/genx_brij/genx_brij_1.png",
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
];

// ── Bihar City Centroids (for city-dropdown & manual search fallback) ──
// Used as the origin lat/lng when searching. No external geocoding API needed.
export const BIHAR_CITIES: { name: string; lat: number; lng: number; aliases?: string[] }[] = [
  { name: "Jamui",          lat: 24.9278, lng: 86.2265, aliases: ["jamui", "jamui bihar", "jamui town", "jamui station", "malaypur"] },
  { name: "Patna",          lat: 25.5941, lng: 85.1376, aliases: ["patna", "patna city", "pataliputra", "danapur"] },
  { name: "Gaya",           lat: 24.7955, lng: 85.0002, aliases: ["gaya", "gaya ji", "bodh gaya", "bodhgaya"] },
  { name: "Muzaffarpur",    lat: 26.1197, lng: 85.3910, aliases: ["muzaffarpur", "muz"] },
  { name: "Bhagalpur",      lat: 25.2425, lng: 86.9842, aliases: ["bhagalpur", "silk city"] },
  { name: "Rajgir",         lat: 25.0303, lng: 85.4182, aliases: ["rajgir", "rajgriha"] },
  { name: "Nalanda",        lat: 25.1359, lng: 85.4442, aliases: ["nalanda", "bihar sharif"] },
  { name: "Vaishali",       lat: 25.6870, lng: 85.1290, aliases: ["vaishali", "hajipur"] },
  { name: "Bodh Gaya",      lat: 24.6961, lng: 84.9911, aliases: ["bodhgaya", "bodh gaya"] },
  { name: "Munger",         lat: 25.3743, lng: 86.4730, aliases: ["munger", "monghyr", "jamalpur"] },
  { name: "Begusarai",      lat: 25.4182, lng: 86.1272, aliases: ["begusarai", "barauni"] },
  { name: "Darbhanga",      lat: 26.1542, lng: 85.8918, aliases: ["darbhanga", "mithila"] },
  { name: "Sitamarhi",      lat: 26.5936, lng: 85.4899, aliases: ["sitamarhi"] },
  { name: "Motihari",       lat: 26.6503, lng: 84.9183, aliases: ["motihari", "east champaran"] },
  { name: "Samastipur",     lat: 25.8614, lng: 85.7795, aliases: ["samastipur"] },
  { name: "Purnia",         lat: 25.7771, lng: 87.4753, aliases: ["purnia", "purnea"] },
  { name: "Katihar",        lat: 25.5541, lng: 87.5683, aliases: ["katihar"] },
  { name: "Saharsa",        lat: 25.8835, lng: 86.6006, aliases: ["saharsa"] },
  { name: "Deoghar",        lat: 24.4826, lng: 86.6974, aliases: ["deoghar", "baba dham"] },
  { name: "Simultala",      lat: 24.7115, lng: 86.5415, aliases: ["simultala", "simultala hill station"] },
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
];

// ── Tourism Places ────────────────────────────────────────────
export interface TourismPlace {
  id: string;
  name: string;
  district: string;
  category: string;
  description: string;
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

export const TOURISM_PLACES: TourismPlace[] = [
  {
    id: "simultala-hill-station",
    name: "Simultala Hill Station",
    district: "Jamui",
    category: "Nature / Hill station",
    description: "Scenic hill station known for pleasant climate, greenery, and as a meditation site (Tapobhumi) linked to Sri Ramakrishna Paramahamsa",
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
    description: "Traditionally regarded as the birthplace of Lord Mahavira — major Jain pilgrimage site nestled in lush green valley",
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
    description: "Large Jain temple and dharamshala, key pilgrim stop near Kshatriya Kund Gram offering peaceful spiritual retreats",
    image: "/tourism/jamui/lachhuar.png",
    // Verified: Wikipedia coords — 24° 54′ 52.34″ N, 86° 0′ 52″ E
    lat: 24.9145,
    lng: 86.0144,
    featured: true,
  },
  {
    id: "kali-mandir-malaypur",
    name: "Kali Mandir, Malaypur",
    district: "Jamui",
    category: "Religious / Temple",
    description: "Temple of Goddess Kali near Jamui Railway Station, known for its grand annual festival and spiritual devotion",
    image: "/tourism/jamui/kali_mandir.png",
    // Verified: Malaypur area near Jamui town; will use name search fallback for accuracy
    lat: 24.9265,
    lng: 86.2241,
  },
  {
    id: "minto-tower-gidhaur",
    name: "Minto Tower (Gidhaur)",
    district: "Jamui",
    category: "Historical / Monument",
    description: "Colonial-era tower built by the Maharaja of Gidhaur in 1909 to commemorate Lord Minto's visit, marking the centre of Gidhaur town",
    image: "/tourism/jamui/minto_tower.png",
    // Verified: Gidhaur (Patsanda) town centre — Wikipedia: 24°51′29″N 86°18′01″E
    lat: 24.8581,
    lng: 86.3003,
    featured: true,
  },
  {
    id: "giddheshwar-mandir",
    name: "Giddheshwar/Gidheshwar Mandir",
    district: "Jamui",
    category: "Religious / Shiva temple",
    description: "Ancient Shiva temple in Gidhaur situated amidst picturesque rocky hills, near Minto Tower",
    image: "/tourism/jamui/giddheshwar.png",
    // Verified: Kasbagidhaur/Harni area, Gidhaur — Plus Code R58H+2RM area
    lat: 24.8579,
    lng: 86.3004,
  },
  {
    id: "patneshwar-mandir",
    name: "Patneshwar Mandir",
    district: "Jamui",
    category: "Religious / Temple",
    description: "Medieval-era Shiva temple known for its ancient stone architecture and religious reverence, situated atop Patneshwar Hill near the Kiul River",
    image: "/tourism/jamui/patneshwar.png",
    // Verified: Mallehpur (Malaypur), Jamui — temple on hill near Kiul River
    lat: 24.9208,
    lng: 86.1754,
  },
  {
    id: "nagi-dam-bhimbandh",
    name: "Nagi Dam / Bhimbandh Wildlife Sanctuary",
    district: "Jamui",
    category: "Nature / Wildlife",
    description: "Renowned bird sanctuary and reservoir area surrounded by dense forests, popular for birdwatching and eco-tourism",
    image: "/tourism/jamui/nagi_dam.png",
    // Verified: Nagi Dam Bird Sanctuary — Wikipedia: 24°49′03″N 86°24′00″E
    lat: 24.8175,
    lng: 86.4000,
    featured: true,
  },
];

