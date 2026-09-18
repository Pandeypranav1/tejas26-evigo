import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Provider } from "@/models/Provider";

const MONGODB_AVAILABLE = !!process.env.MONGODB_URI;

/** GET /api/providers — returns providers, MongoDB if configured else 404 hint */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const city     = searchParams.get("city");
  const limit    = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

  if (!MONGODB_AVAILABLE) {
    return NextResponse.json(
      { ok: false, message: "MONGODB_URI not configured. App is running in localStorage demo mode." },
      { status: 503 }
    );
  }

  try {
    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { isActive: true };
    if (category && category !== "All") query.category = category;
    if (city) query.city = { $regex: city, $options: "i" };

    const providers = await Provider.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ ok: true, data: providers });
  } catch (err) {
    console.error("[GET /api/providers]", err);
    return NextResponse.json({ ok: false, message: "Database error" }, { status: 500 });
  }
}

/** POST /api/providers — register a new provider */
export async function POST(req: NextRequest) {
  if (!MONGODB_AVAILABLE) {
    return NextResponse.json(
      { ok: false, message: "MONGODB_URI not configured. Use the demo localStorage flow instead." },
      { status: 503 }
    );
  }

  try {
    await connectDB();
    const body = await req.json();

    const {
      ownerUid, businessName, ownerName, category,
      startingPrice, city, phone, experienceYears, description, imageUrl,
    } = body;

    if (!ownerUid || !businessName || !ownerName || !category || !startingPrice || !city) {
      return NextResponse.json({ ok: false, message: "Missing required fields" }, { status: 400 });
    }

    const provider = await Provider.create({
      ownerUid, businessName, ownerName, category,
      startingPrice: Number(startingPrice), city, phone,
      experienceYears: Number(experienceYears ?? 0),
      description: description ?? "",
      imageUrl: imageUrl ?? "",
      isActive: true,
    });

    return NextResponse.json({ ok: true, data: provider }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/providers]", err);
    return NextResponse.json({ ok: false, message: "Database error" }, { status: 500 });
  }
}
