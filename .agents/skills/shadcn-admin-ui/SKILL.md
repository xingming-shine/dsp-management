---
name: shadcn-admin-ui
description: Design, implement, and review the DSP management system's admin UI using its repository-local shadcn/ui stack and the AdminCN reference patterns. Use for DSP dashboards, data cockpit screens, navigation shells, tables, forms, settings, authentication, responsive states, UI redesigns, or visual QA in this repository.
---

# DSP shadcn admin UI

Create and review UI that belongs to this repository. Treat repository files as the source of truth and the AdminCN site as visual reference material, not as source code to copy.

## Load context

Before changing UI:

1. Read `/Users/mac/Desktop/DSP管理项目/ui-standards.md` completely.
2. Read [references/dsp-project-profile.md](references/dsp-project-profile.md).
3. Read [references/admincn-patterns.md](references/admincn-patterns.md) when the task concerns layout, hierarchy, spacing, interaction, or a page recipe.
4. Inspect the target route and nearby feature components.
5. Run `pnpm shadcn info --json` from the repository root when project configuration may have changed.
6. Use the repository-local `shadcn` Skill for component discovery, documentation, installation, or updates.

Do not read or import UI specifications, components, CSS, configuration, or Skills from other projects.

## Decide the page recipe

Map the request to one primary recipe before composing UI:

| Product surface | Default recipe |
| --- | --- |
| Data cockpit / dashboard | Page header + compact filters + KPI strip + one dominant analysis surface + supporting detail |
| Operational list | Page header + filter toolbar + single table surface + pagination |
| Entity detail | Summary header + status/actions + tabs or grouped sections |
| Settings | Compact local navigation + one focused form section at a time |
| Login | Quiet split or centered composition with one dominant form |
| Empty / loading / error | Project `Empty`, `Skeleton`, `Alert`, or toast primitives |

Prefer the smallest recipe that completes the user's task. Do not turn every section or row into a card.

## Visual system

- Use a cool light-gray `#f5f6f9` application canvas and header with a white sidebar, cards, tables, popovers, and dialogs. Use near-black for strong text, GOFO brand orange `#ff6703` for primary buttons, brand identity, hover, selection indicators, and focus, and muted teal for data emphasis and the leading chart series.
- Use the fixed six-color chart sequence through semantic tokens: teal `#5bc49f`, blue `#60acfc`, cyan `#32d3eb`, amber `#feb64d`, violet `#9287e7`, and coral `#ff7c7c`. Keep teal as the leading analytical series, preserve series identity across filters and routes, and reserve `success`, `warning`, and `destructive` for business semantics. Coral is categorical only when it cannot be mistaken for an error.
- Use GOFO orange only through semantic tokens in `src/app/globals.css`; solid orange is allowed for the logo detail, active top-level navigation indicator, and the single primary button in a page or modal. Use `brand-hover` for a 6% translucent hover surface with neutral text, `brand-selected` with `brand-ink` for persistent selection, and `ring` for visible focus. Do not use orange as a table-header, status, or error color.
- Preserve `--radius: 0.375rem` unless `ui-standards.md` changes.
- Keep structural borders, separators, and table grid lines at 1px; never combine a visible structural border with a static shadow on the same surface. Use borders without shadows for cards and controls, and shadows without border rings for floating overlays. Focus and validation rings are transient interaction feedback and are exempt. Use a 2px active Tabs indicator, a 2px active top-level navigation indicator, and a 1px `focus-visible` ring. Do not use heavier borders to communicate selection.
- Use the shared PingFang-first font stack for UI copy, headings, English, numbers, and code through the existing font tokens. Preserve `font-heading` and `font-mono` only as semantic aliases, and use `tabular-nums` where numeric alignment matters.
- Keep body text at 14px and weight 400 by default; use 16px for mobile form controls.
- Separate sections with spacing and alignment first, then dividers or subtle tints, then borders. Use shadows sparingly.
- Prefer 16px gaps inside dense dashboard regions and 24px rhythm between major page regions.
- Use a stable left navigation, a sticky 64px header, and a readable content width. Dense analysis routes may use the full available width.
- Avoid decorative gradients, glass effects, excessive colored cards, and heavy elevation unless the user explicitly requests them.

## Composition rules

- Reuse primitives from `src/components/ui`; place business components in feature or layout folders.
- Maintain theme tokens and global styles only in `src/app/globals.css`.
- Use semantic Tailwind tokens; do not hardcode brand colors in components.
- Use `gap-*`, never `space-x-*` or `space-y-*`.
- Use `size-*` when width and height are equal.
- Use `cn()` for conditional classes.
- Keep component `className` focused on layout and responsive composition.
- Use full Card structure when a card is semantically justified.
- Keep lists and tables as one grouped surface with lightweight row separation.
- Keep one clear primary action per page or modal.

## Forms and interaction

