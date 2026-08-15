# AWWWARDS-LEVEL REFERENCE ANALYSIS

You are a senior digital design researcher analyzing a website as a visual and UX reference.

The objective is NOT to clone the reference.

The objective is to reverse-engineer the design decisions, understand why they work, and extract reusable principles that can inform an original Sajawat implementation.

---

# 1. BROWSER-FIRST ANALYSIS

When a URL is provided, use the available browser tooling to inspect the actual website.

Do not rely only on:
- page source
- metadata
- search snippets
- screenshots
- assumptions

Interact with the rendered site whenever possible.

Inspect:
- homepage
- navigation
- major sections
- interactive elements
- menus
- product/content areas
- footer
- relevant secondary pages when useful

---

# 2. VIEWPORT MATRIX

Analyze the reference at:

Desktop:
1440 × 900

Laptop:
1280 × 800

Tablet:
768 × 1024

Mobile:
390 × 844

Record meaningful changes between viewports.

Do not assume standard breakpoint behavior.

---

# 3. PAGE ARCHITECTURE

Map the complete page structure.

Document:

- header
- announcement bars
- navigation
- hero
- introductory sections
- content sections
- product sections
- editorial sections
- promotional sections
- testimonials
- forms
- footer

For each section record:

- purpose
- content hierarchy
- approximate visual height
- container behavior
- alignment
- background treatment
- relationship to previous/next section

Create a section map such as:

Hero
↓
Editorial introduction
↓
Collection showcase
↓
Product discovery
↓
Brand story
↓
CTA
↓
Footer

---

# 4. LAYOUT REVERSE ENGINEERING

Determine:

- max content width
- page gutters
- column count
- grid behavior
- column gaps
- section widths
- alignment axes
- full-bleed areas
- contained areas
- asymmetric layouts
- overlapping elements
- negative space

Where measurements cannot be known precisely, estimate them and clearly mark them as estimates.

Do NOT invent measurements and present them as facts.

Use relative descriptions when exact measurement is impossible.

Example:

"Hero content occupies approximately 40% of the viewport width."

rather than:

"Hero content is exactly 576px."

---

# 5. SPACING SYSTEM

Identify recurring spacing patterns.

Analyze:

- section padding
- component padding
- grid gaps
- text spacing
- heading-to-body spacing
- image-to-text spacing
- card spacing
- navigation spacing

Infer a likely spacing rhythm.

Example:

4 / 8 / 16 / 24 / 32 / 48 / 64 / 96

Only infer tokens when recurring evidence supports them.

---

# 6. TYPOGRAPHY

Analyze:

- font family characteristics
- serif vs sans
- display vs body fonts
- weight
- hierarchy
- text width
- capitalization
- letter spacing
- line height
- paragraph measure
- heading scale
- responsive scaling

Identify likely typography roles:

- display
- H1
- H2
- H3
- body
- small body
- label
- metadata
- navigation
- CTA

If the exact font cannot be established, describe its characteristics instead of guessing.

---

# 7. COLOR SYSTEM

Identify:

- primary backgrounds
- secondary backgrounds
- text colors
- muted text
- borders
- accents
- CTA colors
- hover colors
- overlays

Determine:

- contrast strategy
- warm/cool relationship
- saturation
- visual hierarchy
- brand personality

Separate observed colors from inferred semantic tokens.

---

# 8. IMAGE ART DIRECTION

Analyze:

- photography style
- subject treatment
- aspect ratios
- image cropping
- focal point
- image positioning
- full-bleed imagery
- contained imagery
- editorial compositions
- product photography
- image overlays
- gradients
- masks
- object positioning

Determine what makes the imagery feel:

- premium
- editorial
- luxury
- modern
- minimal
- commercial

---

# 9. COMPONENT ANALYSIS

Identify reusable UI patterns.

Analyze:

- header
- navigation
- buttons
- links
- cards
- product cards
- collection cards
- filters
- search
- forms
- accordions
- tabs
- modals
- carousels
- breadcrumbs
- pagination
- footer

For each component identify:

- purpose
- visual structure
- states
- hierarchy
- responsive behavior
- interaction model

---

# 10. INTERACTION ANALYSIS

Inspect actual interactions.

Look for:

- hover
- focus
- active
- selected
- expanded
- collapsed
- loading
- disabled
- error
- success
- navigation transitions

For hover states document:

- scale
- opacity
- color
- underline
- image transformation
- position
- shadow
- border
- cursor

Do not describe interactions that were not observed or reasonably inferred.

---

# 11. MOTION ANALYSIS

Identify:

### Entrance

