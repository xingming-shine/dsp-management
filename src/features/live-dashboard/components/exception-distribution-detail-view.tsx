"use client"

import { useMemo } from "react"
import type { EChartsOption } from "echarts"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"

const driverNames = [
  "Vivian Ho",
  "Vivian Ho1",
  "Vivian Ho2",
  "Vivian Ho3",
  "Fanlin Wu",
  "Fanlin Wu3",
  "Alice Chen",
  "Mike Liu",
  "Sophia Zhang",
  "Leo Wang",
  "Maria Garcia",
  "James Wilson",
  "David Lee",
  "Emma Davis",
  "Daniel Kim",
  "Olivia Brown",
  "Ethan Chen",
  "Grace Lin",
]

const reasonRows = [
  { label: "收件人拒收", normal: 22, fake: 8, color: "--exception-reason-1", deepColor: "--exception-reason-1-deep" },
  { label: "无法投递", normal: 16, fake: 3, color: "--exception-reason-2", deepColor: "--exception-reason-2-deep" },
  { label: "地址错误/不详", normal: 3, fake: 0, color: "--exception-reason-3", deepColor: "--exception-reason-3-deep" },
  { label: "无法进入", normal: 21, fake: 10, color: "--exception-reason-4", deepColor: "--exception-reason-4-deep" },
  { label: "商业地址关门", normal: 16, fake: 2, color: "--exception-reason-5", deepColor: "--exception-reason-5-deep" },
]

const driverDistribution = {
  normal: [9, 6, 7, 8, 9, 8, 5, 1, 5, 4, 7, 6, 8, 4, 9, 5, 6, 3],
  fake: [0, 0, 0, 3, 5, 1, 0, 0, 0, 3, 2, 1, 0, 2, 3, 0, 1, 2],
}

const reasonDriverData = [
  { title: "地址错误/不详", color: "--exception-reason-3", deepColor: "--exception-reason-3-deep", normal: [0, 3, 2, 2, 5, 4, 0, 1, 2, 1], fake: [0, 0, 0, 1, 0, 1, 0, 0, 0, 0] },
  { title: "无法进入", color: "--exception-reason-4", deepColor: "--exception-reason-4-deep", normal: [0, 3, 2, 2, 5, 4, 0, 1, 2, 1], fake: [0, 0, 0, 1, 0, 1, 0, 0, 0, 0] },
  { title: "商业地址关门", color: "--exception-reason-5", deepColor: "--exception-reason-5-deep", normal: [0, 3, 2, 2, 5, 4, 0, 1, 2, 1], fake: [0, 0, 0, 1, 0, 1, 0, 0, 0, 0] },
  { title: "收件人拒收", color: "--exception-reason-1", deepColor: "--exception-reason-1-deep", normal: [0, 3, 2, 2, 5, 4, 0, 1, 2, 1], fake: [0, 0, 0, 1, 0, 1, 0, 0, 0, 0] },
]

