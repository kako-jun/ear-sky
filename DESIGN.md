# DESIGN.md

Ear in the Sky Diamond — Design System

## 1. Visual Theme & Atmosphere

Neon-lit late-night izakaya. Deep navy sky backgrounds with pink and blue neon glow effects create the feeling of stumbling into a music bar at 2 AM. The UI glows — text has neon shadows, borders emit soft light, and a day-rotating background photo adds atmosphere behind a dark gradient overlay. Community-driven soramimi (misheard lyrics) sharing site.

Dark theme only. The neon only works on darkness.

Inspirations: Japanese neon street signs, late-night bar districts, karaoke subtitle crawls, retro-futuristic UI.

## 2. Color Palette & Roles

Tailwind CSS 4 custom theme colors.

### Neon Accents

| Token         | Hex       | Usage                              |
| ------------- | --------- | ---------------------------------- |
| `neon-pink`   | `#ff2d78` | Primary accent, glow effects, CTAs |
| `neon-blue`   | `#00d4ff` | Secondary accent, focus, active    |
| `neon-yellow` | `#ffe156` | Tertiary (available, subtle)       |
| `neon-green`  | `#39ff14` | Extended palette                   |

### Background Layers

| Token          | Hex       | Usage                        |
| -------------- | --------- | ---------------------------- |
| `night-sky`    | `#080932` | Primary background           |
| `night-deep`   | `#050510` | Darkest overlay base         |
| `bar-wall`     | `#1a1520` | Mid-dark neutral             |
| `bar-counter`  | `#251e2e` | Container backgrounds        |

### Text Opacity Scale

White at varying opacity: `/90`, `/70`, `/50`, `/45`, `/40`, `/30`, `/15`, `/10`, `/5`.

Body text: `#e0d8e8`. Error: `#ff6b5b` / `red-400`.

### Neon Glow Effects

```css
.neon-text {
  text-shadow: 0 0 7px #ff2d78, 0 0 20px rgba(255,45,120,0.4), 0 0 40px rgba(255,45,120,0.2);
}
.neon-border {
  border-color: rgba(255,45,120,0.3);
  box-shadow: inset 0 0 ... , 0 0 ... ;
}
```

## 3. Typography Rules

### Font Family

```
"Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif
```

### Type Scale

| Element       | Class                  | Notes                    |
| ------------- | ---------------------- | ------------------------ |
| Page title    | `text-2xl md:text-3xl` | `.neon-text` glow        |
| Section header | `text-lg`             | `.neon-text` or `.neon-text-blue` |
| Body/labels   | `text-sm`              | Most UI text             |
| Meta text     | `text-xs`              | Dates, IDs, counts       |
| Tiny/badges   | `text-[10px]`          | Tags, secondary info     |
| Monospace     | `text-sm font-mono`    | Timer controls, numbers  |

### Text Effects

- `.neon-text`: pink glow, `tracking-widest`
- `.neon-text-blue`: blue glow variant
- Subtitle karaoke: gradient sweep `linear-gradient(90deg, ...)` with `background-clip: text`

## 4. Component Stylings

### Post Card

- Container: `space-y-3`
- Reveal box (hidden): `border border-white/10`, `text-white/40`
- Reveal box (shown): `.neon-border`, fade-in animation
- Misheard text: `text-lg font-bold text-white/90` in quotes
- Original text: `text-xs text-white/40` italic

### Tags

```
px-2 py-0.5 rounded-full text-[10px] font-medium
bg-white/5 text-white/45 border border-white/10
```

### Inputs

```
bg-black/30 border border-white/20 rounded-lg px-3 py-2.5
text-white placeholder:text-white/30
focus:border-neon-blue/50 focus:bg-white/8
```

### Buttons — Submit

```
bg-neon-pink text-white font-bold py-3 rounded-lg
hover:brightness-110 active:scale-[0.98]
disabled:opacity-30 disabled:cursor-not-allowed
```

### Buttons — Secondary

```
border border-white/20 py-3 rounded-lg
hover:border-white/40
```

### Navigation Tabs

- Active: `text-neon-pink border-b-2 border-neon-pink`
- Inactive: `text-white/50 hover:text-white/70`
- Focus: `outline-2 outline-neon-blue outline-offset-[-2px]`

### Emoji Reaction Badges

- Active: `border-neon-pink/50 bg-neon-pink/10 text-white`
- Inactive: `border-white/15 text-white/60 hover:border-white/30`
- Pill shape: `rounded-full`

### Emoji Picker

- Background: `rgba(26,21,32,0.95)` + `backdrop-blur-12px`
- Border: `rgba(255,255,255,0.15)`
- Border radius: `12px`
- Grid: `repeat(4, 1fr)`, button `44x44px`
- Z-index: `50`

### Filter Chips

- Selected: `bg-neon-pink/20 text-neon-pink border-neon-pink/40`
- Unselected: `text-white/40 border-white/15`

### Language Toggle

- Container: `inline-flex rounded-md border border-white/10 overflow-hidden`
- Active: `bg-neon-blue/20 text-neon-blue`
- Inactive: `text-white/45`

### Toast

- Background: `bg-bar-counter/95 backdrop-blur-md`
- Border: `border-neon-blue/50` (success) / `border-red-500/50` (error)
- Position: `fixed top-4 center z-50`

## 5. Layout Principles

### Container

