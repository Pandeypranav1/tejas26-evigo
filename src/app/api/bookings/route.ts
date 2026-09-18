import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";

export async function POST(request: Request) {
    try {
        // Get booking data from request
        const body = await request.json();

        const {
            client_id,
            provider_id,
            service_type,
            provider_name,
            event_date,
            event_time,
            guest_count,
            customer_name,
            customer_phone,
            customer_email,
            city,
            message,
        } = body;

        // Check required fields
        if (
            !customer_name ||
            !customer_phone ||
            !service_type ||
            !event_date
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Required booking details are missing.",
                },
                { status: 400 }
            );
        }

        // Create Supabase server client
        const supabase = await createClient();

        // Save booking in Supabase
        const { error } = await supabase
            .from("bookings")
            .insert({
                client_id: client_id || null,
                provider_id: provider_id || null,
                service_type,
                provider_name: provider_name || null,
                event_date,
                event_time: event_time || null,
                guest_count: guest_count || null,
                customer_name,
                customer_phone,
                customer_email: customer_email || null,
                city: city || null,
                message: message || null,
                status: "pending",
            });

        // Database error
        if (error) {
            console.error("Booking insert error:", error);

            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                },
                { status: 500 }
            );
        }

        // Booking successfully saved
        return NextResponse.json(
            {
                success: true,
                message: "Booking created successfully.",
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Booking API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Something went wrong while creating the booking.",
            },
            { status: 500 }
        );
    }
}