"use client"

import { useEffect, useRef } from "react"
import * as echarts from "echarts"
import type { EChartsOption, ECElementEvent } from "echarts"

import { cn } from "@/lib/utils"
import { CHART_TOOLTIP_EXTRA_CSS, PROJECT_CHART } from "../chart-options"

function cssToken(styles: CSSStyleDeclaration, token: string) {
  return styles.getPropertyValue(token).trim()
}

function createColorResolver(styles: CSSStyleDeclaration) {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  const cache = new Map<string, string>()

  return (token: string) => {
    const cached = cache.get(token)
    if (cached) return cached

    const color = cssToken(styles, token)
    if (!context || !color) return color

    context.clearRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue, alphaByte] = context.getImageData(0, 0, 1, 1).data
    const alpha = Number((alphaByte / 255).toFixed(3))
    const resolved = alpha === 1
      ? `rgb(${red}, ${green}, ${blue})`
      : `rgba(${red}, ${green}, ${blue}, ${alpha})`

    cache.set(token, resolved)
    return resolved
  }
}

function createProjectTheme(styles: CSSStyleDeclaration, resolveColor: (token: string) => string) {
  const foreground = resolveColor("--foreground")
  const muted = resolveColor("--muted-foreground")
  const mutedSurface = resolveColor("--muted")
  const border = resolveColor("--border")
  const background = resolveColor("--card")

  return {
    color: [
      resolveColor("--chart-1"),
      resolveColor("--chart-2"),
      resolveColor("--chart-3"),
      resolveColor("--chart-4"),
      resolveColor("--chart-5"),
      resolveColor("--chart-6"),
    ],
    backgroundColor: "transparent",
    textStyle: { color: muted, fontFamily: cssToken(styles, "--font-sans"), fontSize: 12, fontWeight: 400 },
    title: { textStyle: { color: foreground } },
    legend: {
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 16,
      textStyle: { color: muted, fontSize: 12 },
    },
    tooltip: {
      backgroundColor: background,
      borderWidth: 0,
      padding: 12,
      extraCssText: CHART_TOOLTIP_EXTRA_CSS,
      textStyle: { color: foreground, fontSize: 12, fontWeight: 400 },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: border, width: 1 } },
      axisTick: { lineStyle: { color: border, width: 1 } },
      axisLabel: { color: muted, fontSize: 12, margin: 8 },
      splitLine: { lineStyle: { color: border, width: 1 } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: border, width: 1 } },
      axisTick: { lineStyle: { color: border, width: 1 } },
      axisLabel: { color: muted, fontSize: 12, margin: 8 },
      splitLine: { lineStyle: { color: border, width: 1 } },
    },
    radar: {
      axisName: { color: muted },
      splitLine: { lineStyle: { color: border } },
      splitArea: { areaStyle: { color: ["transparent"] } },
      axisLine: { lineStyle: { color: border } },
    },
    dataZoom: {
      borderColor: "transparent",
      borderRadius: 4,
      backgroundColor: mutedSurface,
      fillerColor: muted,
      handleColor: "transparent",
      moveHandleColor: "transparent",
      textStyle: { color: muted, fontSize: 12 },
    },
  }
}

export type ChartHeight = "compact" | "standard" | "primary" | "detail"
export type CategoryLabelMode = "sequence" | "entity"

const chartHeightClasses: Record<ChartHeight, string> = {
  compact: "h-56 min-h-56",
  standard: "h-72 min-h-72",
  primary: "h-[22.5rem] min-h-[22.5rem]",
  detail: "h-[25rem] min-h-[25rem]",
}

type ResponsiveAxis = { type?: string; data?: unknown[]; axisLabel?: Record<string, unknown> }
type ResponsiveSeries = {
  type?: string
  stack?: string
  barMaxWidth?: number
  barGap?: string
  barCategoryGap?: string
}
type ResponsiveGrid = { left?: number | string; right?: number | string; bottom?: number | string }
type RuntimeDataZoom = { start?: number; end?: number }

