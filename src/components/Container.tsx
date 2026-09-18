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

export { PageContainer, Container, type PageContainerProps } from "./PageContainer";
export { default } from "./PageContainer";
