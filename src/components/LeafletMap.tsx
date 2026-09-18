"use client";

/**
 * LeafletMap — client-only Leaflet map component.
 *
 * IMPORTANT: This file must NEVER be imported directly at the top level
 * of a server component or page. Always import via next/dynamic with ssr:false:
 *
 *   const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });
 *
 * This is because Leaflet uses `window` and `document` at module load time,
 * which breaks Next.js SSR.
 */

import { useEffect, useRef } from "react";
import type { HotelPartner } from "@/lib/constants";

// Leaflet CSS must be imported inside the client bundle.
// Next.js handles this correctly when the component is dynamically imported.
import "leaflet/dist/leaflet.css";

interface Props {
  userLat: number;
  userLng: number;
  partners: (HotelPartner & { distanceKm: number })[];
  onMarkerClick: (partner: HotelPartner) => void;
}

export default function LeafletMap({ userLat, userLng, partners, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Dynamic import keeps Leaflet out of the server bundle entirely
    import("leaflet").then((L) => {
      // Fix default marker icon paths broken by webpack asset hashing
      // (standard fix documented at https://leafletjs.com/examples/quick-start/)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [userLat, userLng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      });

      leafletMapRef.current = map;

      // OpenStreetMap tiles — free, no API key, no billing
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // User location marker (cyan pulsing pin)
      const userIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            position:relative;width:20px;height:20px;
          ">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              background:rgba(6,182,212,0.25);
              animation:pulse-ring 1.6s cubic-bezier(0.215,0.61,0.355,1) infinite;
            "></div>
            <div style="
              position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
              width:10px;height:10px;border-radius:50%;
              background:#06b6d4;border:2px solid #fff;
              box-shadow:0 0 0 2px #06b6d4;
            "></div>
          </div>
          <style>
            @keyframes pulse-ring {
              0%   { transform: scale(0.8); opacity: 0.7; }
              70%  { transform: scale(2);   opacity: 0; }
              100% { transform: scale(2.4); opacity: 0; }
            }
          </style>
        `,
        iconSize:   [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
        .bindPopup("<b>📍 Your location</b>")
        .openPopup();

      // Partner hotel markers (violet pins)
      partners.forEach((partner) => {
        const partnerIcon = L.divIcon({
          className: "",
          html: `
            <div style="
              background:linear-gradient(135deg,#8b5cf6,#06b6d4);
              color:#fff;font-size:14px;
              width:32px;height:32px;border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              display:flex;align-items:center;justify-content:center;
              border:2px solid rgba(255,255,255,0.8);
              box-shadow:0 4px 12px rgba(139,92,246,0.5);
              cursor:pointer;
            ">
              <span style="transform:rotate(45deg)">🏨</span>
            </div>
          `,
          iconSize:   [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        });

        const marker = L.marker([partner.lat, partner.lng], { icon: partnerIcon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width:160px;font-family:system-ui,sans-serif;">
            <div style="font-weight:800;font-size:13px;margin-bottom:2px;">${partner.name}</div>
            <div style="font-size:11px;color:#666;margin-bottom:4px;">${partner.address}</div>
            <div style="font-size:11px;font-weight:700;color:#8b5cf6;">${partner.distanceKm.toFixed(1)} km away</div>
            ${partner.priceRange ? `<div style="font-size:11px;color:#444;margin-top:2px;">${partner.priceRange}</div>` : ""}
          </div>
        `);
        marker.on("click", () => onMarkerClick(partner));
      });

      // Fit map to show all pins (user + partners)
      if (partners.length > 0) {
        const allPoints: [number, number][] = [
          [userLat, userLng],
          ...partners.map((p) => [p.lat, p.lng] as [number, number]),
        ];
        map.fitBounds(L.latLngBounds(allPoints), { padding: [32, 32] });
      }
    });

    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "100%", minHeight: 300 }}
      aria-label="Map showing nearby Evigo partner hotels"
    />
  );
}