function first<T>(value: T | T[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function numericInset(value: number | string | undefined, fallback: number) {
  return typeof value === "number" ? value : fallback
}

function interpolate(value: number, start: number, end: number, from: number, to: number) {
  if (start === end) return to
  const progress = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return from + (to - from) * progress
}

function entityBarSpacing(visibleCategories: number) {
  let categoryGap: number
  let barGap: number

  if (visibleCategories <= 5) {
    categoryGap = interpolate(visibleCategories, 1, 5, 48, 40)
    barGap = interpolate(visibleCategories, 1, 5, 20, 18)
  } else if (visibleCategories <= 10) {
    categoryGap = interpolate(visibleCategories, 6, 10, 36, 28)
    barGap = interpolate(visibleCategories, 6, 10, 18, 14)
  } else if (visibleCategories <= 18) {
    categoryGap = interpolate(visibleCategories, 11, 18, 28, 18)
    barGap = interpolate(visibleCategories, 11, 18, 16, 12)
  } else {
    categoryGap = interpolate(visibleCategories, 19, 24, 20, 16)
    barGap = interpolate(visibleCategories, 19, 24, 12, 10)
  }

  return {
    barGap: `${Number(barGap.toFixed(1))}%`,
    barCategoryGap: `${Number(categoryGap.toFixed(1))}%`,
  }
}

function entityCategoryLayout(categories: unknown[], fontFamily: string, barGroups: number) {
  const fallbackLabelWidth = 48
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  let labelWidth = fallbackLabelWidth

  if (context && categories.length) {
    context.font = `400 12px ${fontFamily || "sans-serif"}`
    const widths = categories
      .map((category) => context.measureText(String(category ?? "")).width)
      .sort((left, right) => left - right)
    const percentileIndex = Math.max(0, Math.ceil(widths.length * 0.9) - 1)
    labelWidth = Math.min(
      PROJECT_CHART.entityAxisMaxLabelWidth,
      Math.max(1, Math.ceil(widths[percentileIndex] ?? fallbackLabelWidth))
    )
  }

  const rotationRadians = PROJECT_CHART.entityAxisLabelRotation * Math.PI / 180
  const projectedLabelWidth = Math.ceil(
    labelWidth * Math.cos(rotationRadians)
    + PROJECT_CHART.entityAxisLabelLineHeight * Math.sin(rotationRadians)
    + PROJECT_CHART.entityAxisLabelSafetyGap
  )
  const minimumBarGroupWidth = barGroups
    ? PROJECT_CHART.entityBarMinWidth
      * (barGroups + PROJECT_CHART.entityBarGapMinPercent / 100 * Math.max(0, barGroups - 1))
      / (1 - PROJECT_CHART.entityCategoryGapMinPercent / 100)
    : 0
  const slotWidth = Math.ceil(Math.max(projectedLabelWidth, minimumBarGroupWidth))

  return { slotWidth, labelWidth }
}

function withResponsiveCategoryZoom(
  option: EChartsOption,
  containerWidth: number,
  scrollable: boolean,
  categoryLabelMode: CategoryLabelMode,
  fontFamily: string,
  currentZoomStart = 0
): EChartsOption {
  const originalXAxis = option.xAxis as ResponsiveAxis | ResponsiveAxis[] | undefined
  const xAxis = first(originalXAxis)
  const categoryData = xAxis?.type === "category" && Array.isArray(xAxis.data) ? xAxis.data : []
  const categories = categoryData.length
  const originalSeries = option.series
  const allSeries = (Array.isArray(originalSeries) ? originalSeries : originalSeries ? [originalSeries] : []) as ResponsiveSeries[]
  const bars = allSeries.filter((item) => item?.type === "bar")
  const groups = new Set(bars.map((item, index) => item.stack ?? `series-${index}`)).size
  const grid = first(option.grid as ResponsiveGrid | ResponsiveGrid[] | undefined)
  const plotWidth = Math.max(0, containerWidth - numericInset(grid?.left, 60) - numericInset(grid?.right, 24))
  const entityLayout = entityCategoryLayout(categoryData, fontFamily, groups)
  const maximumEntityCategories = categories
    ? Math.min(categories, Math.max(1, Math.floor(plotWidth / entityLayout.slotWidth)))
    : 0
  const entityZoomRequired = categoryLabelMode === "entity" && categories > maximumEntityCategories
  const visibleEntityCategories = entityZoomRequired ? maximumEntityCategories : categories
  const entitySpacing = entityBarSpacing(Math.max(1, visibleEntityCategories))
  const responsiveSeries = categoryLabelMode === "entity" && bars.length
    ? allSeries.map((item) => item?.type === "bar"
      ? {
          ...item,
          barMaxWidth: PROJECT_CHART.barMaxWidth,
          barGap: entitySpacing.barGap,
          barCategoryGap: entitySpacing.barCategoryGap,
        }
      : item)
    : originalSeries
  const entityXAxis = categoryLabelMode === "entity" && xAxis?.type === "category"
    ? {
        ...xAxis,
        axisLabel: {
          ...xAxis.axisLabel,
          interval: 0,
          hideOverlap: false,
          rotate: PROJECT_CHART.entityAxisLabelRotation,
          align: "right",
          verticalAlign: "middle",
          width: entityLayout.labelWidth,
          overflow: "truncate",
          ellipsis: "…",
        },
      }
    : xAxis
  const preparedOption: EChartsOption = entityXAxis
    ? {
        ...option,
        xAxis: (Array.isArray(originalXAxis) ? [entityXAxis, ...originalXAxis.slice(1)] : entityXAxis) as EChartsOption["xAxis"],
        series: responsiveSeries as EChartsOption["series"],
      }
    : { ...option, series: responsiveSeries as EChartsOption["series"] }

  if (option.dataZoom) return preparedOption

  const denseGroupedBars = categories >= 28 && groups >= 2
  if (!categories) return preparedOption

  let visibleCategories = maximumEntityCategories
  let zoomRequired = entityZoomRequired

  if (categoryLabelMode === "sequence") {
    if (!scrollable && !denseGroupedBars) return preparedOption

    const groupWidthAtMinimum = denseGroupedBars
      ? PROJECT_CHART.entityBarMinWidth * (groups + 0.2 * Math.max(0, groups - 1)) / 0.65
      : 0
    const categoryWidthAtMinimum = scrollable ? Math.max(56, groupWidthAtMinimum) : groupWidthAtMinimum
    if (!categoryWidthAtMinimum || plotWidth / categories >= categoryWidthAtMinimum) return preparedOption

    visibleCategories = Math.max(7, Math.floor(plotWidth / categoryWidthAtMinimum))
    zoomRequired = categories > visibleCategories
  }

  if (!zoomRequired) return preparedOption

  const windowPercent = Math.min(100, visibleCategories / categories * 100)
  const start = Math.min(Math.max(0, currentZoomStart), Math.max(0, 100 - windowPercent))
  const end = start + windowPercent
  const zoom = [
    { type: "inside" as const, xAxisIndex: 0, start, end, filterMode: "filter" as const, zoomOnMouseWheel: false, moveOnMouseWheel: true, moveOnMouseMove: true },
    { type: "slider" as const, xAxisIndex: 0, start, end, height: 8, bottom: 12, showDetail: false, showDataShadow: false, brushSelect: false, zoomLock: true, handleSize: 0, moveHandleSize: 0, borderColor: "transparent" },
  ]
  const requiredGridBottom = categoryLabelMode === "entity"
    ? PROJECT_CHART.entityDataZoomGridBottom
    : PROJECT_CHART.dataZoomGridBottom
  const expandedGrid = {
    ...grid,
    bottom: categoryLabelMode === "entity"
      ? requiredGridBottom
      : Math.max(numericInset(grid?.bottom, 56), requiredGridBottom),
  }

  return {
    ...preparedOption,
    grid: Array.isArray(option.grid) ? [expandedGrid, ...option.grid.slice(1)] : expandedGrid,
    dataZoom: zoom,
  }
}

function createChartMotion(reduceMotion: boolean) {
  if (reduceMotion) return { animation: false }

  return {
    animation: true,
    animationDuration: 820,
    animationEasing: "cubicOut" as const,
    animationDelay: (dataIndex: number) => Math.min(dataIndex * 36, 280),
    animationDurationUpdate: 420,
    animationEasingUpdate: "cubicInOut" as const,
  }
}

export function EChartsChart({
  option,
  className,
  onChartClick,
  colors,
  labelColors,
  seriesColors,
  seriesGradients,
  gradientDirection = "horizontal",
  dataColors,
  height = "standard",
  ariaLabel = "数据图表",
  focusTooltip,
  scrollable = false,
  categoryLabelMode = "sequence",
}: {
  option: EChartsOption
  className?: string
  onChartClick?: (event: ECElementEvent) => void
  colors?: string[]
  labelColors?: string[]
  seriesColors?: Array<string | null>
  seriesGradients?: Array<[string, string] | null>
  gradientDirection?: "horizontal" | "vertical"
  dataColors?: Array<Array<string | null> | null>
  height?: ChartHeight
  ariaLabel?: string
  focusTooltip?: { seriesIndex?: number; dataIndex?: number }
  scrollable?: boolean
  categoryLabelMode?: CategoryLabelMode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const showFocusTooltip = () => {
    if (!focusTooltip) return
    window.requestAnimationFrame(() => {
      chartRef.current?.dispatchAction({ type: "showTip", seriesIndex: focusTooltip.seriesIndex ?? 0, dataIndex: focusTooltip.dataIndex ?? 0 })
    })
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const styles = getComputedStyle(container)
    const resolveColor = createColorResolver(styles)
    const theme = createProjectTheme(styles, resolveColor)
    const sliderFills = new Set([resolveColor("--muted"), resolveColor("--muted-foreground")])
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let chart: echarts.ECharts | null = null
    let isIntersecting = false
    const roundDataZoomRects = () => {
      if (!chart) return

      let changed = false
      for (const element of chart.getZr().storage.getDisplayList()) {
        if (element.type !== "rect") continue

        const rect = element as unknown as {
          shape: { height?: number; r?: number | number[] }
          style: { fill?: unknown }
          setShape: (key: "r", value: number) => void
        }
        if (rect.shape.height !== 8 || !sliderFills.has(String(rect.style.fill)) || rect.shape.r === 4) continue

        rect.setShape("r", 4)
        changed = true
      }
      if (changed) chart.getZr().refresh()
    }
    const series = Array.isArray(option.series)
      ? option.series.map((item, index) => {
          const labelColor = labelColors?.[index]
          const seriesColor = seriesColors?.[index]
          const gradient = seriesGradients?.[index]
          const itemDataColors = dataColors?.[index]
          if ((!labelColor && !seriesColor && !itemDataColors && !gradient) || !item || typeof item !== "object") return item

          const label = (item as { label?: object }).label
          const itemStyle = (item as { itemStyle?: object }).itemStyle
          const lineStyle = (item as { lineStyle?: object }).lineStyle
          const resolvedSeriesColor = gradient
            ? new echarts.graphic.LinearGradient(0, gradientDirection === "vertical" ? 1 : 0, gradientDirection === "vertical" ? 0 : 1, 0, [
                { offset: 0, color: resolveColor(gradient[0]) },
                { offset: 1, color: resolveColor(gradient[1]) },
              ])
            : seriesColor ? resolveColor(seriesColor) : undefined
          const data = Array.isArray((item as { data?: unknown[] }).data)
            ? (item as { data: unknown[] }).data.map((datum, dataIndex) => {
                const dataColor = itemDataColors?.[dataIndex]
                if (!dataColor) return datum

                const resolvedDataColor = resolveColor(dataColor)
                if (datum && typeof datum === "object") {
                  const datumStyle = (datum as { itemStyle?: object }).itemStyle
                  return { ...datum, itemStyle: { ...datumStyle, color: resolvedDataColor } }
                }
                return { value: datum, itemStyle: { color: resolvedDataColor } }
              })
            : (item as { data?: unknown }).data
          return {
            ...item,
            ...(itemDataColors ? { data } : {}),
            ...(resolvedSeriesColor
              ? {
                  itemStyle: { ...itemStyle, color: resolvedSeriesColor },
                  lineStyle: { ...lineStyle, color: resolvedSeriesColor },
                }
              : {}),
            ...(labelColor
              ? { label: { ...label, color: resolveColor(labelColor) } }
              : {}),
          }
        })
      : option.series

    const setChartOption = () => {
      if (!chart) return

      const runtimeOption = chart.getOption() as { dataZoom?: RuntimeDataZoom[] } | undefined
      const currentDataZoom = first(runtimeOption?.dataZoom)
      const responsiveOption = withResponsiveCategoryZoom(
        { ...option, series: series as EChartsOption["series"] },
        container.clientWidth,
        scrollable,
        categoryLabelMode,
        cssToken(styles, "--font-sans"),
        currentDataZoom?.start
      )
      chart.setOption({
        ...responsiveOption,
        ...createChartMotion(motionQuery.matches),
        color: colors?.map(resolveColor) ?? option.color,
      }, { notMerge: true, lazyUpdate: true })
    }

    const initializeChart = () => {
      if (chart || !isIntersecting || container.clientWidth === 0 || container.clientHeight === 0) return

      chart = echarts.init(container, theme)
      chartRef.current = chart
      chart.on("finished", roundDataZoomRects)
      setChartOption()
      if (onChartClick) chart.on("click", onChartClick)
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!chart) initializeChart()
      else {
        chart.resize()
        setChartOption()
      }
    })
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting
      if (isIntersecting) initializeChart()
    }, { rootMargin: "40px 0px" })

    motionQuery.addEventListener("change", setChartOption)
    resizeObserver.observe(container)
    intersectionObserver.observe(container)

    return () => {
      motionQuery.removeEventListener("change", setChartOption)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      chart?.off("finished", roundDataZoomRects)
      chart?.dispose()
      chartRef.current = null
    }
  }, [categoryLabelMode, colors, dataColors, gradientDirection, labelColors, onChartClick, option, scrollable, seriesColors, seriesGradients])

  return (
    <div
      ref={containerRef}
      className={cn("w-full", chartHeightClasses[height], className)}
      role="img"
      aria-label={ariaLabel}
      tabIndex={focusTooltip ? 0 : undefined}
      onFocus={showFocusTooltip}
      onClick={showFocusTooltip}
      onBlur={() => chartRef.current?.dispatchAction({ type: "hideTip" })}
    />
  )
}
