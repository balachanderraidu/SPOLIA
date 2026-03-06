# Spolia — Brand Identity & Design System

## Design Philosophy

> **"The Second Life of Design."**

Spolia occupies the intersection of sustainability and luxury. The brand must feel **premium, exclusive, and purposeful** — not green/eco-kitsch, not industrial-salvage. Think of it as the design world's equivalent of a private member's club: access is earned, quality is guaranteed, and every transaction is meaningful.

The interface should evoke **patinated brass, reclaimed stone, aged timber on a dark ground** — material richness expressed through digital design.

---

## Color Palette

### Primary Dark Theme

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-base` | `#0D0D0D` | App background |
| `--color-bg-surface` | `#161616` | Cards, bottom sheets |
| `--color-bg-elevated` | `#1E1E1E` | Modals, overlays |
| `--color-border` | `#2A2A2A` | Dividers, card borders |
| `--color-text-primary` | `#F5F0E8` | Headlines, primary text (warm white) |
| `--color-text-secondary` | `#A09882` | Subtext, metadata |
| `--color-text-muted` | `#5C5647` | Placeholder, disabled |

### Accent — Gold

| Token | Hex | Usage |
|---|---|---|
| `--color-gold` | `#FFD700` | Primary CTA, badges, highlights |
| `--color-gold-dim` | `#B89A00` | Pressed/active gold states |
| `--color-gold-subtle` | `rgba(255, 215, 0, 0.12)` | Gold tint surfaces, selected states |

### Functional Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-green` | `#4CAF82` | AI Scanner, positive metrics, CO₂ savings |
| `--color-green-dim` | `rgba(76, 175, 130, 0.15)` | Scanner overlay tint |
| `--color-red` | `#E05C5C` | Alerts, quality issues, forfeit risk |
| `--color-blue` | `#5B8DEF` | Links, map UX, logistics routing |
| `--color-amber` | `#F5A623` | Pending states, verification in progress |

---

## Typography

**Primary Font:** `Inter` (Google Fonts)  
**Display/Accent Font:** `Playfair Display` (for hero headings and brand moments)

| Scale | Use Case | Size / Weight |
|---|---|---|
| `--text-display` | Hero stats (Impact Dashboard) | 48px / 700 |
| `--text-h1` | Screen titles | 24px / 600 |
| `--text-h2` | Section headers | 18px / 600 |
| `--text-h3` | Card titles | 15px / 600 |
| `--text-body` | Standard body | 14px / 400 |
| `--text-caption` | Metadata, distances, timestamps | 12px / 400 |
| `--text-label` | Badges, tags, filter chips | 11px / 600 / uppercase |

---

## Layout & Grid

- **Mobile-first:** Base design at 390px (iPhone 14 Pro viewport)
- **Bottom navigation:** Fixed 64px bottom nav with 5 tabs
- **Safe areas:** Respect iOS/Android safe area insets via `env(safe-area-inset-*)`
- **Card radius:** `--radius-card: 16px`
- **Button radius:** `--radius-button: 12px`
- **Chip radius:** `--radius-chip: 100px` (fully rounded)

---

## Component Specifications

### Material Listing Card
- Dark surface `#161616`, border `1px solid #2A2A2A`
- Material thumbnail (square, 80×80, `object-fit: cover`, radius 12px)
- Title: `--text-h3` warm white
- Metadata row: type chip + distance + CO₂ saving (green)
- Price: `--text-h2` gold
- Bond indicator: gold shield icon if bond-protected

### Verification Badges

| Badge | Icon | Color |
|---|---|---|
| **Verified User** | ✓ shield | Gold `#FFD700` |
| **Architect Approved** | 🏛 COA | Gold + border |
| **Bond Protected** | 🔒 | Gold shield |
| **AI Estimated** | ✨ | Green `#4CAF82` |

### Bottom Navigation Tabs
Icons + labels, 5 tabs: Radar · Scanner · Impact · Logistics · Profile  
Active tab: gold icon + gold label underline dot  
Inactive: muted `#5C5647`

### Filter Chips (Radar)
Horizontal scroll, pill shape, radius 100px  
Selected: gold background + dark text  
Unselected: dark surface + muted border + dim text

### AI Scanner Overlay
Full-screen camera feed  
Green bounding box / targeting reticle (animated corner brackets)  
Semi-transparent dark overlay outside scan zone  
Result card slides up from bottom (bottom sheet)

### Spolia Bond CTA Button
Full-width, gold background, dark text, radius 12px, 56px height  
Subtitle: "Refundable deposit • Quality guaranteed"  
Pressing: gold shimmer / ripple

---

## Iconography
Use `Lucide Icons` or `Phosphor Icons` (consistent weight: 1.5px stroke)

---

## Motion & Animation
- Page transitions: `translateX` slide (300ms ease-out)
- Card entrance: `fadeIn + translateY(8px)` (200ms staggered)
- Scanner reticle: CSS animated corner brackets (pulse + scale)
- Impact counter: animated number scroll on mount
- Skeleton loaders: shimmer animation on dark surface while data loads
