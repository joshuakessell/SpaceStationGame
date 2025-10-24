# Space Base Showdown - Design Guidelines

## Design Approach

**Selected Approach**: Reference-Based with Game UI Conventions

Drawing inspiration from successful space strategy and idle games (Clash of Clans' base building, Pixel Starships' space aesthetic, Starcraft's UI clarity), while incorporating modern web game design patterns. The visual language should evoke playful sci-fi cartoons with clear information hierarchy suitable for both casual mobile-style gameplay and strategic depth.

## Core Design Principles

1. **Playful Space Aesthetic**: Cartoon-styled sci-fi with rounded, friendly shapes and exaggerated proportions
2. **Information Clarity**: Game state must be instantly readable - resources, timers, unit stats all visible at a glance
3. **Tactile Feedback**: Every interaction should feel responsive and satisfying
4. **Visual Progression**: Players should see their base grow and evolve visually

## Typography System

**Primary Font**: Google Fonts - "Orbitron" (geometric, futuristic feel for headers and UI labels)
**Secondary Font**: Google Fonts - "Inter" (clean readability for body text and numbers)

**Hierarchy**:
- Page Titles/Mode Headers: text-4xl font-bold (Orbitron)
- Building Names/Section Headers: text-2xl font-semibold (Orbitron)
- Resource Labels/Stats: text-lg font-medium (Inter)
- Button Text: text-base font-semibold uppercase tracking-wide (Orbitron)
- Body/Descriptions: text-sm font-normal (Inter)
- Timer/Number Displays: text-xl font-mono tabular-nums (for consistent alignment)

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 8, 16 for consistent rhythm
- Tight spacing (gaps in resource bars): gap-2, p-2
- Standard spacing (between UI elements): gap-4, p-4
- Section padding: p-8 or p-16
- Screen margins: mx-8, my-8

**Grid Framework**:
- Base view: Full-screen canvas with fixed HUD overlay
- Battle view: Center-focused grid with side panels
- Resource bars: Always visible header strip
- Building/unit cards: grid-cols-2 md:grid-cols-3 lg:grid-cols-4

## Core Game Screens & Layouts

### 1. Base Management View (Primary Screen)

**Structure**:
- Top HUD bar (h-16 to h-20): Resources display, player level, settings icon
- Main canvas area: Isometric or top-down base view with draggable/zoomable viewport
- Bottom toolbar (h-24): Building menu, battle button, unit management tabs
- Side panel (optional, can slide in): Building upgrade details, timers

**Resource Display** (Top HUD):
- Horizontal flex container with rounded panels
- Each resource: Icon + current/max display + small production rate
- Visual: Pill-shaped containers with icons, condensed number format (1.2K instead of 1200)
- Organize left to right: Credits, Metal, Crystals

**Building Placement Grid**:
- Visual grid overlay on planet surface background
- Buildings as isometric or 2.5D sprites with shadows
- Clear placement indicators (green outline = valid, red = invalid)
- Tap/click to select building, shows info panel with upgrade button

### 2. Battle Mode Interface

**Pre-Battle Deployment Screen**:
- Center: Battlefield grid (6x4 or similar) with clear cell boundaries
- Left panel (w-64 to w-80): Available units list with stats
- Unit cards: Portrait, name, health/damage stats, level indicator
- Drag-and-drop from panel to grid cells (max 6 units deployed)
- Top: Enemy preview (opponent units shown in shadow/silhouette)
- Bottom: Large "START BATTLE" button (h-16, prominent)

**Battle Animation View**:
- Full-screen battlefield with units moving/attacking
- Top bar: Player HP bar vs Enemy HP bar, unit count
- Minimal UI during combat (auto-play with pause/speed controls optional for MVP)
- End screen overlay: Victory/Defeat banner with rewards display

### 3. Unit Management Screen

**Layout**: Grid of unit cards
- Cards: rounded-xl borders, aspect-[3/4] ratio
- Each card: Unit portrait (top 60%), stats panel (bottom 40%)
- Stats: Level, HP/Damage bars, upgrade button
- Filter tabs above grid: All, Melee, Ranged, Support

## Component Library

### Buttons

**Primary Action** (Build, Upgrade, Battle):
- Rounded-lg with bold text, py-4 px-8
- Prominent size for critical actions
- Subtle gradient or glow effect (CSS box-shadow)

**Secondary Actions** (Cancel, Info):
- Rounded-md, py-2 px-4
- Outlined or subtle background

**Icon Buttons** (Settings, Close):
- Circular or rounded-square, p-3
- Icon size: w-6 h-6

### Cards

**Building Cards** (in construction menu):
- rounded-xl, p-4
- Building icon/sprite at top (h-24 to h-32)
- Name, cost display, build time
- CTA button at bottom

**Unit Cards**:
- Vertical layout with portrait
- Stat bars (HP, Damage) with visual fill indicators
- Level badge in corner
- Upgrade cost display if applicable

### Progress Elements

**Resource Bars**:
- Horizontal bars with fill animation
- Clear current/max text overlay
- w-full h-3 with rounded-full ends

**Timers** (for building upgrades):
- Circular progress or countdown text
- Show remaining time prominently
- Visual: hourglass icon + MM:SS format

**Level Indicators**:
- Badge with star or rank icon
- Positioned top-right on cards

### Panels & Modals

**Info Panels** (building/unit details):
- Fixed or slide-in from side
- max-w-md for readability
- Sections: Image, title, stats grid, description, action buttons
- Backdrop blur when modal overlay

**Upgrade Confirmation**:
- Center modal, max-w-lg
- Clear before/after comparison
- Cost breakdown
- Confirm/Cancel buttons

### Navigation

**Top Navigation Bar**:
- Fixed position, backdrop-blur
- Logo/title left, resources center, settings/profile right
- h-16 standard height

**Bottom Tab Bar** (for mode switching):
- Fixed bottom on mobile, side rail on desktop
- Icons + labels for Base, Battle, Units, Research
- Active state with indicator line or background

## Icons

**Library**: Heroicons (outline for UI chrome, solid for filled states)
**Custom Needs**: Game-specific icons (building types, unit classes, resources)
- Use placeholder comments for custom icons: `<!-- CUSTOM ICON: Ore Mine -->`

## Visual Enhancements

**Backgrounds**:
- Base mode: Alien planet surface with stars/nebula sky
- Battle mode: Space battlefield or planet surface arena
- Use subtle parallax scrolling for depth

**Particle Effects** (minimal, strategic use):
- Resource collection: Brief sparkle/coin flip
- Building complete: Construction complete burst
- Victory: Confetti or star burst

**Shadows & Depth**:
- Cards: shadow-lg for elevation
- Floating UI elements: shadow-xl
- Active/selected states: shadow-2xl with subtle lift

## Responsive Behavior

**Desktop** (lg and up):
- Side-by-side layouts (base view with side panel)
- Multi-column unit grids (3-4 columns)
- Hover states for all interactive elements

**Tablet** (md):
- 2-column grids
- Collapsible panels
- Touch-optimized hit targets (min h-12)

**Mobile** (base):
- Single column layouts
- Full-screen modals instead of panels
- Bottom sheet for actions
- Simplified resource display (icons only, numbers on tap)

## Accessibility

- Minimum touch target: 44x44px (h-11 w-11 minimum)
- High contrast between text and backgrounds
- Clear focus indicators for keyboard navigation
- ARIA labels for game state announcements
- Readable font sizes (never below text-sm for critical info)

## Image Requirements

**Hero/Welcome Screen**: 
Full-viewport hero with space backdrop showing the game's aesthetic - vibrant cartoon planet with futuristic base structures in foreground, starfield background. This appears on login/welcome screen before entering base.

**In-Game Images**:
- Building sprites: Isometric cartoon-style structures (Command Center, Mines, Labs)
- Unit portraits: Character art for each unit type (Space Marine, Laser Bot, Tank)
- Background: Scrolling alien planet surface with mountains/craters
- Battle arena: Grid battlefield with sci-fi platform aesthetic

**Placeholder Strategy**: Use colored geometric shapes with labels until art assets are ready. Example: Buildings = colored rectangles with icons, Units = circular avatars with emoji or initials.