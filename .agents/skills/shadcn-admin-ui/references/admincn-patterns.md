# AdminCN reference patterns

## Evidence and scope

Reference URL:
`https://shadcn-nextjs-admincn-full-navbar-layout-admin-template.vercel.app/dashboard/sales`

Captured reference:
`../assets/reference/admincn-sales-desktop.png`

The captured desktop frame shows a persistent 256px-class left navigation, a thin sticky utility header, a white base canvas, neutral bordered cards, restrained shadows, compact 14px UI copy, 10px-class radii, and mixed dashboard regions that combine KPIs, charts, summaries, forms, media, and a full-width table.

The visible site navigation exposed these first-party page families:

### Dashboards

- Sales
- Finance
- Logistics
- Productivity
- Campaign
- Analytics
- Payments
- eCommerce
- Orders

### Business applications

- Mail
- Chat
- Kanban
- Calendar
- Contact

### Supporting pages

- Pricing
- FAQ
- Form validation
- Data table
- User settings
- Layouts
- Users
- Roles and permissions

Use this inventory to choose patterns, not to reproduce every demonstration widget in one DSP screen.

## Transferable patterns

### Shell

- Keep navigation persistent and visually quiet.
- Use a compact sticky top bar for search, quick actions, theme, and profile.
- Use active navigation as a subtle neutral or semantic-primary treatment.
- Preserve clear section labels in long navigation trees.

### Dashboard

- Start with a comparable KPI strip.
- Mix compact summary cards with one or two large analysis panels.
- Use charts and tables as the dominant information, not as decoration.
- Let different dashboard routes vary in information architecture while sharing the same shell and tokens.

### Application pages

- Mail and chat use a multi-pane workspace.
- Kanban uses horizontally organized work states.
- Calendar uses date navigation and schedule density.
- Contact uses searchable entities with details and actions.
- Translate those patterns only when the DSP workflow has the same interaction model.

### Settings and permissions

- Use local navigation or tabs to partition settings.
- Keep forms focused and avoid showing every setting at once.
- Permissions need scannable grouping, explicit scope, and safe save feedback.

### Tables and forms

- Keep table toolbar, filters, export, pagination, and row actions in one coherent surface.
- Use clear validation, descriptions, and focus states.
- Prefer a single strong submit action and one quiet secondary action.

## What not to transfer

- Demo-only marketing cards and unrelated commerce widgets.
- Placeholder copy, fake brands, stock avatars, and proprietary imagery.
- Dense mixtures of every chart type on one route.
- Large-area GOFO orange treatments. Preserve the AdminCN neutral shell while using brand-orange details sparingly for DSP identity, selected states, and focus.
- Navigation destinations that do not exist in the DSP product model.

## DSP adaptation

For the data cockpit, combine the reference site's compact KPI rhythm, strong tabular presentation, neutral shell, brand-orange primary Buttons, and muted teal-led data palette with DSP concepts such as ranking, capacity, efficiency, timeliness, quality, driver performance, and delivery anomalies. Keep the most actionable operational insight above the fold and push secondary metrics lower in the page or behind tabs.
