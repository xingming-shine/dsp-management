export type ChartTooltipStatusTone = "neutral" | "success" | "warning" | "destructive"

export type ChartTooltipStatus = {
  label: string
  tone: ChartTooltipStatusTone
}

export type ChartTooltipRow = {
  label: string
  value: unknown
  marker?: string
  status?: ChartTooltipStatus
  meta?: string
}

export type ChartTooltipContent = {
  title: string
  context?: string
  rows: ChartTooltipRow[]
  summary?: ChartTooltipRow[]
  note?: string
}

export function escapeChartTooltipHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function formatChartTooltipValue(value: unknown) {
  const normalized = Array.isArray(value) ? value.at(-1) : value

  if (
    normalized === null ||
    normalized === undefined ||
    (typeof normalized === "number" && !Number.isFinite(normalized))
  ) {
    return "—"
  }

  if (typeof normalized === "number") {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(normalized)
  }

  return String(normalized)
}

function renderStatus(status: ChartTooltipStatus | undefined) {
  if (!status) {
    return '<span class="cockpit-chart-tooltip__status" aria-hidden="true"></span>'
  }

  return `<span class="cockpit-chart-tooltip__status"><span data-tone="${status.tone}">${escapeChartTooltipHtml(status.label)}</span></span>`
}

function renderRow(row: ChartTooltipRow, summary = false) {
  const marker = summary ? "" : row.marker ?? ""
  const meta = row.meta
    ? `<small class="cockpit-chart-tooltip__meta">${escapeChartTooltipHtml(row.meta)}</small>`
    : ""

  return `<div class="cockpit-chart-tooltip__row${summary ? " is-summary" : ""}">
    <span class="cockpit-chart-tooltip__marker" aria-hidden="true">${marker}</span>
    <span class="cockpit-chart-tooltip__label">${escapeChartTooltipHtml(row.label)}</span>
    <b class="cockpit-chart-tooltip__value">${escapeChartTooltipHtml(formatChartTooltipValue(row.value))}</b>
    ${renderStatus(row.status)}
    ${meta}
  </div>`
}

export function renderChartTooltip({ title, context, rows, summary, note }: ChartTooltipContent) {
  const hasStatus = [...rows, ...(summary ?? [])].some((row) => row.status)
  const contextMarkup = context
    ? `<span class="cockpit-chart-tooltip__context">${escapeChartTooltipHtml(context)}</span>`
    : ""
  const summaryMarkup = summary?.length
    ? `<div class="cockpit-chart-tooltip__summary">${summary.map((row) => renderRow(row, true)).join("")}</div>`
    : ""
  const noteMarkup = note
    ? `<p class="cockpit-chart-tooltip__note">${escapeChartTooltipHtml(note)}</p>`
    : ""

  return `<div class="cockpit-chart-tooltip${hasStatus ? " has-status" : ""}">
    <header class="cockpit-chart-tooltip__header">
      <strong>${escapeChartTooltipHtml(title)}</strong>
      ${contextMarkup}
    </header>
    <div class="cockpit-chart-tooltip__body">${rows.map((row) => renderRow(row)).join("")}</div>
    ${summaryMarkup}
    ${noteMarkup}
  </div>`
}
