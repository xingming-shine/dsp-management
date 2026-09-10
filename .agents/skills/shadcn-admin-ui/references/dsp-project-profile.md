# DSP project UI profile

## Repository facts

- Framework: Next.js App Router 16, React 19, TypeScript, RSC enabled.
- Styling: Tailwind CSS v4.
- Components: repository-owned shadcn/ui, `radix-nova`, Radix base.
- Component alias: `@/components/ui`.
- Global CSS: `src/app/globals.css`.
- Icon library: Lucide.
- Charts: ECharts.
- Theme: Neutral semantic tokens with light and dark modes.
- Brand identity: GOFO brand orange `#ff6703`, used for the single primary Button, logo detail, neutral-control hover, selection indicators, and visible keyboard focus. Button labels use 13px regular text. Icon-only Buttons use the shared icon size variants, a 1px border, no shadow, a brand-orange icon, and an accessible name. Hover uses 6% translucent orange with neutral text; persistent selection uses `#fff4ed` with brand-orange text in light mode.
- Radius: `0.375rem` (6px), with the existing proportional `sm` through `4xl` token scale.
- Line weights: 1px structural borders and separators, 2px Tabs and active top-level navigation indicators, and a 1px keyboard focus ring. A surface never combines a visible structural border with a static shadow; bordered cards and controls are shadowless, while elevated overlays use shadow without a border ring.
- Tabs: 14px medium labels, 44px horizontal list height, 16px trigger side padding, 6px base list radius, 6px gap for the `line` variant, brand-orange selected and hover text in both variants, and a 2px active indicator. `default` and `line` variants are both retained.
- Dialogs and sheets: use Dialog for short confirmations and forms, Sheet for long contextual detail workflows, and AlertDialog semantics for irreversible actions. Dialog widths are limited to 384px, 512px, 768px, and 896px, with at least 16px viewport clearance and internal overflow. Modal Header, Body, and Footer use 30px horizontal page padding; Header top and Body bottom also use 30px. Footer uses 18px vertical padding and a 1px top separator. Dialog uses an 8.4px radius, a 16px medium title, 14px regular body text, a 10% black overlay with 2px blur, and a 1px outline without shadow; Sheet uses shadow without a structural border. Footer Buttons remain content-width and right-aligned on every viewport, fixed at 36px high with 13px regular text and 16px side padding. Modal form controls inherit the global Field, Input, and Select rules. Every modal surface has an accessible title, explicit dismiss behavior, managed focus, and protection against losing unsaved or in-progress work.
- Tooltips: basic Tooltip is reserved for icons, truncated text, shortcuts, and brief non-critical explanations, using 12px regular text, 280px maximum width, 10px by 8px padding, 6px radius, an inverse surface, 300ms pointer delay, and 8px trigger offset. Complex read-only Tooltip may show a 13px medium title, one semantic status, and 3–8 structured fields within 360px; interactive or scrollable content upgrades to Popover, HoverCard, Sheet, or a detail page. ECharts Tooltip uses a shared formatter, a shadowed borderless popover surface, 12px padding, 260px maximum width, axis trigger for multi-series trends, full US-order 24-hour timestamps, compact 22px rows, tabular values with units, and a fixed 38px gap between each series label and its value. Tooltip content never replaces visible critical information or accessible alternatives.
- Charts: fixed semantic sequence `#5bc49f`, `#60acfc`, `#32d3eb`, `#feb64d`, `#9287e7`, `#ff7c7c`; teal leads analytical series, while success, warning, and destructive meanings override categorical order. Brand orange is excluded from the default chart palette.
- Fonts: the `font-sans`, `font-heading`, and `font-mono` tokens all use a PingFang-first system font stack for Chinese, English, numbers, headings, and code. Body copy uses the shared 400 weight; component labels and other short emphasis may use 500, while Buttons remain 400. Numeric alignment uses `tabular-nums` rather than a separate monospace family.
- Date and time: default display uses US date order (`MM/DD/YYYY`, `MM/YYYY`) with 24-hour time (`MM/DD/YYYY HH:mm`, `HH:mm:ss`) and `America/New_York` as the default timezone. Storage, API, sorting, and native date-input values remain ISO 8601 and presentation is handled by a shared formatter.
- Table filter toolbar: desktop rows use up to four equal-width conditions. Visible field labels use 14px medium text with no inline-start inset, aligning the label text with the control's outer border; `sr-only` labels remain unchanged. With one to three conditions, Query followed by Reset occupies the remaining rightmost column on the same row; with four or more conditions, those actions move to a separate right-aligned row. Export and advanced-filter actions stay on the left only when that independent action row exists. Narrow screens and fixed narrow panes stack the fields and keep Query then Reset right-aligned below them. Low-frequency fields stay under an expandable advanced-filter area. Do not duplicate active conditions below the toolbar; removable multi-select values stay inside their fields. Filters, table, result count, and pagination share one bordered, shadowless data region.
- Table row actions: whenever a table exposes row actions, keep the action column fixed at the right edge of the table viewport, with the header and body cells fixed together. Use an opaque card surface and a 1px inline-start separator without shadow; synchronize its background with row hover and selection states. Reserve the column's actual width so it never covers the final data column, and centralize sticky positioning, layering, and backgrounds in the project Table primitive instead of business pages.
- Table alignment: headers and body cells in the same column always share alignment. Left-align all business data, including text, identifiers, statuses, categories, counts, amounts, ratios, dates, and times; identifiers such as waybill numbers, task numbers, and postal codes remain text. Keep numeric and date-time values tabular, with units attached to values and placeholders following the column alignment. Center only checkboxes, booleans, icon-only indicators, and actual action columns. Sort labels and icons follow the column alignment, and multiline notes may use top alignment while retaining a 48px minimum row height.
- Selection controls: use project Checkbox for independent choices, DropdownMenuCheckboxItem for query-field multi-selects, and RadioGroup for mutually exclusive choices. Query-field multi-select menus match their 36px-high trigger width; multi-select and single Select triggers use the same 16px muted-foreground ChevronDown, with sizing owned by the reusable trigger. Selected values use removable, borderless neutral tags with 6px radius, 14px regular text, and a brand-orange remove icon. A meaningful 3+ item group exposes a first-item Select All control with checked and indeterminate states. A table header Checkbox selects only the current page; do not expose cross-page or all-results selection.