- Mobile: `max-w-lg` (32rem)
- Tablet: `md:max-w-xl` (36rem)
- Desktop: `lg:max-w-2xl` (42rem)
- Padding: `px-4`

### Header

- Fixed with scroll-triggered collapse (shrink at 80px, expand at 40px)
- Expanded: `pt-8 pb-4`, icon `48px`
- Collapsed: `pt-2 pb-1`, icon `24px`
- Decorative: neon-pink gradient line + radial glow behind title

### Spacing

- Section: `space-y-6`
- Post card: `space-y-3`
- Inputs: `px-3 py-2.5`
- Buttons: `px-4 py-3`
- Tags: `gap-1.5`

### Background

- Day-rotating images (7 variants): `bg-0.webp` through `bg-6.webp`
- Filter: `blur(2px) brightness(0.5) saturate(1.3) scale(1.05)`
- Gradient overlay: three-point from `night-deep` through `bar-wall` to `bar-counter`

## 6. Depth & Elevation

### Z-Index

| Layer      | Value | Element          |
| ---------- | ----- | ---------------- |
| Background | 0     | Rotating bg      |
| Content    | 1     | Main content     |
| Slider     | 10    | Range thumbs     |
| Loading    | 20    | Overlay          |
| Header     | 40    | Fixed header     |
| Picker     | 50    | Emoji picker     |
| Toast      | 60    | Notification     |

### Shadows

- Emoji picker: `0 -4px 20px rgba(0,0,0,0.5)`
- Range slider thumbs: `shadow-lg`
- Standard cards: none (neon border glow instead)

### Border Radius

| Component   | Radius       |
| ----------- | ------------ |
| Inputs      | `rounded-lg` (8px) |
| Emoji picker | `12px`      |
| Emoji buttons | `8px`     |
| Tags/badges | `rounded-full` |
| Reaction badges | `rounded-full` |

### Backdrop Effects

- Header (collapsed): `backdrop-blur-md`
- Emoji picker: `backdrop-blur-12px`
- Subtitle overlay: dynamic `blur(${12 * opacity}px)`

## 7. Do's and Don'ts

### Do

- Use neon glow effects (text-shadow stacking) for emphasis
- Apply `backdrop-filter: blur()` on floating elements
- Use neon-pink for primary actions, neon-blue for secondary/focus
- Keep text at low opacity (`/40` to `/70`) and brighten on hover
- Include `-webkit-backdrop-filter` for iOS Safari
- Respect `prefers-reduced-motion` with `animation-duration: 0.01ms`
- Use day-rotating background images with consistent filter treatment

### Don't

- Add a light theme. The neon aesthetic requires darkness
- Use neon glow on body text — reserve for headers and accents
- Exceed 3 neon colors in a single view (pink + blue + one more max)
- Remove the background blur/darken filter — raw photos are too bright
- Use sharp corners on interactive elements (minimum `rounded-lg`)

### Transitions

| Context          | Duration | Notes              |
| ---------------- | -------- | ------------------ |
| Default          | 300ms    | `transition-colors` |
| Fade-in          | 400ms    | `ease-out`, `translateY(8px)` |
| Button press     | instant  | `active:scale-[0.98]` |
| Range thumb      | instant  | `hover:scale-110 active:scale-95` |
| Toast            | 300ms    | Fade in/out        |

## 8. Responsive Behavior

### Breakpoints (Tailwind 4)

| Name | Value  | Notable changes              |
| ---- | ------ | ---------------------------- |
| sm   | 640px  |                              |
| md   | 768px  | Form inputs go 2-column      |
| lg   | 1024px | Container widens to `max-w-2xl` |

### Mobile-First

- Default: single column, compact spacing
- `md:`: form grid adapts (artist/song side-by-side)
- `lg:`: max container width expands

### Header Collapse

- Scroll > 80px: title shrinks, icon shrinks, padding reduces
- Scroll < 40px: expands back
- Smooth transition on background color

## 9. Agent Prompt Guide

### Theme Color Reference

```
Neon pink:    #ff2d78  (primary accent)
Neon blue:    #00d4ff  (secondary, focus)
Night sky:    #080932  (background)
Night deep:   #050510  (overlay dark)
Bar wall:     #1a1520  (mid-dark)
Bar counter:  #251e2e  (containers)
Body text:    #e0d8e8  (off-white)
Error:        #ff6b5b  (red)
```

### When generating UI for this project

- Neon glow = stacked text-shadows. Pink for primary, blue for secondary
- Everything on dark backgrounds. White text at opacity for hierarchy
- `backdrop-filter: blur()` on floating UI (picker, header, toast)
- Tailwind CSS 4 with custom theme tokens
- Japanese-first font stack (Hiragino/Noto Sans JP)
- Container maxes: 32rem → 36rem → 42rem at breakpoints
- Focus rings: `2px outline neon-blue`
- Tags and badges: `rounded-full`, tiny text (`10-11px`)
- Emoji reactions: pink-tinted when active, gray when not
- Day-rotating bg images with `blur + brightness + saturate` filter
- Subtitle karaoke: gradient sweep animation on `background-clip: text`

### Color Emotion Reference

- **Neon pink (#ff2d78):** Excitement, nightlife, call to action
- **Neon blue (#00d4ff):** Cool focus, trust, secondary interaction
- **Night sky (#080932):** Mystery, late hours, immersion
- **Bar counter (#251e2e):** Warmth, surface, containment
- **Off-white (#e0d8e8):** Readable without harsh glare
