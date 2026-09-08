import type { EChartsOption, SeriesOption } from "echarts"

export function lineOption(
  labels: string[],
  series: Array<{ name: string; data: number[]; yAxisIndex?: number }>,
  options?: { inverse?: boolean; percent?: boolean; target?: number }
): EChartsOption {
  const chartSeries: SeriesOption[] = series.map((item, index) => ({
    name: item.name,
    type: "line",
    smooth: true,
    symbol: "emptyCircle",
    symbolSize: 6,
    yAxisIndex: item.yAxisIndex,
    data: item.data,
    markLine: index === 0 && options?.target !== undefined ? {
      silent: true,
      symbol: "none",
      data: [{ yAxis: options.target, name: `目标${options.target}%` }],
      lineStyle: { type: "dashed" },
    } : undefined,
  }))

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 48, right: 24, top: 44, bottom: 38 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLabel: { hideOverlap: true },
    },
    yAxis: {
      type: "value",
      inverse: options?.inverse,
      axisLabel: options?.percent ? { formatter: "{value}%" } : undefined,
    },
    series: chartSeries,
  }
}

export function barOption(
  labels: string[],
  series: Array<{ name: string; data: number[]; stack?: string }>
): EChartsOption {
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0 },
    grid: { left: 48, right: 24, top: 44, bottom: 38 },
    xAxis: { type: "category", data: labels, axisLabel: { hideOverlap: true } },
    yAxis: { type: "value" },
    series: series.map((item) => ({
      name: item.name,
      type: "bar",
      stack: item.stack,
      barMaxWidth: 28,
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
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 96, right: 24, top: 16, bottom: 28 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: labels, inverse: true },
    series: [{ name, type: "bar", barMaxWidth: 20, data: values }],
  }
}

export function pieOption(
  data: Array<{ name: string; value: number }>,
  centerLabel?: string
): EChartsOption {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
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
        radius: centerLabel ? ["48%", "70%"] : ["0%", "70%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        data,
        label: { formatter: "{b}\n{d}%" },
      },
    ],
  }
}

export function radarOption(
  indicators: Array<{ name: string; max: number }>,
  series: Array<{ name: string; values: number[] }>
): EChartsOption {
  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
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
