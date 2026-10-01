export type ComboPackCategory =
  | "Travel + Stay"
  | "Trip Combo"
  | "Event Combo"
  | "Airport/Railway + Stay"
  | "Tourism Package"
  | "Custom Combo";

export const COMBO_CATEGORIES: ComboPackCategory[] = [
  "Travel + Stay",
  "Trip Combo",
  "Event Combo",
  "Airport/Railway + Stay",
  "Tourism Package",
  "Custom Combo",
];

export const COMBO_CATEGORY_METADATA: Record<
  ComboPackCategory,
  { label: string; icon: string; description: string; gradient: string }
> = {
  "Travel + Stay": {
    label: "Travel + Stay",
    icon: "🏨",
    description: "Seamless door-to-door cab transport combined with premium hotel accommodation.",
    gradient: "from-cyan-500 to-blue-600",
  },
  "Trip Combo": {
    label: "Trip Combo",
    icon: "🗺️",
    description: "Multi-day sightseeing journeys with transport, stay, and curated itineraries.",
    gradient: "from-emerald-500 to-teal-600",
  },
  "Event Combo": {
    label: "Event Combo",
    icon: "🎉",
    description: "All-in-one celebration bundles with banquet venue, catering, photography & music.",
    gradient: "from-violet-500 to-purple-600",
  },
  "Airport/Railway + Stay": {
    label: "Airport/Railway + Stay",
    icon: "✈️",
    description: "Priority station/airport pickup & drop bundled with verified local hotel rooms.",
    gradient: "from-amber-500 to-orange-600",
  },
  "Tourism Package": {
    label: "Tourism Package",
    icon: "🧭",
    description: "Guided trails exploring Bihar's heritage landmarks, hill stations & pilgrimage circuits.",
    gradient: "from-rose-500 to-pink-600",
  },
  "Custom Combo": {
    label: "Custom Combo",
    icon: "✨",
    description: "Flexible, personalized service combinations crafted to your exact group needs.",
    gradient: "from-indigo-500 to-cyan-500",
  },
};

export interface ComboPackItem {
  id: string;
  combo_pack_id: string;
  service_type: string;
  service_id?: string | null;
  provider_id?: string | null;
  quantity: number;
  is_required: boolean;
  created_at?: string;
  provider_name?: string;
  service_name?: string;
}

export interface ComboPack {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ComboPackCategory;
  image_url: string;
  base_price: number;
  discount: number;
  final_price: number;
  city: string;
  duration: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  items?: ComboPackItem[];
}

export type ComboBookingStatus =
  | "pending"
  | "partially_confirmed"
  | "confirmed"
  | "rejected"
  | "action_required"
  | "completed"
  | "cancelled";

export type ComboBookingItemStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";

export interface ComboBookingItem {
  id: string;
  combo_booking_id: string;
  service_type: string;
  service_id?: string | null;
  provider_id?: string | null;
  provider_name?: string | null;
  provider_booking_status: ComboBookingItemStatus;
  service_status: "pending" | "in_progress" | "completed" | "cancelled";
  price_snapshot: number;
  rejection_reason?: string | null;
  provider_response_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ComboBooking {
  id: string;
  user_id?: string | null;
  combo_pack_id?: string | null;
  combo_name?: string | null;
  total_amount: number;
  booking_date: string;
  start_date?: string | null;
  end_date?: string | null;
  guest_count: number;
  pickup_location?: string | null;
  drop_location?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  special_requests?: string | null;
  status: ComboBookingStatus;
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
  completed_at?: string | null;
  items?: ComboBookingItem[];
  combo_pack?: ComboPack | null;
}

/**
 * Single consistent State Machine for overall Combo Booking Status.
 * Calculates parent status based on child items and required flags.
 */
export function calculateOverallComboStatus(
  items: Array<{
    provider_booking_status?: string | null;
    service_status?: string | null;
    is_required?: boolean;
  }>,
  currentParentStatus?: string | null
): ComboBookingStatus {
  if (currentParentStatus === "cancelled") {
    return "cancelled";
  }

  if (!items || items.length === 0) {
    return "pending";
  }

  const statuses = items.map((it) => (it.provider_booking_status || "pending").toLowerCase());

  // If ALL items are completed
  const allCompleted = statuses.every((s) => s === "completed");
  if (allCompleted) return "completed";

  // If ANY required item is rejected
  const hasRejected = items.some(
    (it) => (it.provider_booking_status || "").toLowerCase() === "rejected" && (it.is_required !== false)
  );
  if (hasRejected) {
    // If all are rejected
    if (statuses.every((s) => s === "rejected")) return "rejected";
    return "action_required";
  }

  // If ALL items are confirmed or completed
  const allConfirmed = statuses.every((s) => s === "confirmed" || s === "completed");
  if (allConfirmed) return "confirmed";

  // If SOME items are confirmed and some pending
  const hasConfirmed = statuses.some((s) => s === "confirmed");
  const hasPending = statuses.some((s) => s === "pending");
  if (hasConfirmed && hasPending) return "partially_confirmed";

  // If ALL are pending
  if (statuses.every((s) => s === "pending")) return "pending";

  return (currentParentStatus as ComboBookingStatus) || "pending";
}

/**
 * Server-side price calculation with discount enforcement
 */
export function calculateComboPrice(
  basePrice: number,
  discount: number,
  guestCount: number = 1
): { basePrice: number; discount: number; finalPrice: number } {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const finalPrice = Math.max(0, safeBase - safeDiscount);

  return {
    basePrice: safeBase,
    discount: safeDiscount,
    finalPrice,
  };
}

/**
 * Default fallback Combo Packs - currently empty as deals require verified partner agreements.
 * When admins create and activate packages in the database, they will appear dynamically.
 */
export const DEFAULT_COMBO_PACKS: ComboPack[] = [];

