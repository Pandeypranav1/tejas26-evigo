/**
 * ── ARCHITECTURE RULE ──────────────────────────────────────────────────────────
 * All page sections MUST wrap their content in <PageContainer> (or <Container>).
 * DO NOT add custom max-width or horizontal padding at the section level.
 *
 * This component is the SINGLE SOURCE OF TRUTH for:
 *   - max-width: 1280px
 *   - width: 100%
 *   - margin: 0 auto
 *   - horizontal padding: 24px (mobile: px-6) / 48px (desktop: md:px-12)
 * ──────────────────────────────────────────────────────────────────────────────
 */

import React, { type ReactNode } from "react";

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "div" | "section" | "main" | "header" | "footer";
  style?: React.CSSProperties;
}

export function PageContainer({
  children,
  className = "",
  id,
  as: Component = "div",
  style,
}: PageContainerProps) {
  return (
    <Component
      id={id}
      style={style}
      className={`w-full max-w-[1280px] mx-auto px-6 md:px-12 box-border ${className}`}
    >
      {children}
    </Component>
  );
}

// Named alias for drop-in compatibility
export const Container = PageContainer;
export default PageContainer;
