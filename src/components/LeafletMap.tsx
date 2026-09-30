"use client";

import { useEffect, useRef } from "react";
import type { HotelPartner } from "@/lib/constants";
import "leaflet/dist/leaflet.css";

interface Props {
  userLat: number;
  userLng: number;
  partners?: (HotelPartner & { distanceKm: number })[];
  onTilesLoaded?: () => void;
  originLabel?: string;
  destination?: { lat: number; lng: number; label: string };
  routeCoordinates?: [number, number][];
  alternativeRoutes?: { id: string; coordinates: [number, number][] }[];
  selectedRouteIndex?: number;
  searchMarker?: { lat: number; lng: number; label: string } | null;
  onMarkerClick?: (partner: HotelPartner) => void;
}

export default function LeafletMap({
  userLat,
  userLng,
  partners = [],
  onTilesLoaded,
  originLabel,
  destination,
  routeCoordinates,
  alternativeRoutes = [],
  selectedRouteIndex = 0,
  searchMarker,
  onMarkerClick,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    let cancelled = false;
    let resizeFrame: number | null = null;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || leafletMapRef.current) return;

      // Fix default Leaflet icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [userLat, userLng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      });

      leafletMapRef.current = map;
      layersGroupRef.current = L.layerGroup().addTo(map);

      // Tile layer
      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      tileLayer.on("load", () => {
        if (!cancelled && onTilesLoaded) onTilesLoaded();
      });
      tileLayer.addTo(map);

      resizeFrame = requestAnimationFrame(() => {
        if (!cancelled && leafletMapRef.current === map) {
          map.invalidateSize({ pan: false });
        }
      });
    });

    return () => {
      cancelled = true;
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        layersGroupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map layers dynamically when props change
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      if (!leafletMapRef.current || !layersGroupRef.current) return;
      const group = layersGroupRef.current;
      group.clearLayers();

      const allBoundsPoints: [number, number][] = [[userLat, userLng]];

      // ── Render Alternative Routes (Background routes in gray) ──
      if (alternativeRoutes.length > 0) {
        alternativeRoutes.forEach((altRoute, idx) => {
          if (idx === selectedRouteIndex) return; // Render selected route on top later
          const pts = altRoute.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
          if (pts.length > 1) {
            L.polyline(pts, {
              color: "#6b7280",
              weight: 4,
              opacity: 0.5,
              dashArray: "6, 8",
              lineCap: "round",
              lineJoin: "round",
            }).addTo(group);
            pts.forEach((pt) => allBoundsPoints.push(pt));
          }
        });
      }

      // ── Render Active / Selected Route (Highlighted in Emerald/Cyan) ──
      const activeCoords = alternativeRoutes[selectedRouteIndex]?.coordinates || routeCoordinates;
      const routePoints = activeCoords?.map(([lng, lat]) => [lat, lng] as [number, number]) || [];
      if (routePoints.length > 1) {
        L.polyline(routePoints, {
          color: "#059669",
          weight: 6,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(group);
        routePoints.forEach((pt) => allBoundsPoints.push(pt));
      }

      // ── User / Pickup Marker (Cyan Pulsing Pin) ──
      const userIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:24px;height:24px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(6,182,212,0.3);animation:pulse-ring 1.6s cubic-bezier(0.215,0.61,0.355,1) infinite;"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#06b6d4;border:2px solid #fff;box-shadow:0 0 0 2px #06b6d4;"></div>
          </div>
          <style>
            @keyframes pulse-ring {
              0%   { transform: scale(0.8); opacity: 0.7; }
              70%  { transform: scale(2);   opacity: 0; }
              100% { transform: scale(2.4); opacity: 0; }
            }
          </style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const originMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(group);
      originMarker.bindPopup(`<strong>Pickup:</strong> ${originLabel || "Location"}`);

      // ── Destination Marker (Red 🏁) ──
      if (destination) {
        allBoundsPoints.push([destination.lat, destination.lng]);
        const destinationIcon = L.divIcon({
          className: "",
          html: `<div style="display:grid;place-items:center;width:34px;height:34px;border:2px solid white;border-radius:50%;background:#be123c;color:white;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.35)">🏁</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const destinationMarker = L.marker([destination.lat, destination.lng], { icon: destinationIcon }).addTo(group);
        destinationMarker.bindPopup(`<strong>Drop:</strong> ${destination.label}`);
      }

      // ── Search Marker (Orange 🔎) ──
      if (searchMarker) {
        allBoundsPoints.push([searchMarker.lat, searchMarker.lng]);
        const searchIcon = L.divIcon({
          className: "",
          html: `<div style="display:grid;place-items:center;width:32px;height:32px;border:2px solid white;border-radius:50%;background:#f59e0b;color:white;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,.4)">🔎</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const sm = L.marker([searchMarker.lat, searchMarker.lng], { icon: searchIcon }).addTo(group);
        sm.bindPopup(`<strong>Searched:</strong> ${searchMarker.label}`).openPopup();
        map.setView([searchMarker.lat, searchMarker.lng], 14, { animate: true });
      }

      // ── Partner Hotel Markers (Violet Pins for Hotel Map) ──
      partners.forEach((partner) => {
        allBoundsPoints.push([partner.lat, partner.lng]);
        const partnerIcon = L.divIcon({
          className: "",
          html: `
            <div style="background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:#fff;font-size:14px;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.8);box-shadow:0 4px 12px rgba(139,92,246,0.5);cursor:pointer;">
              <span style="transform:rotate(45deg)">🏨</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        });
        const marker = L.marker([partner.lat, partner.lng], { icon: partnerIcon }).addTo(group);
        marker.bindPopup(`
          <div style="min-width:160px;font-family:system-ui,sans-serif;">
            <div style="font-weight:800;font-size:13px;margin-bottom:2px;">${partner.name}</div>
            <div style="font-size:11px;color:#666;margin-bottom:4px;">${partner.address}</div>
            <div style="font-size:11px;font-weight:700;color:#8b5cf6;">${partner.distanceKm.toFixed(1)} km away</div>
          </div>
        `);
        if (onMarkerClick) marker.on("click", () => onMarkerClick(partner));
      });

      // Fit bounds if search marker wasn't set specifically
      if (!searchMarker && allBoundsPoints.length > 1) {
        map.fitBounds(L.latLngBounds(allBoundsPoints), { padding: [40, 40], maxZoom: 14 });
      }
    });
  }, [userLat, userLng, destination, routeCoordinates, alternativeRoutes, selectedRouteIndex, searchMarker, partners, originLabel, onMarkerClick]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "100%", minHeight: 300 }}
      aria-label="Map showing route and navigation details"
    />
  );
}
