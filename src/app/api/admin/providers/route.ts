import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { isAllowedAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

function getRequester(request: Request) {
    const { searchParams } = new URL(request.url);
    const email =
        request.headers.get("x-user-email") ??
        request.headers.get("x-admin-email") ??
        searchParams.get("user_email") ??
        "";
    const role =
        request.headers.get("x-user-role") ??
        request.headers.get("x-role") ??
        searchParams.get("user_role") ??
        "";

    return {
        email: email.trim().toLowerCase(),
        role: role.trim().toLowerCase(),
    };
}

function authorize(request: Request) {
    const { email, role } = getRequester(request);

    if (!email) {
        throw new Error("Unauthorized");
    }

    if (role === "client") {
        throw new Error("Forbidden");
    }

    if (!isAllowedAdminEmail(email)) {
        throw new Error("Forbidden");
    }
}

export async function GET(request: Request) {
    try {
        authorize(request);

        const { searchParams } = new URL(request.url);
        const status = (searchParams.get("status") ?? "all").toLowerCase();
        const allowed = new Set(["all", "pending", "approved", "rejected"]);

        if (!allowed.has(status)) {
            return NextResponse.json({ success: false, error: "Invalid status filter" }, { status: 400 });
        }

        const supabase = createAdminClient();
        const { data: allProviders, error } = await supabase
            .from("providers")
            .select("*")
            .order("submitted_at", { ascending: false });

        if (error) {
            console.error("[GET /api/admin/providers] query error:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const providers = allProviders ?? [];
        const summary = {
            total: providers.length,
            pending: providers.filter((provider) => provider.registration_status === "pending").length,
            approved: providers.filter((provider) => provider.registration_status === "approved").length,
            rejected: providers.filter((provider) => provider.registration_status === "rejected").length,
        };

        const filteredProviders =
            status === "all"
                ? providers
                : providers.filter((provider) => provider.registration_status === status);

        return NextResponse.json({ success: true, providers: filteredProviders, summary });
    } catch (err: any) {
        const message = err?.message === "Unauthorized" ? "Unauthorized" : "Forbidden";
        return NextResponse.json({ success: false, error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
}

export async function PATCH(request: Request) {
    try {
        authorize(request);

        const body = await request.json();
        const providerId = String(body.id ?? "").trim();
        const action = String(body.action ?? "").trim().toLowerCase();

        if (!providerId) {
            return NextResponse.json({ success: false, error: "Provider id is required." }, { status: 400 });
        }

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ success: false, error: "Action must be approve or reject." }, { status: 400 });
        }

        const supabase = createAdminClient();

        if (action === "approve") {
            const { data, error } = await supabase
                .from("providers")
                .update({ registration_status: "approved" })
                .eq("id", providerId)
                .select()
                .single();

            if (error) {
                console.error("[PATCH /api/admin/providers] approve error:", error);
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, provider: data, message: "Provider approved successfully." });
        }

        const reason = String(body.admin_note ?? body.reason ?? "").trim();
        if (!reason) {
            return NextResponse.json({ success: false, error: "Rejection reason is required." }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("providers")
            .update({ registration_status: "rejected", admin_note: reason })
            .eq("id", providerId)
            .select()
            .single();

        if (error) {
            console.error("[PATCH /api/admin/providers] reject error:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, provider: data, message: "Provider rejected successfully." });
    } catch (err: any) {
        const message = err?.message === "Unauthorized" ? "Unauthorized" : "Forbidden";
        return NextResponse.json({ success: false, error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    }
}
