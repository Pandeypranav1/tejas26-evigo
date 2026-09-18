"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type AnimationType = "fade-up" | "fade-down" | "fade-left" | "fade-right" | "zoom-in" | "fade";

interface ScrollRevealProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;       // ms
  duration?: number;    // ms
  distance?: number;    // px for translate
  threshold?: number;   // 0–1
  once?: boolean;       // only animate once
  className?: string;
  staggerChildren?: number; // ms delay between children
}

const ANIMATION_TRANSFORMS: Record<AnimationType, string> = {
  "fade-up": "translateY(VALpx)",
  "fade-down": "translateY(-VALpx)",
  "fade-left": "translateX(-VALpx)",
  "fade-right": "translateX(VALpx)",
  "zoom-in": "scale(0.92)",
  "fade": "none",
};

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 700,
  distance = 40,
  threshold = 0.15,
  once = true,
  className = "",
  staggerChildren,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if user prefers reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const hiddenTransform = ANIMATION_TRANSFORMS[animation].replace("VAL", String(distance));

  // Handle staggered children
  const staggerStyle = staggerChildren
    ? `
    .sr-stagger > * {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity ${duration}ms ease-out, transform ${duration}ms ease-out;
    }
    .sr-stagger.sr-visible > * {
      opacity: 1;
      transform: translateY(0);
    }
    ${Array.from({ length: 20 }, (_, i) => `.sr-stagger.sr-visible > *:nth-child(${i + 1}) { transition-delay: ${delay + i * staggerChildren}ms; }`).join("\n")}
  `
    : "";

  return (
    <>
      {staggerChildren && <style>{staggerStyle}</style>}
      <div
        ref={ref}
        className={`${className} ${staggerChildren ? "sr-stagger" : ""} ${isVisible && staggerChildren ? "sr-visible" : ""}`}
        style={
          staggerChildren
            ? undefined
            : {
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                  ? "translateY(0) translateX(0) scale(1)"
                  : hiddenTransform,
                transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
                willChange: "opacity, transform",
              }
        }
      >
        {children}
      </div>
    </>
  );
}
