# Login Page Redesign — Design Spec

**Date:** 2026-03-27
**Status:** Approved

## Overview

Redesign the login and register pages from a plain centered card to a "Split Hero" layout with a dark branded panel on top and a white form panel below. The goal is to give the pages visual energy, warmth, and personality that feels uniquely "Cart."

## Layout

**Split Hero** — two vertically stacked sections:

1. **Brand panel (top):** Navy gradient background (`#1B2138` → `#2E344F`). Contains the cart icon, logo, tagline, feature pills, and subtle geometric accents.
2. **Form panel (bottom):** White background with `border-radius: 24px 24px 0 0` on the top corners, overlapping the brand panel by 16px via negative margin. Creates a layered depth effect.

The brand panel takes roughly 40% of the viewport, the form panel takes the rest and scrolls if needed (especially on register where there are more fields).

## Brand Panel Elements

### Cart Icon
- 64x64px container with `border-radius: 18px`
- Background: `rgba(26,171,138,0.15)` (teal at 15% opacity)
- Icon: Lucide `ShoppingCart`, 32px, stroke color `#22D1A5` (teal-light)

### Logo
- "AGDevX" in white, "Cart" in teal (`#22D1A5`)
- Font: Bricolage Grotesque, 28px, font-weight 800
- Letter-spacing: -0.5px

### Tagline
- "Grocery runs, sorted"
- Color: `rgba(255,255,255,0.45)`
- Font size: 13px, font-weight 600

### Feature Pills
Three equally-weighted pills displayed in a flex row with 8px gap:

| Pill | Text Color | Background |
|------|-----------|------------|
| Shared Lists | `#38BDF8` (sky blue) | `rgba(56,189,248,0.15)` |
| Pantry | `#34D399` (mint) | `rgba(52,211,153,0.15)` |
| Trip History | `#A78BFA` (soft purple) | `rgba(139,92,246,0.15)` |

- Font size: 11px, font-weight 700, letter-spacing 0.3px
- Border-radius: 20px, padding: 5px 12px

### Geometric Accents
Subtle circle outlines positioned absolute within the brand panel for visual texture:
- Top-right area: sky blue circles at ~10% and ~6% opacity
- Bottom-left: amber circle at ~8% opacity
- Bottom-left (smaller): purple circle at ~8% opacity

These are decorative — exact positioning can vary during implementation.

## Form Panel

### Login Page
- Heading: "Sign in" — Bricolage Grotesque, 20px, font-weight 800, color `#1B2138`
- Fields: Email, Password — same input styling as the rest of the app (validation borders, focus rings)
- Button: "Login" — standard teal button
- Footer: "Don't have an account? Sign up" link

### Register Page
- Same Split Hero layout
- Heading: "Create your account"
- Fields: Email, Password (with criteria checklist), Confirm Password, Name
- Button: "Sign up"
- Footer: "Already have an account? Log in" link

## Notes
- The pill colors (sky blue, mint, purple) are decorative only — used on the login/register pages, not part of the app's functional color system
- The register page should match the login page's brand panel exactly (same icon, logo, tagline, pills, accents)
- Entrance animation: use the existing `animate-fade-in` class on the outer container
