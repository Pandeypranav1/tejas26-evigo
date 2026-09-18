"use client";

import { useState, useEffect } from "react";

const WHATSAPP_NUMBER = "7808807340";
const WHATSAPP_MESSAGE = "Hi! I'm interested in booking event services on Evigo.";

export function WhatsAppButton() {
  const [show, setShow] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    // Show button after a brief delay for a nice entrance
    const timer = setTimeout(() => setShow(true), 1500);
    // Stop pulse after 10 seconds so it's not annoying
    const pulseTimer = setTimeout(() => setPulse(false), 12000);
    return () => {
      clearTimeout(timer);
      clearTimeout(pulseTimer);
    };
  }, []);

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="evigo-wa-btn"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 50,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "#25D366",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(37,211,102,0.45), 0 2px 8px rgba(0,0,0,0.15)",
          cursor: "pointer",
          textDecoration: "none",
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
          transform: show ? "scale(1) translateY(0)" : "scale(0) translateY(40px)",
          opacity: show ? 1 : 0,
        }}
      >
        {/* WhatsApp icon */}
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>

        {/* Pulse rings */}
        {pulse && (
          <>
            <span
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                border: "2px solid #25D366",
                animation: "wa-ping 2s cubic-bezier(0,0,0.2,1) infinite",
                opacity: 0.6,
              }}
            />
            <span
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                border: "2px solid #25D366",
                animation: "wa-ping 2s cubic-bezier(0,0,0.2,1) infinite 0.5s",
                opacity: 0.4,
              }}
            />
          </>
        )}
      </a>

      {/* Tooltip label */}
      {show && (
        <div
          className="evigo-wa-label"
          style={{
            position: "fixed",
            bottom: 36,
            right: 92,
            zIndex: 50,
            background: "white",
            borderRadius: 12,
            padding: "8px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            fontSize: 13,
            fontWeight: 700,
            color: "#1a1a1a",
            whiteSpace: "nowrap",
            animation: "wa-tooltip-in 0.5s ease-out 2s both",
            pointerEvents: "none",
          }}
        >
          💬 Chat with us!
          {/* Arrow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: -6,
              transform: "translateY(-50%) rotate(45deg)",
              width: 12,
              height: 12,
              background: "white",
              boxShadow: "2px -2px 4px rgba(0,0,0,0.04)",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes wa-ping {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes wa-tooltip-in {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .evigo-wa-btn:hover {
          transform: scale(1.1) !important;
          box-shadow: 0 8px 32px rgba(37,211,102,0.55), 0 4px 12px rgba(0,0,0,0.2) !important;
        }
        @media (max-width: 640px) {
          .evigo-wa-btn {
            bottom: 16px !important;
            right: 16px !important;
            width: 54px !important;
            height: 54px !important;
          }
          .evigo-wa-label {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
