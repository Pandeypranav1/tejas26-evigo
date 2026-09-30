import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/middleware";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/provider/dashboard/:path*",
    "/api/bookings",
    "/api/notifications",
    "/api/transport/:path*",
  ],
};