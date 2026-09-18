"use client";

import { useEffect, useRef } from "react";
import { TourismPlace } from "@/lib/constants";
import "leaflet/dist/leaflet.css";

interface Props {
  places: TourismPlace[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
}

export default function TourismMap({
  places,
  centerLat = 24.9278,
  centerLng = 86.2265,
  zoom = 10,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Dynamic import to prevent SSR breakages
    import("leaflet").then((L) => {
      // Fix default marker asset paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current!, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: false, // Prevents hijack while scrolling page
        attributionControl: true,
      });

      mapInstanceRef.current = map;

      // Fast OpenStreetMap Tile Layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(map);

      // Add markers for all places that have coordinates
      const validMarkers: any[] = [];

      places.forEach((place) => {
        if (!place.lat || !place.lng) return;

        const isNature = place.category.toLowerCase().includes("nature");
        const isReligious = place.category.toLowerCase().includes("religious");
        const pinColor = isNature ? "#10b981" : isReligious ? "#f59e0b" : "#8b5cf6";
        const pinEmoji = isNature ? "🌲" : isReligious ? "🛕" : "🏛️";

        const customIcon = L.divIcon({
          className: "custom-tourism-pin",
          html: `
            <div style="
              background: ${pinColor};
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              <span style="transform: rotate(45deg); font-size: 14px;">${pinEmoji}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; min-width: 180px; padding: 4px; color: #111;">
            <div style="font-size: 11px; font-weight: 700; color: ${pinColor}; text-transform: uppercase;">
              ${place.category}
            </div>
            <div style="font-size: 14px; font-weight: 800; margin: 2px 0 4px; color: #000;">
              ${place.name}
            </div>
            <div style="font-size: 11px; color: #555; line-height: 1.3; margin-bottom: 6px;">
              ${place.description.slice(0, 90)}...
            </div>
            <a 
              href="${
                place.lat !== undefined && place.lng !== undefined
                  ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.district + " Bihar")}`
              }" 
              target="_blank" 
              rel="noopener noreferrer"
              style="display: inline-block; font-size: 11px; font-weight: 700; color: #0284c7; text-decoration: none;"
            >
              Get Directions &rarr;
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
        validMarkers.push(marker);
      });

      // Fit bounds if multiple places exist
      if (validMarkers.length > 1) {
        const group = L.featureGroup(validMarkers);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [places, centerLat, centerLng, zoom]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full rounded-3xl overflow-hidden"
      style={{ minHeight: "380px" }}
    />
  );
}
