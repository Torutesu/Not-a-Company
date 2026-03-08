---
name: design-guide
description: >
  Paperclip UI design system guide for building consistent, reusable frontend
  components. Use when creating new UI components, modifying existing ones,
  adding pages or features to the frontend, styling UI elements, or when you
  need to understand the design language and conventions. Covers: component
  creation, design tokens, typography, status/priority systems, composition
  patterns, and the /design-guide showcase page. Always use this skill
  alongside the frontend-design skill (for visual quality) and the
  web-design-guidelines skill (for web best practices).
---

# Paperclip Design Guide

Paperclip's UI is a professional-grade control plane — dense, keyboard-driven, dark-themed by default. Every pixel earns its place.

**Always use with:** `frontend-design` (visual polish) and `web-design-guidelines` (web best practices).

---

## 1. Design Principles

- **Dense but scannable.** Maximum information without clicks to reveal. Whitespace separates, not pads.
- **Keyboard-first.** Global shortcuts (Cmd+K, C, [, ]). Power users rarely touch the mouse.
- **Contextual, not modal.** Inline editing over dialog boxes. Dropdowns over page navigations.
- **Dark theme default.** Neutral grays, not pure black. Accent colors for status/priority only. Text is the primary visual element.
- **Component-driven.** Prefer reusable components that capture style conventions. Build at the right abstraction — not too granular, not too monolithic.

---

## 2. Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** with CSS variables
- **shadcn/ui** (new-york style, neutral base, CSS variables enabled)
- **Radix UI** primitives (accessibility, focus management)
- **Lucide React** icons (16px nav, 14px inline)
- **class-variance-authority** (CVA) for component variants
- **clsx + tailwind-merge** via `cn()` utility

Config: `ui/components.json` (aliases: `@/components`, `@/components/ui`, `@/lib`, `@/hooks`)

---

## 3. Design Tokens

All tokens defined as CSS variables in `ui/src/index.css`.

### Colors

**All brand colors MUST use CSS variables. Never use Tailwind default color classes (e.g., `blue-500`, `gray-700`).**

Tailwind usage pattern: `bg-[var(--bg-base)]`, `text-[var(--text-primary)]`, `border-[var(--border-default)]`

Brand color: `#1738BD` — always reference via CSS variable (e.g., `var(--brand-primary)`).

> ⚠️ CSS variable definitions TBD — update `ui/src/index.css` when color tokens are finalized.

### Radius

- `rounded-sm` — small inputs, chips
- `rounded-md` — buttons, inputs, small components
- `rounded-lg` — cards, dialogs
- `rounded-xl` — card containers, large components

**Do NOT use `rounded-full` uniformly across all elements.** Use only when the shape is intentionally circular (e.g., avatar, status dot).

### Shadows

Minimal shadows: `shadow-xs` (outline buttons), `shadow-sm` (cards). No heavy shadows.

---

## 4. Typography

Three font families. All must be loaded via Google Fonts or self-hosted.

| Family | Use | Weights |
|--------|-----|---------|
| **DM Sans** | English text, numbers, UI labels | 400, 500, 600, 700 |
| **Noto Sans JP** | Japanese text | 400, 500, 700 |
| **JetBrains Mono** | Monospace: code, identifiers, logs | 400, 500 |

**Prohibited fonts:** Inter, Roboto, Arial — never use these.

### Typography Scale

Use these exact patterns — do not invent new ones:

| Pattern | Classes | Usage |
|---------|---------|-------|
| Page title | `text-xl font-bold` | Top of pages |
| Section title | `text-lg font-semibold` | Major sections |
| Section heading | `text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide` | Section headers in sidebar |
| Card title | `text-sm font-medium` or `text-sm font-semibold` | Card headers, list item titles |
| Body | `text-sm` | Default body text |
| Muted | `text-sm text-[var(--text-secondary)]` | Descriptions, secondary text |
| Tiny label | `text-xs text-[var(--text-tertiary)]` | Metadata, timestamps, property labels |
| Mono identifier | `text-xs font-mono text-[var(--text-tertiary)]` | Issue keys (PAP-001), CSS vars |
| Large stat | `text-2xl font-bold` | Dashboard metric values |
| Code/log | `font-mono text-xs` | Log output, code snippets |

---

## 5. Spacing

**4px grid only.** Use only these values: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px`

In Tailwind: `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px), `p-12` (48px), `p-16` (64px), `p-24` (96px)

Do not use odd spacing values (e.g., `p-5`, `p-7`, `p-10`, `p-11`).

---

## 6. Status & Priority Systems

### Status Colors (consistent across all entities)

Defined in `StatusBadge.tsx` and `StatusIcon.tsx`:

| Status | Color | Entity types |
|--------|-------|-------------|
| active, achieved, completed, succeeded, approved, done | Green shades | Agents, goals, issues, approvals |
| running | Cyan | Agents |
| paused | Orange | Agents |
| idle, pending | Yellow | Agents, approvals |
| failed, error, rejected, blocked | Red shades | Runs, agents, approvals, issues |
| archived, planned, backlog, cancelled | Neutral gray | Various |
| todo | Blue | Issues |
| in_progress | Indigo | Issues |
| in_review | Violet | Issues |

All status colors must use CSS variables — never hardcode hex or Tailwind default colors.

### Priority Icons

Defined in `PriorityIcon.tsx`: critical (red/AlertTriangle), high (orange/ArrowUp), medium (yellow/Minus), low (blue/ArrowDown).

