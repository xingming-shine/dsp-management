import type { EChartsOption, SeriesOption } from "echarts"

import { formatChartTooltipValue, renderChartTooltip } from "./chart-tooltip"

export const PROJECT_CHART = {
  lineWidth: 2,
  pointSize: 6,
  pointHoverScale: 10 / 6,
  barRadius: 4,
  barMaxWidth: 26,
  rankingBarMaxWidth: 20,
  denseBarMaxWidth: 12,
  denseBarGap: "20%",
  denseCategoryGap: "35%",
  trendPaddingRatio: 0.12,
  trendSplitNumber: 5,
  percentMinimumSpan: 5,
} as const

export const CHART_TOOLTIP_EXTRA_CSS = "max-width:360px;border-radius:6px;box-shadow:0 8px 24px rgb(0 0 0 / 12%)"

type TooltipParam = {
  axisValueLabel?: string
  name?: string
  seriesName?: string
  value?: unknown
  marker?: string
  percent?: number
}

function asTooltipParams(parameters: unknown) {
  return (Array.isArray(parameters) ? parameters : [parameters]) as TooltipParam[]
}

function axisTooltipFormatter(parameters: unknown) {
  const items = asTooltipParams(parameters)

  return renderChartTooltip({
    title: String(items[0]?.axisValueLabel ?? items[0]?.name ?? ""),
    rows: items.map((item) => ({
      marker: item.marker,
      label: item.seriesName ?? "",
      value: formatChartTooltipValue(item.value),
    })),
  })
}

export function chartLegend(position: "top" | "bottom" = "top", compact = false) {
  return {
    [position]: 0,
    left: "center",
    type: "scroll" as const,
    itemWidth: compact ? 10 : 14,
    itemHeight: 8,
    itemGap: compact ? 12 : 16,
    textStyle: { fontSize: 12 },
  }
}

export function chartGrid(dualAxis = false) {
  return {
    top: 60,
    right: dualAxis ? 24 : 16,
    bottom: 56,
    left: dualAxis ? 24 : 16,
    containLabel: true,
  }
}

const axisLabel = { fontSize: 12, margin: 8, hideOverlap: true }

type ChartValue = number | null | undefined

function finiteValues(values: ChartValue[]) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
}

function niceStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1

  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10

  return niceFraction * 10 ** exponent
}

function roundAxisValue(value: number) {
  return Number(value.toPrecision(12))
}

/**
 * Expands a line-only value axis around the observed data so small changes remain
 * readable. Positive-only metrics never cross below zero, percentages stay within
 * 0–100, and mixed-sign data uses a symmetric zero-centred range.
 */
export function chartTrendExtent(values: ChartValue[], percent = false) {
  const data = finiteValues(values)
  if (!data.length) return { scale: true, splitNumber: PROJECT_CHART.trendSplitNumber }

  const dataMin = Math.min(...data)
  const dataMax = Math.max(...data)

  if (dataMin < 0 && dataMax > 0) {
    const paddedLimit = Math.max(Math.abs(dataMin), Math.abs(dataMax)) * (1 + PROJECT_CHART.trendPaddingRatio)
    const step = niceStep((paddedLimit * 2) / PROJECT_CHART.trendSplitNumber)
    const limit = Math.ceil(paddedLimit / step) * step

    return {
      min: roundAxisValue(-limit),
      max: roundAxisValue(limit),
      scale: true,
      splitNumber: PROJECT_CHART.trendSplitNumber,
    }
  }

  const center = (dataMin + dataMax) / 2
  const minimumSpan = percent
    ? PROJECT_CHART.percentMinimumSpan
    : Math.max(Math.abs(center) * 0.1, 1)
  const visibleSpan = Math.max(dataMax - dataMin, minimumSpan)
  const baseMin = dataMax === dataMin ? center - visibleSpan / 2 : dataMin
  const baseMax = dataMax === dataMin ? center + visibleSpan / 2 : dataMax
  const padding = visibleSpan * PROJECT_CHART.trendPaddingRatio
  let paddedMin = baseMin - padding
  let paddedMax = baseMax + padding

  if (percent) {
    paddedMin = Math.max(0, paddedMin)
    paddedMax = Math.min(100, paddedMax)
  } else if (dataMin >= 0) {
    paddedMin = Math.max(0, paddedMin)
  }

  const step = niceStep((paddedMax - paddedMin) / PROJECT_CHART.trendSplitNumber)
  let min = Math.floor(paddedMin / step) * step
  let max = Math.ceil(paddedMax / step) * step

  if (percent) {
    min = Math.max(0, min)
    max = Math.min(100, max)
    if (max - min < PROJECT_CHART.percentMinimumSpan) {
      if (max === 100) min = Math.max(0, 100 - PROJECT_CHART.percentMinimumSpan)
      else max = Math.min(100, min + PROJECT_CHART.percentMinimumSpan)
    }
  } else if (dataMin >= 0) {
    min = Math.max(0, min)
  }

  return {
    min: roundAxisValue(min),
    max: roundAxisValue(max),
    scale: true,
    splitNumber: PROJECT_CHART.trendSplitNumber,
  }
}

