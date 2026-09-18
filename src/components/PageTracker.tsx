"use client";

/**
 * PageTracker — auto-records every page visit to the Supabase backend.
 * Drop this component once in the root layout inside <AuthProvider>.
 * It fires silently (no UI output) and never blocks rendering.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Generate or retrieve a stable session ID stored in sessionStorage. */
function getSessionId(): string {
  try {
    const key = "evigo_sid";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid =
        crypto.randomUUID?.() ??
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

/** Detect device type from navigator.userAgent. */
function detectDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet";
  if (
    /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/.test(
      ua
    )
  )
    return "mobile";
  return "desktop";
}

// ── Component ──────────────────────────────────────────────────────────────

export function PageTracker() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Track when the user entered the current page
  const entryTime = useRef<number>(Date.now());

  useEffect(() => {
    // Reset timer on path change
    entryTime.current = Date.now();

    const session_id = getSessionId();
    const device_type = detectDevice();
    const referrer =
      typeof document !== "undefined" ? document.referrer || null : null;
    const page_title =
      typeof document !== "undefined" ? document.title || null : null;

    // Fire-and-forget — we don't await to avoid blocking navigation
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id,
        page_path: pathname,
        page_title,
        referrer,
        device_type,
        user_phone: user?.phone ?? null,
      }),
    }).catch((err) =>
      // Silently swallow errors — analytics should never break the app
      console.warn("[PageTracker] Could not record visit:", err)
    );
  }, [pathname, user?.phone]);

  // This component renders nothing
  return null;
}
