# Design System Documentation: Kinetic Frame

## 1. Overview & Creative North Star
**Creative North Star: "Neon Kineticism"**

This design system moves away from the static, "boxed-in" nature of traditional e-commerce. Instead, it draws inspiration from the high-octane energy of modern manga and cyberpunk aesthetics. We treat the viewport not as a grid of containers, but as a series of **dynamic panels**. 

To break the "template" look, we utilize intentional asymmetry, overlapping elements that "break the frame," and a dramatic typographic scale. The goal is to make the user feel like they are navigating an interactive editorial piece rather than a database. We prioritize depth through tonal shifts and light-emission rather than structural lines, creating a UI that feels alive, urgent, and premium.

---

## 2. Colors
Our palette is rooted in a deep, atmospheric void (`surface`: `#0c0c1f`) punctuated by high-frequency accents.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Boundaries must be defined through background color shifts. For example, a product gallery sitting on a `surface` background should be contained within a `surface-container-low` or `surface-container-lowest` wrapper. Contrast, not lines, defines the architecture.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create "nested" depth:
*   **Background:** `surface` (#0c0c1f)
*   **Secondary Sections:** `surface_container_low` (#111127)
*   **Primary Cards/Components:** `surface_container` (#17172f)
*   **Elevated Overlays/Modals:** `surface_container_highest` (#23233f)

### The "Glass & Gradient" Rule
Floating elements (like navigation bars or hovering price tags) should utilize **Glassmorphism**. Combine `surface_bright` at 60% opacity with a `backdrop-blur` of 12px to 20px. 

### Signature Textures
To provide "soul," avoid flat color fills for large CTAs. Use subtle linear gradients:
*   **Primary Action:** Transition from `primary` (#ff906a) to `primary_container` (#ff7949) at a 135-degree angle.
*   **Energy Accents:** Use `tertiary` (#ff6c92) gradients for hover states to mimic a neon glow.

---

## 3. Typography
The typography is the engine of this design system’s personality. We pair a "Mecha-inspired" technical sans-serif with a sophisticated, highly-legible body face.

*   **Display & Headlines (Space Grotesk):** These are our "Impact" levels. Use `display-lg` and `headline-lg` with tight letter-spacing (-2%) to mimic manga sound-effect lettering. These should often be set in all-caps for maximum authority.
*   **Titles & Body (Manrope):** This is our "Editorial" level. `title-lg` and `body-lg` provide a clean, modern contrast to the aggressive headlines. Ensure generous line-height (1.5) for body text to maintain a premium feel.
*   **Labels (Plus Jakarta Sans):** Used for technical metadata, price tags, and micro-copy. These should feel "engineered" and precise.

---

## 4. Elevation & Depth
In this design system, depth is a product of light and layering, not shadows.

*   **Tonal Layering:** Avoid drop shadows for standard cards. Instead, "stack" the tiers. Place a `surface_container_high` card on a `surface_container_low` background. This creates a soft, natural lift that feels integrated.
*   **Ambient Glows:** When an element must "float" (e.g., a featured collectible), use an **Ambient Glow** instead of a shadow. The shadow color should be a 10% opacity version of the `primary` (#ff906a) or `secondary` (#00d2fd) token, with a blur value of 40px+.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, it must be a **Ghost Border**. Use the `outline_variant` token at 15% opacity. Never use 100% opaque borders.
*   **Kinetic Overlap:** Encourage elements to break out of their containers. A character cutout or product image should overlap the "gutter" between two surface containers to create a sense of 3D space.

---

## 5. Components

### Buttons
*   **Primary:** Sharp corners (`rounded-sm`: 0.125rem) to maintain the manga edge. Fill with a `primary` gradient. Text should be `on_primary_fixed` (Black) for maximum contrast.
*   **Secondary:** Ghost style. No fill, `outline` token at 20% opacity, with `secondary` (#00d2fd) text.
*   **Interaction:** On hover, primary buttons should emit a `surface_tint` outer glow.

### Cards & Lists
*   **The Divider Ban:** Explicitly forbid 1px divider lines between list items. Use the spacing scale—specifically `8` (2rem) or `10` (2.5rem)—to create rhythmic separation.
*   **Visual Interest:** Use `surface_container_highest` for the card body and `surface_bright` for the "header" area of the card to create internal hierarchy.

### Input Fields
*   **Style:** Minimalist. Use `surface_container_low` as the background fill. Use a 2px bottom-bar of `outline_variant` that transitions to `secondary` (#00d2fd) on focus.
*   **Error State:** Use `error` (#ff716c) for the label and a subtle `error_container` glow around the field.

### Kinetic Chips
*   **Selection:** Use `secondary_container` with `on_secondary_container` text. These should have the `md` (0.375rem) rounding to distinguish them from the "sharper" action buttons.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme white space. Use the `24` (6rem) spacing token between major editorial sections to let the "Neon Kineticism" breathe.
*   **Do** use asymmetrical layouts. For example, left-align a headline while right-aligning the body text in a neighboring column.
*   **Do** use `secondary` (#00d2fd) and `tertiary` (#ff6c92) for micro-interactions, like heart icons or "New" badges.

### Don't
*   **Don't** use standard "Drop Shadows." They feel dated and muddy in a high-contrast dark-mode system.
*   **Don't** use fully rounded (pill-shaped) buttons unless it's a specific "Add to Cart" floating action button. We want to preserve the sharp, manga-inspired "edge."
*   **Don't** use pure white (#FFFFFF) for body text. Always use `on_surface` (#e5e3ff) or `on_surface_variant` (#aaa8c3) to reduce eye strain and maintain the premium dark-room aesthetic.