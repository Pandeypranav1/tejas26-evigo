import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { SERVICE_CATEGORIES } from "@/lib/constants";

export const runtime = "nodejs";

const ALLOWED_CATEGORIES = new Set(SERVICE_CATEGORIES);

function normalizeString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidIndianPhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 10 && digits.length !== 12) return false;
    if (digits.length === 12 && !digits.startsWith("91")) return false;
    return /^[6-9]/.test(digits.slice(-10));
}

function isValidUrl(value: string) {
    if (!value) return true;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const ownerName = normalizeString(body.owner_name || body.ownerName);
        const businessName = normalizeString(body.business_name || body.businessName);
        const email = normalizeString(body.email).toLowerCase();
        const category = normalizeString(body.category);
        const phone = normalizeString(body.phone);
        const city = normalizeString(body.city);
        const startingPrice = Number(body.starting_price ?? body.startingPrice);
        const experienceYears = Number(body.experience_years ?? body.experienceYears ?? 0);
        const imageUrl = normalizeString(body.image_url || body.imageUrl);
        const description = normalizeString(body.description);

        if (!ownerName) {
            return NextResponse.json({ success: false, error: "Owner name is required." }, { status: 400 });
        }
        if (!businessName) {
            return NextResponse.json({ success: false, error: "Business name is required." }, { status: 400 });
        }
        if (!email) {
            return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
        }
        if (!isValidEmail(email)) {
            return NextResponse.json({ success: false, error: "Please enter a valid email address." }, { status: 400 });
        }
        if (!category || !ALLOWED_CATEGORIES.has(category as (typeof SERVICE_CATEGORIES)[number])) {
            return NextResponse.json({ success: false, error: "Please select a valid service category." }, { status: 400 });
        }
        if (!phone) {
            return NextResponse.json({ success: false, error: "Phone number is required." }, { status: 400 });
        }
        if (!isValidIndianPhone(phone)) {
            return NextResponse.json({ success: false, error: "Please enter a valid Indian phone number." }, { status: 400 });
        }
        if (!city) {
            return NextResponse.json({ success: false, error: "City / location is required." }, { status: 400 });
        }
        if (!Number.isFinite(startingPrice) || startingPrice < 0) {
            return NextResponse.json({ success: false, error: "Starting price must be a non-negative number." }, { status: 400 });
        }
        if (!Number.isInteger(experienceYears) || experienceYears < 0) {
            return NextResponse.json({ success: false, error: "Experience years must be a non-negative integer." }, { status: 400 });
        }
        if (imageUrl && !isValidUrl(imageUrl)) {
            return NextResponse.json({ success: false, error: "Image URL must start with http:// or https://." }, { status: 400 });
        }
        if (!description) {
            return NextResponse.json({ success: false, error: "Description is required." }, { status: 400 });
        }

        const supabase = createAdminClient();

        const sanitizedPhone = phone.replace(/\s+/g, "");

        const [existingByEmail, existingByPhone] = await Promise.all([
            supabase
                .from("providers")
                .select("id, email")
                .eq("email", email)
                .limit(1),
            supabase
                .from("providers")
                .select("id, phone")
                .eq("phone", sanitizedPhone)
                .limit(1),
        ]);

        if (existingByEmail.error) {
            throw existingByEmail.error;
        }
        if (existingByPhone.error) {
            throw existingByPhone.error;
        }

        if ((existingByEmail.data?.length ?? 0) > 0) {
            return NextResponse.json(
                { success: false, error: "A provider registration already exists for this email." },
                { status: 409 }
            );
        }

        if ((existingByPhone.data?.length ?? 0) > 0) {
            return NextResponse.json(
                { success: false, error: "A provider registration already exists for this phone number." },
                { status: 409 }
            );
        }

        const payload: Record<string, any> = {
            owner_name: ownerName,
            business_name: businessName,
            email,
            category,
            phone: sanitizedPhone,
            city,
            address: city,
            description,
            price_range: startingPrice >= 0 ? `₹${startingPrice.toLocaleString("en-IN")}` : "₹0",
            starting_price: Number(startingPrice),
            experience_years: Number(experienceYears),
            image_url: imageUrl || null,
            is_verified: false,
            is_bookable: false,
            service_areas: [],
            registration_status: "pending",
            submitted_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from("providers")
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error("[POST /api/providers/register] insert error:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json(
            {
                success: true,
                message: "Registration submitted successfully.",
                provider: data,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("[POST /api/providers/register] unexpected error:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Something went wrong while submitting the provider registration." },
            { status: 500 }
        );
    }
}