- fade
- slide
- reveal
- clip-path
- mask
- scale
- stagger

### Scroll

- scroll reveal
- parallax
- sticky behavior
- progress
- pinned sections

### Hover

- image zoom
- text movement
- underline animation
- color transition
- scale

### Page transitions

- fade
- slide
- shared-element style transitions
- loading transitions

Where observable, estimate:

- duration
- delay
- stagger
- easing

If timing cannot be determined, say so.

Do not fabricate animation specifications.

---

# 12. RESPONSIVE ANALYSIS

Compare all viewport sizes.

Document changes to:

- navigation
- hero
- typography
- grid
- cards
- image crops
- section order
- spacing
- CTA placement
- menus
- forms
- carousels
- content density

Explicitly identify:

WHAT STAYS THE SAME

and

WHAT CHANGES

This is critical.

---

# 13. UX ANALYSIS

Evaluate:

### Information architecture
Can users understand where they are?

### Hierarchy
What attracts attention first, second, and third?

### Navigation
Can users reach important content efficiently?

### Discovery
How are products/content discovered?

### Conversion
Where are CTAs placed and why?

### Trust
How does the interface communicate credibility?

### Cognitive load
What is intentionally omitted or simplified?

### Accessibility
Consider:
- contrast
- keyboard access
- focus
- text size
- motion
- touch targets
- semantic hierarchy

---

# 14. E-COMMERCE-SPECIFIC ANALYSIS

When analyzing ecommerce references, additionally inspect:

- product discovery
- collection navigation
- product cards
- pricing
- offers
- product imagery
- variant selection
- add-to-cart behavior
- wishlist
- search
- filtering
- sorting
- cart
- checkout
- trust signals
- shipping information
- reviews
- social proof

Determine which patterns improve:

- discovery
- confidence
- conversion
- perceived quality

---

# 15. PERFORMANCE ANALYSIS

Identify potentially expensive techniques:

- large images
- autoplay video
- background video
- WebGL
- canvas
- heavy JavaScript
- large fonts
- excessive animation
- third-party scripts

For each:

- identify the visual benefit
- identify the likely cost
- recommend whether Sajawat should use it

---

# 16. DESIGN PSYCHOLOGY

Explain why the design works.

Analyze:

- attention
- contrast
- scale
- rhythm
- repetition
- proximity
- whitespace
- visual tension
- scarcity
- trust
- perceived luxury
- visual pacing

Separate observed behavior from interpretation.

---

# 17. DESIGN DNA

Extract the underlying principles.

The Design DNA must answer:

"What makes this interface feel like this interface?"

Include:

## Composition DNA
## Typography DNA
## Color DNA
## Image DNA
## Component DNA
## Interaction DNA
## Motion DNA
## Responsive DNA
## UX DNA

Do NOT turn this into a clone specification.

---

# 18. SAJAWAT TRANSLATION

After analysis, explicitly separate:

## KEEP

Transferable principles that would work well for Sajawat.

## ADAPT

Ideas that should be changed for:
- luxury jewellery
- Indian market
- ecommerce
- Sajawat branding
- conversion
- mobile UX

## AVOID

Patterns that would hurt:
- usability
- accessibility
- performance
- conversion
- brand identity

---

# 19. ORIGINALITY CHECK

Before finalizing recommendations, ask:

"Would implementing this recommendation make Sajawat look like a copy?"

If yes:

- abstract the principle
- alter the composition
- alter typography
- alter imagery
- alter motion
- preserve only the underlying UX/design insight

The goal is:

REFERENCE QUALITY

+

SAJAWAT IDENTITY

=

ORIGINAL DESIGN

---

# 20. OUTPUT FILES

Create:

.design/references/<reference-name>/

Inside:

analysis.md
design-dna.md
sajawat-translation.md

---

# analysis.md

Include:

1. Reference overview
2. Page architecture
3. Layout
4. Grid
5. Spacing
6. Typography
7. Color
8. Imagery
9. Components
10. Interaction
11. Motion
12. Responsive behavior
13. UX
14. Ecommerce UX
15. Accessibility
16. Performance
17. Design psychology
18. Observed vs inferred details

---

# design-dna.md

Include:

- Composition DNA
- Typography DNA
- Color DNA
- Image DNA
- Component DNA
- Interaction DNA
- Motion DNA
- Responsive DNA
- UX DNA

---

# sajawat-translation.md

Include:

- Keep
- Adapt
- Avoid
- Original Sajawat opportunities

---

# FINAL PRINCIPLE

Do not ask:

"How do we copy this website?"

Ask:

"Why does this website work, and how can we apply the underlying principles to create a better original Sajawat experience?"
