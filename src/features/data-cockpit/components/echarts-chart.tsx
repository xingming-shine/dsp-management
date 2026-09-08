"use client"

import { useEffect, useRef } from "react"
import * as echarts from "echarts"
import type { EChartsOption, ECElementEvent } from "echarts"

import { cn } from "@/lib/utils"

function cssToken(styles: CSSStyleDeclaration, token: string) {
  return styles.getPropertyValue(token).trim()
}

function createProjectTheme(element: HTMLElement) {
  const styles = getComputedStyle(element)
  const foreground = cssToken(styles, "--foreground")
  const muted = cssToken(styles, "--muted-foreground")
  const border = cssToken(styles, "--border")
  const background = cssToken(styles, "--card")

  return {
    color: [
      cssToken(styles, "--chart-1"),
      cssToken(styles, "--chart-2"),
      cssToken(styles, "--chart-3"),
      cssToken(styles, "--chart-4"),
      cssToken(styles, "--chart-5"),
      cssToken(styles, "--chart-6"),
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
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const theme = createProjectTheme(container)
    const styles = getComputedStyle(container)
    const chart = echarts.init(container, theme)
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
                { offset: 0, color: cssToken(styles, gradient[0]) },
                { offset: 1, color: cssToken(styles, gradient[1]) },
              ])
            : seriesColor ? cssToken(styles, seriesColor) : undefined
          const data = Array.isArray((item as { data?: unknown[] }).data)
            ? (item as { data: unknown[] }).data.map((datum, dataIndex) => {
                const dataColor = itemDataColors?.[dataIndex]
                if (!dataColor) return datum

                const resolvedDataColor = cssToken(styles, dataColor)
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
              ? { label: { ...label, color: cssToken(styles, labelColor) } }
              : {}),
          }
        })
      : option.series

    chart.setOption({
      ...option,
      color: colors?.map((token) => cssToken(styles, token)) ?? option.color,
      series,
    })

    if (onChartClick) {
      chart.on("click", onChartClick)
    }

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.dispose()
    }
  }, [colors, dataColors, gradientDirection, labelColors, onChartClick, option, seriesColors, seriesGradients])

  return (
    <div
      ref={containerRef}
      className={cn("h-72 min-h-64 w-full", className)}
      role="img"
      aria-label={ariaLabel}
    />
  )
}