## Existing product surfaces

- Application shell: `src/components/layout/app-shell.tsx`.
- Header: `src/components/layout/app-header.tsx`.
- Sidebar: `src/components/layout/app-sidebar.tsx`.
- Navigation model: `src/config/navigation.ts`.
- Data cockpit: `src/features/data-cockpit` and `/data-cockpit`.
- User preferences: `/my/profile`, `/my/password`, `/my/date-format`.
- Downloads: `/basic/downloads`.
- Login: `/login`.

## Product intent

The DSP system supports delivery-service-provider operations. Its current navigation anticipates real-time dashboards, operational search and route workflows, service quality, team management, reports, finance, and administration. UI should feel operational, fast to scan, and credible for repeated daily use.

## Repository constraints

- Treat `ui-standards.md`, `components.json`, `src/app/globals.css`, `src/components/ui`, and `.agents/skills/shadcn` as local sources of truth.
- Do not import UI code or rules from other projects.
- Keep business components outside `src/components/ui`.
- Preview shadcn additions with `--dry-run`.
- Run lint after UI changes and build before delivery.

## Redesign palette

- Base the visual system on a cool light-gray `#f5f6f9` application canvas and header, a white sidebar and white content surfaces, `#e4e8f0` dividers, near-black text, and brand-orange primary Buttons.
- Use GOFO orange for the single primary Button, brand identity, neutral-control hover, selected interaction indicators, and focus. Use muted teal for data emphasis, the leading chart series, and comparative states.
- Use amber, soft blue, and muted violet for secondary series and categorical differentiation.
- Use green and red only for operational status and delta semantics.
- Keep GOFO orange out of KPIs, status semantics, and the leading chart series. Apply it to the default primary Button, system logo detail, active top-level navigation indicator, selected states, and focus through semantic tokens maintained centrally in `src/app/globals.css`; do not hardcode palette values in business components.
