"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { isAllowedAdminEmail } from "@/lib/admin";

type ProviderStatusFilter = "all" | "pending" | "approved" | "rejected";

type ProviderRecord = {
    id: string;
    business_name?: string | null;
    owner_name?: string | null;
    category?: string | null;
    city?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    starting_price?: number | null;
    experience_years?: number | null;
    registration_status?: string | null;
    is_verified?: boolean | null;
    description?: string | null;
    price_range?: string | null;
    image_url?: string | null;
    rating?: number | null;
    submitted_at?: string | null;
    admin_note?: string | null;
    created_at?: string | null;
};

const filterOptions: Array<{ value: ProviderStatusFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
];

export default function AdminProviderReviewPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [providers, setProviders] = useState<ProviderRecord[]>([]);
    const [statusFilter, setStatusFilter] = useState<ProviderStatusFilter>("all");
    const [selectedProvider, setSelectedProvider] = useState<ProviderRecord | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

    const isAdmin = !!user?.email && isAllowedAdminEmail(user.email);

    const loadProviders = useCallback(async () => {
        if (!user?.email || !isAllowedAdminEmail(user.email)) return;

        try {
            setLoadingProviders(true);
            setError(null);

            const response = await fetch(`/api/admin/providers?status=${statusFilter}`, {
                headers: {
                    "x-user-email": user.email,
                    "x-user-role": user.role ?? "provider",
                },
            });

            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "Unable to load provider applications.");
            }

            setProviders(payload.providers ?? []);
            if (payload.summary) {
                setSummary(payload.summary);
            }
        } catch (err: any) {
            setError(err.message || "Unable to load provider applications.");
        } finally {
            setLoadingProviders(false);
        }
    }, [statusFilter, user]);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace("/login/provider");
            return;
        }

        if (!isAdmin) {
            router.replace("/");
            return;
        }

        void loadProviders();
    }, [loading, user, isAdmin, router, loadProviders]);

    const displayedSummary = useMemo(() => {
        const total = providers.length;
        const pending = providers.filter((provider) => provider.registration_status === "pending").length;
        const approved = providers.filter((provider) => provider.registration_status === "approved").length;
        const rejected = providers.filter((provider) => provider.registration_status === "rejected").length;

        return { total, pending, approved, rejected };
    }, [providers]);

    const handleStatusAction = async (provider: ProviderRecord, action: "approve" | "reject") => {
        if (!user?.email) return;

        if (action === "reject") {
            const reason = window.prompt("Enter rejection reason:", "Please update your business profile and resubmit.");
            if (!reason || !reason.trim()) {
                return;
            }

            const response = await fetch("/api/admin/providers", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-email": user.email,
                    "x-user-role": user.role ?? "provider",
                },
                body: JSON.stringify({ id: provider.id, action: "reject", admin_note: reason.trim() }),
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                setError(payload.error || "Unable to reject application.");
                return;
            }

            setSelectedProvider(null);
            setUpdating(null);
            await loadProviders();
            return;
        }

        setUpdating(provider.id);
        setError(null);

        try {
            const response = await fetch("/api/admin/providers", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-email": user.email,
                    "x-user-role": user.role ?? "provider",
                },
                body: JSON.stringify({ id: provider.id, action: "approve" }),
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "Unable to approve application.");
            }

            setSelectedProvider(null);
            await loadProviders();
        } catch (err: any) {
            setError(err.message || "Unable to approve application.");
        } finally {
            setUpdating(null);
        }
    };

    if (loading || !user) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="text-sm font-bold uppercase tracking-[0.25em] text-zinc-500">Loading…</div>
            </main>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <main className="min-h-screen bg-zinc-50 py-10 text-zinc-900">
            <Container>
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-violet-700">
                            Admin Access
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-zinc-900">Provider Applications</h1>
                    </div>
                    <div className="text-sm font-semibold text-zinc-500">Signed in as {user.email}</div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    {[
                        { label: "Total", value: summary.total, accent: "violet" },
                        { label: "Pending", value: summary.pending, accent: "amber" },
                        { label: "Approved", value: summary.approved, accent: "emerald" },
                        { label: "Rejected", value: summary.rejected, accent: "rose" },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{item.label}</div>
                            <div className="mt-3 text-3xl font-black text-zinc-900">{item.value}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                        {filterOptions.map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setStatusFilter(filter.value)}
                                className={`rounded-full px-4 py-2 text-sm font-bold transition ${statusFilter === filter.value
                                    ? "bg-zinc-900 text-white"
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}

                <div className="mt-6 grid gap-5">
                    {loadingProviders ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm font-semibold text-zinc-500">
                            Loading provider applications…
                        </div>
                    ) : providers.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm font-semibold text-zinc-500">
                            No provider applications match this filter.
                        </div>
                    ) : (
                        providers.map((provider) => (
                            <div key={provider.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                        <div className="text-xl font-black text-zinc-900">{provider.business_name || "Unnamed Business"}</div>
                                        <div className="text-sm font-medium text-zinc-600">Owner: {provider.owner_name || "N/A"}</div>
                                        <div className="flex flex-wrap gap-2 text-xs font-bold text-zinc-500">
                                            <span className="rounded-full bg-zinc-100 px-2.5 py-1">{provider.category || "N/A"}</span>
                                            <span className="rounded-full bg-zinc-100 px-2.5 py-1">{provider.city || "N/A"}</span>
                                            <span className="rounded-full bg-zinc-100 px-2.5 py-1">Status: {provider.registration_status || "pending"}</span>
                                            <span className="rounded-full bg-zinc-100 px-2.5 py-1">Verified: {provider.is_verified ? "Yes" : "No"}</span>
                                        </div>
                                        <div className="text-sm text-zinc-600">
                                            <div>Email: {provider.email || "N/A"}</div>
                                            <div>Phone: {provider.phone || "N/A"}</div>
                                            <div>Starting Price: {provider.starting_price != null ? `₹${Number(provider.starting_price).toLocaleString("en-IN")}` : "N/A"}</div>
                                            <div>Experience: {provider.experience_years != null ? `${provider.experience_years} years` : "N/A"}</div>
                                            <div>Submitted: {provider.submitted_at ? new Date(provider.submitted_at).toLocaleString() : "N/A"}</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                                        <button
                                            onClick={() => setSelectedProvider(provider)}
                                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-700"
                                        >
                                            View Details
                                        </button>

                                        {provider.registration_status === "pending" && (
                                            <>
                                                <Button
                                                    onClick={() => void handleStatusAction(provider, "approve")}
                                                    disabled={updating === provider.id}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                    {updating === provider.id ? "Processing…" : "Approve"}
                                                </Button>
                                                <Button
                                                    onClick={() => void handleStatusAction(provider, "reject")}
                                                    variant="secondary"
                                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                                >
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Container>

            {selectedProvider && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Provider Application</div>
                                <h2 className="mt-2 text-2xl font-black text-zinc-900">{selectedProvider.business_name || "Provider Details"}</h2>
                            </div>
                            <button onClick={() => setSelectedProvider(null)} className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-bold text-zinc-600">
                                Close
                            </button>
                        </div>

                        {selectedProvider.image_url && (
                            <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                                <img src={selectedProvider.image_url} alt={selectedProvider.business_name || "Provider profile"} className="h-64 w-full object-cover" />
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Business Name</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">{selectedProvider.business_name || "N/A"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Owner Name</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">{selectedProvider.owner_name || "N/A"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Category</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">{selectedProvider.category || "N/A"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">City</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">{selectedProvider.city || "N/A"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Email</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">{selectedProvider.email || "N/A"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Phone</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">{selectedProvider.phone || "N/A"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Starting Price</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">
                                    {selectedProvider.starting_price != null ? `₹${Number(selectedProvider.starting_price).toLocaleString("en-IN")}` : "N/A"}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Experience</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">
                                    {selectedProvider.experience_years != null ? `${selectedProvider.experience_years} years` : "N/A"}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Registration Status</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">{selectedProvider.registration_status || "pending"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Verification Status</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">{selectedProvider.is_verified ? "Verified" : "Not Verified"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4 md:col-span-2">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Submitted Date</div>
                                <div className="mt-2 text-lg font-black text-zinc-900">
                                    {selectedProvider.submitted_at ? new Date(selectedProvider.submitted_at).toLocaleString() : "N/A"}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4 md:col-span-2">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Description</div>
                                <div className="mt-2 text-sm leading-relaxed text-zinc-700">{selectedProvider.description || "N/A"}</div>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-4 md:col-span-2">
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Address</div>
                                <div className="mt-2 text-sm leading-relaxed text-zinc-700">{selectedProvider.address || "N/A"}</div>
                            </div>
                            {selectedProvider.admin_note && (
                                <div className="rounded-2xl bg-red-50 p-4 md:col-span-2">
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Rejection Reason</div>
                                    <div className="mt-2 text-sm leading-relaxed text-red-800">{selectedProvider.admin_note}</div>
                                </div>
                            )}
                        </div>

                        {selectedProvider.registration_status === "pending" && (
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Button onClick={() => void handleStatusAction(selectedProvider, "approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Approve
                                </Button>
                                <Button onClick={() => void handleStatusAction(selectedProvider, "reject")} variant="secondary" className="border-red-200 text-red-700 hover:bg-red-50">
                                    Reject
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