/** Keeps bars honest: positive bars start at zero; diverging bars use a symmetric axis. */
export function chartBarExtent(values: ChartValue[]) {
  const data = finiteValues(values)
  if (!data.length) return { min: 0, splitNumber: PROJECT_CHART.trendSplitNumber }

  const dataMin = Math.min(...data)
  const dataMax = Math.max(...data)

  if (dataMin < 0 && dataMax > 0) {
    const paddedLimit = Math.max(Math.abs(dataMin), Math.abs(dataMax)) * (1 + PROJECT_CHART.trendPaddingRatio)
    const step = niceStep((paddedLimit * 2) / PROJECT_CHART.trendSplitNumber)
    const limit = Math.ceil(paddedLimit / step) * step

    return {
      min: roundAxisValue(-limit),
      max: roundAxisValue(limit),
      splitNumber: PROJECT_CHART.trendSplitNumber,
    }
  }

  return dataMax <= 0
    ? { max: 0, splitNumber: PROJECT_CHART.trendSplitNumber }
    : { min: 0, splitNumber: PROJECT_CHART.trendSplitNumber }
}

function isDenseGroupedBars(labels: string[], series: Array<{ stack?: string }>) {
  const groups = new Set(series.map((item, index) => item.stack ?? `series-${index}`))
  return labels.length >= 28 && groups.size >= 2
}

export function lineOption(
  labels: string[],
  series: Array<{ name: string; data: number[]; yAxisIndex?: number }>,
  options?: { inverse?: boolean; percent?: boolean; target?: number }
): EChartsOption {
  const trendValues = [
    ...series.flatMap((item) => item.data),
    ...(options?.target === undefined ? [] : [options.target]),
  ]
  const chartSeries: SeriesOption[] = series.map((item, index) => ({
    name: item.name,
    type: "line",
    smooth: true,
    symbol: "circle",
    symbolSize: PROJECT_CHART.pointSize,
    showSymbol: labels.length <= 30,
    emphasis: { scale: PROJECT_CHART.pointHoverScale },
    lineStyle: { width: PROJECT_CHART.lineWidth },
    yAxisIndex: item.yAxisIndex,
    data: item.data,
    markLine: index === 0 && options?.target !== undefined ? {
      silent: true,
      symbol: "none",
      data: [{ yAxis: options.target, name: `目标${options.target}%` }],
      lineStyle: { type: "dashed", width: 1 },
    } : undefined,
  }))

  return {
    aria: { enabled: true },
    tooltip: { trigger: "axis", confine: true, formatter: axisTooltipFormatter },
    legend: chartLegend("top"),
    grid: chartGrid(series.some((item) => item.yAxisIndex === 1)),
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLabel,
      nameGap: 12,
    },
    yAxis: {
      type: "value",
      ...chartTrendExtent(trendValues, options?.percent),
      inverse: options?.inverse,
      name: options?.percent ? "%\n局部刻度" : "局部刻度",
      nameTextStyle: { align: "left", lineHeight: 16 },
      axisLabel: options?.percent ? { ...axisLabel, formatter: "{value}%" } : axisLabel,
      nameGap: 12,
    },
    series: chartSeries,
  }
}

