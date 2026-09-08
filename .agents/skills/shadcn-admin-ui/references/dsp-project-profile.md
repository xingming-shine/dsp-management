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
- Charts: fixed semantic sequence `#5bc49f`, `#60acfc`, `#32d3eb`, `#feb64d`, `#9287e7`, `#ff7c7c`; teal leads analytical series, while success, warning, and destructive meanings override categorical order. Brand orange is excluded from the default chart palette.
- Fonts: the `font-sans`, `font-heading`, and `font-mono` tokens all use a PingFang-first system font stack for Chinese, English, numbers, headings, and code. Body copy uses the shared 400 weight; component labels and other short emphasis may use 500, while Buttons remain 400. Numeric alignment uses `tabular-nums` rather than a separate monospace family.
- Date and time: default display uses US date order (`MM/DD/YYYY`, `MM/YYYY`) with 24-hour time (`MM/DD/YYYY HH:mm`, `HH:mm:ss`) and `America/New_York` as the default timezone. Storage, API, sorting, and native date-input values remain ISO 8601 and presentation is handled by a shared formatter.
- Table filter toolbar: list pages place four high-frequency conditions in the first desktop row, then a separate action row with export and advanced filters on the left and Query followed by Reset on the right. Low-frequency fields stay under an expandable advanced-filter area. Active-condition chips use 12px regular text, and filters, table, result count, and pagination share one bordered, shadowless data region.

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