function createDriverStackOption(normal: number[], fake: number[], max = 15, barMaxWidth = 24): EChartsOption {
  const visibleDrivers = driverNames
    .map((name, index) => ({ name, normal: normal[index], fake: fake[index] }))
    .filter((driver) => driver.normal + driver.fake > 0)
  const normalData = visibleDrivers.map(({ normal: value, fake: fakeValue }) => ({
    value,
    itemStyle: { borderRadius: fakeValue > 0 ? [0, 0, 3, 3] : [5, 5, 3, 3] },
  }))
  const fakeData = visibleDrivers.map(({ fake: value }) => ({
    value,
    itemStyle: { borderRadius: value > 0 ? [5, 5, 0, 0] : 0 },
  }))

  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { show: false },
    grid: { left: 36, right: 16, top: 18, bottom: 52 },
    xAxis: {
      type: "category",
      data: visibleDrivers.map((driver) => driver.name),
      axisLabel: { interval: 0, rotate: 35, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: { type: "value", min: 0, max, interval: max === 15 ? 3 : 1, splitLine: { lineStyle: { type: "dashed" } } },
    series: [
      {
        name: "正常问题件",
        type: "bar",
        stack: "issue",
        barMaxWidth,
        data: normalData,
        label: { show: true, position: "inside", fontSize: 10, formatter: ({ value }: { value: unknown }) => Number(value) > 0 ? String(value) : "" },
      },
      {
        name: "虚假问题件",
        type: "bar",
        stack: "issue",
        barMaxWidth,
        data: fakeData,
        label: { show: true, position: "inside", fontSize: 10, formatter: ({ value }: { value: unknown }) => Number(value) > 0 ? String(value) : "" },
      },
    ],
  }
}

function ScrollableDriverChart({ option, ariaLabel }: { option: EChartsOption; ariaLabel: string }) {
  const axis = option.xAxis as { data?: unknown[] }
  const driverCount = axis.data?.length ?? 0

  return (
    <div>
    <div className="driver-chart-scroll overflow-x-auto rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" tabIndex={0} role="region" aria-label={`${ariaLabel}，可左右滚动`}>
      <div style={{ minWidth: driverCount > 10 ? driverCount * 44 + 52 : undefined }}>
        <EChartsChart
          option={option}
          seriesColors={["--exception-personnel-normal", "--exception-personnel-fake"]}
          labelColors={["--brand-foreground", "--brand-foreground"]}
          className="h-64"
          ariaLabel={ariaLabel}
        />
      </div>
    </div>
    <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground" aria-label="图例">
      <span className="flex items-center gap-1"><span className="driver-chart-legend-normal h-2.5 w-4 rounded-sm" />正常问题件</span>
      <span className="flex items-center gap-1"><span className="driver-chart-legend-fake h-2.5 w-4 rounded-sm" />虚假问题件</span>
    </div>
    </div>
  )
}

export function ExceptionDistributionDetailView({ onBack }: { onBack: () => void }) {
  const reasonOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 0, icon: "roundRect", itemWidth: 18, itemHeight: 10, itemGap: 16 },
    grid: { left: 128, right: 28, top: 18, bottom: 52 },
    xAxis: { type: "value", max: 35, interval: 5, splitLine: { lineStyle: { type: "dashed" } } },
    yAxis: { type: "category", inverse: true, data: reasonRows.map((item) => item.label), axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        name: "正常问题件",
        type: "bar",
        stack: "issue",
        barWidth: 16,
        data: reasonRows.map((item) => ({
          value: item.normal,
          itemStyle: { borderRadius: item.fake > 0 ? [8, 0, 0, 8] : [8, 8, 8, 8] },
        })),
        label: { show: true, position: "inside", fontSize: 12 },
      },
      {
        name: "虚假问题件",
        type: "bar",
        stack: "issue",
        barWidth: 16,
        data: reasonRows.map((item) => ({
          value: item.fake,
          itemStyle: { borderRadius: item.fake > 0 ? [0, 8, 8, 0] : 0 },
        })),
        label: { show: true, position: "inside", fontSize: 12, formatter: ({ value }: { value: unknown }) => Number(value) > 0 ? String(value) : "" },
      },
    ],
  }), [])
  const personnelOption = useMemo(() => createDriverStackOption(driverDistribution.normal, driverDistribution.fake, 15, 16), [])
  const detailOptions = useMemo(() => reasonDriverData.map((item, index) => createDriverStackOption(
    [...item.normal, ...Array.from({ length: 8 }, (_, driverIndex) => 1 + (driverIndex + index) % 4)],
    [...item.fake, ...Array.from({ length: 8 }, (_, driverIndex) => (driverIndex + index) % 3 === 0 ? 1 : 0)],
    5,
    16,
  )), [])

  return (
    <section className="animate-in fade-in slide-in-from-right-4 flex min-w-0 flex-col gap-5 rounded-xl bg-card p-5 duration-200" aria-label="派送异常分布详情">
      <div className="flex min-w-0 items-start gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回
        </Button>
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-semibold text-foreground">派送异常分布详情</h2>
        </div>
      </div>

      <div className="rounded-lg border p-5">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <section className="min-w-0" aria-labelledby="exception-reason-chart-title">
            <h3 id="exception-reason-chart-title" className="text-sm font-medium">派送异常原因分布</h3>
            <EChartsChart
              option={reasonOption}
              colors={["--exception-overview-normal", "--exception-overview-fake"]}
              seriesColors={[null, "--exception-overview-fake"]}
              seriesGradients={[
                ["--exception-overview-normal-start", "--exception-overview-normal"],
                null,
              ]}
              labelColors={["--brand-foreground", "--brand-foreground"]}
              className="h-72"
              ariaLabel="派送异常原因分布堆叠条形图"
            />
          </section>
          <section className="min-w-0" aria-labelledby="exception-driver-chart-title">
            <h3 id="exception-driver-chart-title" className="text-sm font-medium">派送异常量人员分布</h3>
            <ScrollableDriverChart
              option={personnelOption}
              ariaLabel="派送异常量人员分布堆叠柱状图"
            />
          </section>
        </div>

        <section className="mt-8 rounded-lg bg-background p-4" aria-labelledby="exception-reason-detail-title">
          <h3 id="exception-reason-detail-title" className="text-base font-medium">派送异常原因详情</h3>
          <p className="mt-1 text-xs text-muted-foreground">按异常原因查看各司机的件量分布</p>
          <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
            {reasonDriverData.map((item, index) => (
              <section key={item.title} className="min-w-0 rounded-lg bg-card p-4" aria-labelledby={`reason-detail-${index}`}>
                <h4 id={`reason-detail-${index}`} className="border-b pb-3 text-sm font-medium">
                  {item.title}
                </h4>
                <ScrollableDriverChart
                  option={detailOptions[index]}
                  ariaLabel={`${item.title}司机问题件分布堆叠柱状图`}
                />
              </section>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
