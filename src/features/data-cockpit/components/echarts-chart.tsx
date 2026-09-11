"use client"

import { useEffect, useRef } from "react"
import * as echarts from "echarts"
import type { EChartsOption, ECElementEvent } from "echarts"

import { cn } from "@/lib/utils"

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
    textStyle: { color: muted, fontFamily: cssToken(styles, "--font-sans") },
    title: { textStyle: { color: foreground } },
    legend: { textStyle: { color: muted } },
    tooltip: {
      backgroundColor: background,
      borderColor: border,
      textStyle: { color: foreground },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: border } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: border } },
    },
    radar: {
      axisName: { color: muted },
      splitLine: { lineStyle: { color: border } },
      splitArea: { areaStyle: { color: ["transparent"] } },
      axisLine: { lineStyle: { color: border } },
    },
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
  ariaLabel = "数据图表",
  focusTooltip,
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
  ariaLabel?: string
  focusTooltip?: { seriesIndex?: number; dataIndex?: number }
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
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let chart: echarts.ECharts | null = null
    let isIntersecting = false
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

      chart.setOption({
        ...option,
        ...createChartMotion(motionQuery.matches),
        color: colors?.map(resolveColor) ?? option.color,
        series,
      })
    }

    const initializeChart = () => {
      if (chart || !isIntersecting || container.clientWidth === 0 || container.clientHeight === 0) return

      chart = echarts.init(container, theme)
      chartRef.current = chart
      setChartOption()
      if (onChartClick) chart.on("click", onChartClick)
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!chart) initializeChart()
      else chart.resize()
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
      chart?.dispose()
      chartRef.current = null
    }
  }, [colors, dataColors, gradientDirection, labelColors, onChartClick, option, seriesColors, seriesGradients])

  return (
    <div
      ref={containerRef}
      className={cn("h-72 min-h-64 w-full", className)}
      role="img"
      aria-label={ariaLabel}
      tabIndex={focusTooltip ? 0 : undefined}
      onFocus={showFocusTooltip}
      onClick={showFocusTooltip}
      onBlur={() => chartRef.current?.dispatchAction({ type: "hideTip" })}
    />
  )
}
