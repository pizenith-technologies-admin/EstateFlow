# Estate Vista Design Guidelines

## Design Approach

**Selected Framework:** Hybrid approach combining Material Design's information architecture with real estate industry references (Zillow, Compass, Redfin)

**Rationale:** Estate Vista requires the data organization strength of Material Design while maintaining the visual polish and trust signals essential to real estate applications. The mobile-first constraint demands efficient use of screen space while presenting rich property information.

**Core Principles:**
- Information hierarchy optimized for quick scanning
- Visual clarity through strategic use of imagery and whitespace
- Professional credibility through refined aesthetics
- Efficient navigation for multi-property, multi-client workflows

---

## Color Palette

### Light Mode
**Primary:** 210 85% 45% (Professional trust blue)
**Primary Hover:** 210 85% 38%
**Secondary:** 210 20% 25% (Deep slate for headings)
**Background:** 0 0% 98% (Soft off-white)
**Surface:** 0 0% 100% (Pure white cards)
**Surface Elevated:** 210 20% 97% (Subtle blue-gray for raised elements)
**Text Primary:** 210 15% 20%
**Text Secondary:** 210 10% 45%
**Border:** 210 15% 88%
**Success:** 142 70% 45% (Tour confirmed)
**Warning:** 38 92% 50% (Pending scheduling)
**Error:** 0 70% 50%

### Dark Mode
**Primary:** 210 85% 55%
**Primary Hover:** 210 85% 48%
**Secondary:** 210 15% 75%
**Background:** 210 15% 8%
**Surface:** 210 12% 12%
**Surface Elevated:** 210 10% 15%
**Text Primary:** 210 10% 95%
**Text Secondary:** 210 8% 70%
**Border:** 210 10% 20%

---

## Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - UI elements, body text, data
- Display: 'DM Sans' (Google Fonts) - Headings, property titles

**Scale:**
- Headline Large: 2.5rem / 700 / -0.02em (Property hero titles)
- Headline: 2rem / 600 / -0.01em (Section headers)
- Title: 1.5rem / 600 / normal (Card titles, property names)
- Body Large: 1.125rem / 500 / normal (Emphasized content)
- Body: 1rem / 400 / normal (Primary reading text)
- Body Small: 0.875rem / 400 / normal (Metadata, labels)
- Caption: 0.75rem / 500 / 0.02em uppercase (Tags, status badges)

---

## Layout System

**Spacing Primitives:** Tailwind units 2, 4, 6, 8, 12, 16
- Micro spacing (within components): p-2, gap-2
- Standard component spacing: p-4, gap-4, m-4
- Section spacing: py-8, py-12, px-4, px-6
- Major separations: mb-16, mt-12

**Grid System:**
- Mobile: Single column, full-width cards with px-4 container
- Tablet (md:): 2-column property grids, split-view layouts
- Desktop (lg:): 3-column grids, sidebar + main content (sidebar: w-80, main: flex-1)

**Container Widths:**
- Mobile: w-full with px-4
- Desktop: max-w-7xl with mx-auto for main content

---

## Component Library

### Navigation
**Mobile Bottom Nav (Primary):**
- 4 tabs: Home, Schedule, Properties, Profile
- Icon + label, 64px height, elevated surface with border-top
- Active state: primary color with indicator bar (h-1 rounded-t)

**Desktop Top Nav:**
- Logo left, search center (max-w-md), actions right (notifications, profile)
- Height: h-16, border-bottom, sticky

### Property Cards
**Grid Card (Primary View):**
- Image: 16:10 aspect ratio, rounded-lg, object-cover
- Overlay gradient on image bottom for price/address readability
- Price badge: top-right, rounded-full, backdrop-blur, white text
- Content section: p-4, property name (title weight), address (body small), beds/baths icons row
- Tour status badge: bottom-right, caption size, rounded-full

**List Card (Compact View):**
- Horizontal layout: 120px square image left, content right with flex-1
- Status indicator: vertical colored bar (w-1) on left edge

### Tour Management
**Tour Card:**
- Surface elevated background, rounded-lg, p-4
- Header: Client name + avatar, property thumbnail (40px rounded)
- Middle: Date/time prominent, address secondary
- Footer: Action buttons row (Reschedule, Cancel, Directions)
- Status badge top-right

**Calendar View:**
- Week view for mobile (horizontal scroll), month for tablet+
- Tour slots: rounded, color-coded by status, truncated text with icon
- Time labels: caption size, text-secondary

### Forms & Inputs
**Text Inputs:**
- Height: h-12, rounded-lg, px-4
- Border: 1px, focus ring-2 ring-primary/20
- Label: body small, mb-2, text-secondary
- Background: surface color (not transparent)

**Buttons:**
- Primary: h-12, px-6, rounded-lg, body weight 500
- Secondary: variant outline with border-2
- Small: h-10, px-4, body small
- Icon buttons: h-10 w-10, rounded-full for avatars/actions

### Data Display
**Stats Cards:**
- Grid layout: 2 columns mobile, 4+ desktop
- Surface elevated, rounded-lg, p-6
- Large number (headline), small label (caption), optional icon

**Property Details Sheet:**
- Full-screen mobile, slide-up modal tablet+
- Hero image carousel (swipeable, indicator dots)
- Sticky header with property name, back button
- Sections: Overview, Details (grid 2-col), Amenities (chips), Map, Tour History

### Overlays
**Modal:**
- max-w-md, rounded-xl, surface background
- Backdrop: backdrop-blur-sm bg-black/50
- Header: p-6, border-b, title + close button
- Content: p-6, scrollable if needed
- Actions: p-6, border-t, button group right-aligned

**Toast Notifications:**
- Fixed bottom-right desktop, top mobile
- Rounded-lg, surface elevated, p-4, shadow-lg
- Icon left, message center, close right, 4-second auto-dismiss

---

## Images

**Hero Image:** Yes - Featured property carousel on dashboard home
- Placement: Top of home screen, 60vh mobile / 50vh desktop
- Style: Full-bleed with gradient overlay (bottom to top, black 0% to transparent)
- Content over image: Search bar (centered, max-w-2xl), quick filters below
- CTA buttons on hero: Use backdrop-blur-md with bg-white/10 border border-white/20

**Property Images:**
- Primary card images: Professional property photos, exterior shots preferred
- Tour detail images: Multiple carousel images, interior/exterior mix
- Image quality: High-resolution, 1200px minimum width, compressed for web

**Profile/Avatar Images:**
- Agent profiles: Professional headshots, circular 40px-120px
- Client avatars: Initials fallback in primary color circles

**Map Integration:**
- Property detail: Embedded map showing location, h-64
- Tour route: Multi-marker map with route lines between properties

---

## Animations

Minimal, purposeful motion only:
- Page transitions: Slide in/out for modals and sheets (300ms ease-out)
- Button interactions: Scale on press (0.98), native hover states
- Card interactions: Subtle lift on hover (translate-y-1, shadow increase)
- Loading states: Skeleton screens with shimmer, spinner for inline actions