export function barOption(
  labels: string[],
  series: Array<{ name: string; data: number[]; stack?: string }>
): EChartsOption {
  const dense = isDenseGroupedBars(labels, series)
  const topStackSeries = new Map<string, number>()

  series.forEach((item, index) => {
    if (item.stack) topStackSeries.set(item.stack, index)
  })

  return {
    aria: { enabled: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true, formatter: axisTooltipFormatter },
    legend: chartLegend("top"),
    grid: chartGrid(),
    xAxis: { type: "category", data: labels, axisLabel, nameGap: 12 },
    yAxis: {
      type: "value",
      ...chartBarExtent(series.flatMap((item) => item.data)),
      axisLabel,
      nameGap: 12,
    },
    series: series.map((item, index) => ({
      name: item.name,
      type: "bar",
      stack: item.stack,
      barMaxWidth: dense ? PROJECT_CHART.denseBarMaxWidth : PROJECT_CHART.barMaxWidth,
      barGap: dense ? PROJECT_CHART.denseBarGap : undefined,
      barCategoryGap: dense ? PROJECT_CHART.denseCategoryGap : undefined,
      itemStyle: {
        borderRadius: !item.stack || topStackSeries.get(item.stack) === index
          ? [PROJECT_CHART.barRadius, PROJECT_CHART.barRadius, 0, 0]
          : 0,
      },
      data: item.data,
    })),
  }
}

export function horizontalBarOption(
  labels: string[],
  values: number[],
  name: string
): EChartsOption {
  return {
    aria: { enabled: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true, formatter: axisTooltipFormatter },
    grid: { left: 16, right: 16, top: 16, bottom: 28, containLabel: true },
    xAxis: { type: "value", ...chartBarExtent(values), axisLabel, nameGap: 12 },
    yAxis: { type: "category", data: labels, inverse: true, axisLabel, nameGap: 12 },
    series: [{
      name,
      type: "bar",
      barMaxWidth: PROJECT_CHART.rankingBarMaxWidth,
      itemStyle: { borderRadius: [0, 2, 2, 0] },
      data: values,
    }],
  }
}

export function pieOption(
  data: Array<{ name: string; value: number }>,
  centerLabel?: string
): EChartsOption {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return {
    aria: { enabled: true },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (parameters: unknown) => {
        const item = asTooltipParams(parameters)[0]
        const percent = Number.isFinite(item?.percent) ? `${item.percent}%` : "—"

        return renderChartTooltip({
          title: item?.name ?? "",
          rows: [{
            marker: item?.marker,
            label: centerLabel ?? "数量 / 占比",
            value: `${formatChartTooltipValue(item?.value)} · ${percent}`,
          }],
        })
      },
    },
    legend: chartLegend("bottom", true),
    graphic: centerLabel
      ? [
          {
            type: "text",
            left: "center",
            top: "42%",
            style: {
              text: `${total}\n${centerLabel}`,
              align: "center",
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 22,
            },
          },
        ]
      : undefined,
    series: [
      {
        type: "pie",
        radius: centerLabel ? ["48%", "68%"] : ["0%", "68%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        data,
        label: { formatter: "{b}\n{d}%", fontSize: 12 },
      },
    ],
  }
}

export function radarOption(
  indicators: Array<{ name: string; max: number }>,
  series: Array<{ name: string; values: number[] }>
): EChartsOption {
  return {
    aria: { enabled: true },
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (parameters: unknown) => {
        const item = asTooltipParams(parameters)[0]
        const values = Array.isArray(item?.value) ? item.value : []

        return renderChartTooltip({
          title: item?.name ?? "",
          rows: indicators.map((indicator, index) => ({
            label: indicator.name,
            value: formatChartTooltipValue(values[index]),
          })),
        })
      },
    },
    legend: chartLegend("bottom", true),
    radar: {
      center: ["50%", "46%"],
      radius: "62%",
      indicator: indicators,
      axisName: { fontSize: 12 },
    },
    series: [
      {
        type: "radar",
        data: series.map((item) => ({
          name: item.name,
          value: item.values,
          areaStyle: { opacity: 0.1 },
        })),
      },
    ],
  }
}