### Agent Status Dots

Inline colored dots: running (cyan, animate-pulse), active (green), paused (yellow), error (red), offline (neutral).

---

## 7. Component Hierarchy

Three tiers:

1. **shadcn/ui primitives** (`ui/src/components/ui/`) — Button, Card, Input, Badge, Dialog, Tabs, etc. Do not modify these directly; extend via composition.
2. **Custom composites** (`ui/src/components/`) — StatusBadge, EntityRow, MetricCard, etc. These capture Paperclip-specific design language.
3. **Page components** (`ui/src/pages/`) — Compose primitives and composites into full views.

**See [references/component-index.md](references/component-index.md) for the complete component inventory with usage guidance.**

### When to Create a New Component

Create a reusable component when:
- The same visual pattern appears in 2+ places
- The pattern has interactive behavior (status changing, inline editing)
- The pattern encodes domain logic (status colors, priority icons)

Do NOT create a component for:
- One-off layouts specific to a single page
- Simple className combinations (use Tailwind directly)
- Thin wrappers that add no semantic value

---

## 8. Layout System

Four-zone layout:

```
┌──────────────────────────────────────────────────────────────┐
│  Top nav (h-14 / 56px, sticky)                               │
├──────────┬──────────────────────────────┬────────────────────┤
│ Sidebar  │  Main content (flex-1)       │  Right pane        │
│ (240px)  │                              │  (320px, optional) │
│  fixed   │                              │  collapsible       │
└──────────┴──────────────────────────────┴────────────────────┘
```

- **Top nav:** `h-14` (56px), `sticky top-0`, above all content
- **Sidebar:** `w-60` (240px), fixed width, left navigation
- **Main content:** `flex-1`, scrollable
- **Right pane:** `w-80` (320px), shown on detail views, collapsible

---

## 9. Logo

Hexagonal grid pattern — 6 hexagons arranged in a pyramid shape.
Brand color: `#1738BD` (always use via CSS variable).

---

## 10. The /design-guide Page

**Location:** `ui/src/pages/DesignGuide.tsx`
**Route:** `/design-guide`

This is the living showcase of every component and pattern in the app. It is the source of truth for how things look.

### Rules

1. **When you add a new reusable component, you MUST add it to the design guide page.** Show all variants, sizes, and states.
2. **When you modify an existing component's API, update its design guide section.**
3. **When you add a new composition pattern, add a section demonstrating it.**
4. Follow the existing structure: `<Section title="...">` wrapper with `<SubSection>` for grouping.
5. Keep sections ordered logically: foundational (colors, typography) first, then primitives, then composites, then patterns.

### Adding a New Section

```tsx
<Section title="My New Component">
  <SubSection title="Variants">
    {/* Show all variants */}
  </SubSection>
  <SubSection title="Sizes">
    {/* Show all sizes */}
  </SubSection>
  <SubSection title="States">
    {/* Show interactive/disabled states */}
  </SubSection>
</Section>
```

---

## 11. Component Index

**See [references/component-index.md](references/component-index.md) for the full component inventory.**

When you create a new reusable component:
1. Add it to the component index reference file
2. Add it to the /design-guide page
3. Follow existing naming and file conventions

---

## 12. File Conventions

- **shadcn primitives:** `ui/src/components/ui/{component}.tsx` — lowercase, kebab-case
- **Custom components:** `ui/src/components/{ComponentName}.tsx` — PascalCase
- **Pages:** `ui/src/pages/{PageName}.tsx` — PascalCase
- **Utilities:** `ui/src/lib/{name}.ts`
- **Hooks:** `ui/src/hooks/{useName}.ts`
- **API modules:** `ui/src/api/{entity}.ts`
- **Context providers:** `ui/src/context/{Name}Context.tsx`

All components use `cn()` from `@/lib/utils` for className merging. All components use CVA for variant definitions when they have multiple visual variants.

---

## 13. Hard Rules

- **Monaco / CodeMirror エディタは禁止** — コードエディタが必要な場合は代替手段を検討すること
- **Inter / Roboto / Arial フォント禁止** — DM Sans / Noto Sans JP / JetBrains Mono のみ使用
- **`rounded-full` の一律使用禁止** — 意図的に円形にする場合（アバター、ステータスドット）のみ使用
- **すべてのブランドカラーは CSS 変数を使用** — `blue-500` などの Tailwind デフォルト色クラスは使わない
- **スペーシングは 4px グリッドのみ** — `p-5`, `p-7`, `p-10` などは使用禁止
- **Tailwind でカラーを指定する場合:** `bg-[var(--bg-base)]`, `text-[var(--text-primary)]` の形式を使用

---

## 14. Common Mistakes to Avoid

- Using raw hex/rgb colors instead of CSS variable tokens
- Using Tailwind default color classes (`blue-500`, `gray-700`, etc.) instead of CSS variables
- Creating ad-hoc typography styles instead of using the established scale
- Using Inter, Roboto, or Arial fonts
- Using `rounded-full` on non-circular elements
- Hardcoding status colors instead of using StatusBadge/StatusIcon
- Building one-off styled elements when a reusable component exists
- Adding components without updating the design guide page
- Using `shadow-md` or heavier — keep shadows minimal (xs, sm only)
- Using non-4px spacing values
- Forgetting dark mode — always use semantic CSS variable tokens
