# DESIGN SYSTEM — Movie Vault

## 1. Design Direction

A cinematic, dark, poster-first interface inspired by the clarity of Letterboxd, the visual hierarchy of Netflix, and the personal-library feel of Plex — without copying any of them.

The app should feel curated, calm, premium, and useful. It should not look like a generic admin dashboard.

---

## 2. Visual Principles

1. Posters are the primary visual asset.
2. Dark surfaces keep artwork dominant.
3. Bright accents are used sparingly for interaction/state.
4. Metadata density increases on detail pages, not on grid cards.
5. Cards should remain scannable at a glance.
6. Watched state must be obvious without obscuring poster art.
7. Motion is subtle and functional.

---

## 3. Color Tokens

Use semantic tokens rather than hard-coded component colors.

Suggested dark palette:

```text
--bg-0:            #08090B
--bg-1:            #0E1013
--surface-1:       #14171B
--surface-2:       #1A1E23
--surface-hover:   #20252B
--border-subtle:   rgba(255,255,255,0.08)
--text-primary:    #F5F7FA
--text-secondary:  #A9B0BA
--text-muted:      #747C87
--accent:          #E7FF5E
--accent-strong:   #D8F53B
--success:         #69D391
--warning:         #F2C66D
--danger:          #F06F6F
```

If a warmer cinematic accent is preferred later, swap token values without changing component logic.

---

## 4. Typography

Recommended:

- UI/body: Geist / Inter / system sans.
- No decorative movie-poster font for body text.

Scale:

```text
Display: 48–64 / 1.0–1.1
H1: 36–44
H2: 28–32
H3: 22–24
Body: 15–16
Small: 13–14
Micro: 11–12
```

Use tabular numerals for ratings/stats where possible.

---

## 5. Spacing

Use 4px base scale.

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
```

Page gutters:

- Mobile: 16px
- Tablet: 24px
- Desktop: 32–48px
- Large desktop: use the available screen width with fluid gutters `clamp(32px, 2.5vw, 80px)`; no fixed page-width cap.

The wider desktop layout follows the user's requested use of the empty side areas. Keep text and forms at readable widths; let poster and directory grids add columns as space grows instead of stretching cards.

Homepage film, people and collection previews fill two rows for the current grid width, using available real entries. Mobile CSS caps previews before hydration; full category lists remain accessible through the section links.

---

## 6. Radius

- Buttons: 10–12px
- Panels: 14–18px
- Dialogs: 18–22px
- Poster images: 10–14px
- Pills: full radius

Avoid excessively rounded “toy” UI.

---

## 7. Poster Card

### Default card content

- Poster.
- Title.
- Year.
- Compact watched indicator.
- Optional rating.

### Hover desktop

- Slight poster scale ~1.02.
- Surface lift.
- Reveal secondary actions.
- No dramatic 3D tilt.

### Watched state

Recommended:

- small check badge at top-right
- subtle 10–20% dim overlay
- preserve poster recognizability

### Two-user status badge

Examples:

- `Both watched`
- `A ✓  B ○`

Use avatars/initials only if labels remain accessible.

---

## 8. Search Component

Large omnibox treatment.

Desktop:

- max-width ~760px
- input height 52–60px
- leading search icon
- shortcut hint `/`

Dropdown groups:

1. Saved movies
2. People
3. Global movies

Search result row:

- 44–56px thumbnail
- title/name
- secondary metadata
- saved badge/action

---

## 9. Movie Detail Hero

Desktop:

- Full-width backdrop with dark gradient mask.
- Poster overlapping lower hero region.
- Title/meta/action block.
- Streaming providers beneath primary metadata.

Mobile:

- Backdrop shorter.
- Poster and title stacked.
- Actions full-width/scrollable.

---

## 10. Person Page

Header:

- round or softly rounded portrait
- person name
- known-for department
- saved/watch progress

Sections:

- Saved in your vault
- Filmography

Filmography should use a compact poster grid/list with “Saved” state visible.

---

## 11. Collection Card

Cover options:

- 2x2 poster collage
- chosen backdrop

Show:

- name
- movie count
- optional description preview

Do not use folder icons as primary representation.

---

## 12. Activity Feed

Timeline row:

- actor avatar/initial
- human-readable action
- movie poster thumbnail when relevant
- timestamp
- context tag optional

Example:

> Ansh marked **Prisoners** as watched · 12:14 AM

Raw JSON audit payload must not appear in normal UI.

---

## 13. Buttons

Variants:

- Primary: accent fill, dark text.
- Secondary: surface fill.
- Ghost: transparent.
- Danger: restrained red.

Primary action examples:

- Add to Vault
- Mark Watched
- Create Collection

Avoid multiple primary buttons side-by-side.

---

## 14. Filters

Desktop:

- horizontal filter bar + popovers

Mobile:

- “Filters” bottom sheet

Active filter count badge required.

Filter chips should be removable individually.

---

## 15. Motion

Allowed:

- 120–220ms hover/focus transitions
- subtle page section fade/slide
- dialog scale/fade
- poster card hover
- random-picker reveal

Avoid:

- long cinematic intro animation
- scroll-jacking
- constant floating elements
- excessive blur animations

Respect `prefers-reduced-motion`.

---

## 16. Responsive Grid

Suggested poster columns:

- <480px: 2
- 480–767px: 3
- 768–1023px: 4
- 1024–1279px: 5
- 1280–1535px: 6
- ≥1536px: 7–8 depending card width

Keep poster aspect ratio 2:3.

---

## 17. Icons

Use Lucide consistently.

Recommended mappings:

- Search: Search
- Add: Plus
- Watched: Check
- Collections: Library / FolderHeart
- Rating: Star
- Activity: History
- Random: Dices
- Provider: Tv / Play

Do not mix multiple icon libraries.

---

## 18. Empty States

Use minimal illustration only if it matches the product.

Prefer poster-frame placeholders and useful next action.

Example:

> No unwatched thrillers under 2h 30m are available with the current filters.

`Clear filters`

---

## 19. Accessibility Requirements

- Focus ring always visible for keyboard navigation.
- Minimum 44px touch target on mobile.
- Color is not the sole indicator of watched state.
- Text contrast at least AA.
- Dialogs trap focus.
- Tooltips not required to understand essential actions.

---

## 20. Public vs Editor UI

Public mode should not show a forest of disabled controls.

Instead:

- omit editor-only controls from most surfaces
- show one tasteful “Members can edit” hint near the header/account area

Editor mode reveals mutation controls naturally.
