"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { saveDemoProvider } from "@/lib/demoStore";

function isProbablyUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function PartnerPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("Catering");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login/provider");
      return;
    }
    if (role !== "provider") {
      router.replace("/login/provider");
    }
  }, [loading, role, router, user]);

  // Pre-fill phone from logged-in user
  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user]);

  const submit = () => {
    setError(null);
    setSuccess(false);

    if (!user || role !== "provider") {
      router.push("/login/provider");
      return;
    }

    if (!ownerName || !businessName || !phone || !city || !startingPrice || !description) {
      setError("Please fill all required fields.");
      return;
    }

    if (imageUrl && !isProbablyUrl(imageUrl)) {
      setError("Image URL must start with https://");
      return;
    }

    const price = Number(startingPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Starting price must be a valid positive number.");
      return;
    }

    const exp = experienceYears ? Number(experienceYears) : 0;

    setSubmitting(true);

    // Use category default image if none provided
    const finalImageUrl = imageUrl || "";

    setTimeout(() => {
      saveDemoProvider({
        ownerUid: user.id,
        ownerName,
        businessName,
        category,
        phone,
        city,
        startingPrice: price,
        experienceYears: exp,
        description,
        imageUrl: finalImageUrl,
      });
      setSuccess(true);
      setSubmitting(false);
      // Redirect to provider dashboard after short delay
      setTimeout(() => router.push("/provider/dashboard"), 1200);
    }, 800);
  };

  const inputCls =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
  const labelCls = "text-xs font-bold text-zinc-500 uppercase tracking-wide";

  return (
    <main className="flex-1 py-12">
      <Container>
        <div className="grid gap-10 md:grid-cols-2">
          {/* Left info column */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 mb-4">
              🎪 Partner Registration
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">
              List Your Service on Evigo
            </h1>
            <p className="mt-3 text-sm font-semibold text-zinc-500 leading-relaxed">
              Register your service and start receiving bookings instantly. Your listing goes
              live immediately after submission.
            </p>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-black text-zinc-800">✅ Allowed services</div>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {SERVICE_CATEGORIES.map((c) => (
                  <li
                    key={c}
                    className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-800 transition"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Auth check */}
            {!loading && (!user || role !== "provider") && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                ⚠️ Please{" "}
                <Link href="/login/provider" className="underline font-black">
                  login as a provider
                </Link>{" "}
                to submit this form.
              </div>
            )}

            {/* Tips */}
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-xs font-black text-blue-800 mb-2">💡 Tips for best results</div>
              <ul className="space-y-1 text-xs font-semibold text-blue-700">
                <li>• Use a clear, real photo of your work</li>
                <li>• Write a detailed description (team size, experience, etc.)</li>
                <li>• Set a competitive starting price</li>
              </ul>
            </div>
          </div>

          {/* Right form column */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-base font-black text-zinc-900 mb-5">
              Partner Registration Form
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <div className={labelCls}>Your Name *</div>
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Priya Sharma"
                  />
                </label>
                <label className="space-y-1.5">
                  <div className={labelCls}>Business Name *</div>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Royal Caterers"
                  />
                </label>
              </div>

              <label className="space-y-1.5">
                <div className={labelCls}>Service Category *</div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className={inputCls}
                >
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <div className={labelCls}>Phone *</div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="+91 98765 43210"
                  />
                </label>
                <label className="space-y-1.5">
                  <div className={labelCls}>City / Location *</div>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Patna, Bihar"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <div className={labelCls}>Starting Price (₹) *</div>
                  <input
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    className={inputCls}
                    placeholder="5000"
                    inputMode="numeric"
                  />
                </label>
                <label className="space-y-1.5">
                  <div className={labelCls}>Experience (years)</div>
                  <input
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className={inputCls}
                    placeholder="3"
                    inputMode="numeric"
                  />
                </label>
              </div>

              <label className="space-y-1.5">
                <div className={labelCls}>Image URL (optional)</div>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className={inputCls}
                  placeholder="https://your-photo-link.com/image.jpg"
                />
              </label>

              <label className="space-y-1.5">
                <div className={labelCls}>Description *</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder="Tell clients what you offer, team size, specialties, etc."
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  ✅ Listing submitted! Redirecting to your dashboard…
                </div>
              )}

              <Button onClick={submit} disabled={submitting || success} className="w-full mt-2">
                {submitting ? "Submitting…" : success ? "Success! ✓" : "Submit Listing →"}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