- Build forms with `FieldGroup`, `Field`, and the matching shadcn controls.
- Put option sets of two to seven choices in `ToggleGroup` when appropriate.
- Put `SelectItem` inside `SelectGroup` and menu items inside their group.
- Provide accessible titles for Dialog, Sheet, and Drawer.
- Give every icon-only action an accessible label.
- Provide Avatar fallback content.
- Preserve visible focus states and keyboard operation with the project 1px brand-orange focus ring.
- Use the repository Tabs primitive with 14px medium labels, a 44px horizontal list height, 16px trigger side padding, and the 6px base list radius. Keep both variants and use the `brand` token for selected and hover text in both; hover also uses the `brand-hover` surface. `default` uses the selected surface and may use shadow but no visible border; `line` uses a transparent surface, 6px item gap, and a 2px indicator with no border or shadow.
- Keep Button labels at 13px and weight 400. Give the default primary Button a solid `brand` background and text Buttons brand-colored copy with a `brand-hover` surface on hover. Build icon-only actions with the Button `icon-xs`, `icon-sm`, `icon`, or `icon-lg` sizes: use a 1px border, no shadow, a brand-colored icon, and an explicit `aria-label`; pair unfamiliar actions with the project Tooltip. Preserve destructive, success, and warning semantics.
- Use `data-invalid` on `Field` and `aria-invalid` on the control.
- Use `sonner` for toast feedback and `Skeleton` for loading states.
- Make filters, tabs, menus, pagination, and the primary action visibly functional with realistic data.
- Format displayed dates in the US order: `MM/DD/YYYY` for dates and `MM/YYYY` for months. Use 24-hour time: `MM/DD/YYYY HH:mm` for date-time values and `HH:mm:ss` for second-precision live timestamps, without AM/PM. Default to `America/New_York`, honor the active user timezone, keep transport and form values in ISO 8601, and route presentation through a shared `Intl.DateTimeFormat("en-US")` formatter with `hourCycle: "h23"` instead of hand-built strings.

## Dashboard guidance

- Lead with four to six comparable KPIs, not a wall of unrelated widgets.
- Give the primary chart or analysis view the largest area.
- Use supporting panels for ranking, anomalies, breakdowns, or recent activity.
- Use no more than six standard chart colors; map the leading series to teal through `chart-1`. If more than six categories are unavoidable, merge low-value categories first or derive registered light/dark variants from the standard colors. Use about 10% opacity for area fills and no more than four overlapping area series. Keep brand orange out of analytical series even though it is used for the primary Button.
- Keep chart legends, axes, tooltips, and table numbers readable at normal zoom.
- Use tabular numerals for metrics.
- Do not nest KPI cards inside a large decorative card unless the grouping has a clear product meaning.

## Tables and data-heavy pages

- Keep filters and actions close to the table they affect.
- Use `Table`, `Badge`, `DropdownMenu`, `Checkbox`, pagination, and empty states from the project primitives.
- Keep table text at 12px and table header and body rows at a relaxed 48px height.
- Give every table its own semantic border and project radius; use a neutral tinted header and lightweight horizontal dividers without zebra striping by default.
- Use the default `Table` without vertical dividers for ordinary lists. Use `Table variant="grid"` for field-dense metric comparisons that need vertical column separation.
- Keep headers concise and align numeric values consistently.
- Keep row actions discoverable without dominating the row.
- On smaller screens, preserve critical columns and move secondary detail to a drawer or detail route instead of shrinking text.

## Responsive behavior

- Check a desktop viewport and a 390 x 844 mobile viewport for meaningful UI changes.
- Collapse the sidebar to a Sheet or drawer on mobile.
- Stack KPI cards and major regions without losing priority order.
- Keep primary actions reachable and do not hide required filters without an alternate control.
- Avoid horizontal page scrolling; allow deliberate table scrolling only when necessary.

## shadcn workflow

When adding or updating a primitive:

1. Inspect installed components and run `pnpm shadcn search` when discovery is needed.
2. Run `pnpm shadcn docs <component>` and inspect the returned official documentation.
3. Run `pnpm shadcn add <component> --dry-run` before creating files.
4. Inspect every generated file and reconcile it with the repository's Radix Nova configuration.
5. Do not use `--overwrite` without explicit user approval.

## Visual QA

Before handoff:

1. Compare the rendered target against the selected visual reference at the same viewport.
2. Check hierarchy, density, padding, type scale, borders, radius, chart color, and sticky behavior.
3. Test the primary interaction path and keyboard focus.
4. Check loading, empty, error, disabled, and validation states when the route exposes them.
5. Run `pnpm lint` after UI changes.
6. Run `pnpm build` before final delivery.

Do not claim visual fidelity from a successful build alone.

## Review output

For UI reviews, report actionable findings with file and line evidence. Prioritize:

1. Broken hierarchy or workflow
2. Accessibility and interaction failures
3. Responsive breakage
4. Token or component-system violations
5. Low-impact polish

## Boundaries

- Do not copy protected source code or hotlink assets from the reference site.
- Do not replace DSP terminology or domain workflows with generic template content.
- Do not change routing, data contracts, or permissions solely to match a visual reference.
- Do not duplicate this Skill into user-level or global Skill directories.
