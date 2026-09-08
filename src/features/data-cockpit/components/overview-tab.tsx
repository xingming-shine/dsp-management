"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { ArrowRightIcon, FlameIcon, GaugeIcon, TrophyIcon, UsersIcon, WheatIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { radarOption } from "@/features/data-cockpit/chart-options"
import { MetricGrid } from "@/features/data-cockpit/components/dashboard-primitives"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { TimeFilter } from "@/features/data-cockpit/components/time-filter"
import { getDefaultPeriod, getRankingPeriodLabel } from "@/features/data-cockpit/date-utils"
import { overviewMetrics, rankingSnapshots } from "@/features/data-cockpit/mock-data"
import type { CockpitView, KpiMetric, PeriodMode, RankMode } from "@/features/data-cockpit/types"
import { cn } from "@/lib/utils"

const sections: Array<{ key: "capacity" | "efficiency" | "timeliness" | "quality"; label: string; view: CockpitView }> = [
  { key: "capacity", label: "产能", view: "capacity" },
  { key: "efficiency", label: "人效", view: "efficiency" },
  { key: "timeliness", label: "时效", view: "timeliness" },
  { key: "quality", label: "质量", view: "quality" },
]

export function OverviewTab({ onNavigate, onMetricDetail }: { onNavigate: (view: CockpitView) => void; onMetricDetail: (metric: KpiMetric) => void }) {
  const [rankMode, setRankMode] = useState<RankMode>("week")
  const [rankScope, setRankScope] = useState<"station" | "region">("station")
  const [metricFilter, setMetricFilter] = useState<"all" | "assessment">("all")
  const [periodMode, setPeriodMode] = useState<PeriodMode>("day")
  const [periodValue, setPeriodValue] = useState(getDefaultPeriod("day"))
  const ranking = rankingSnapshots[rankMode]
  const radar = useMemo(() => radarOption(
    ranking.dimensions.map((item) => ({ name: item.name, max: 100 })),
    [
      { name: "当前DSP", values: ranking.dimensions.map((item) => item.value) },
      { name: "站点第1名", values: ranking.dimensions.map((item) => item.stationFirst) },
      { name: "大区第1名", values: ranking.dimensions.map((item) => item.regionFirst) },
    ]
  ), [ranking])
  const comparisonLabel = rankScope === "station" ? "站点第一名" : "大区第一名"
  const cycleLabel = rankMode === "week" ? "周" : "月"
  const rankingPeriodLabel = getRankingPeriodLabel(rankMode)
  const dimensionGaps = useMemo(() => ranking.dimensions
    .map((item) => ({
      name: item.name,
      gap: (rankScope === "station" ? item.stationFirst : item.regionFirst) - item.value,
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 2), [rankScope, ranking])

  return (
    <div className="flex flex-col gap-4">
      <Card className="relative overflow-hidden !bg-transparent">
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-card via-card/70 to-transparent"
          aria-hidden="true"
        />
        <CardHeader className="relative z-10 grid-cols-1 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-selected text-brand-ink"><TrophyIcon className="size-6" aria-hidden="true" /></span>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg">DSP排名</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                <span>{rankingPeriodLabel}</span>
              </CardDescription>
            </div>
          </div>
          <CardAction className="col-start-1 row-start-2 flex flex-wrap items-center gap-2 justify-self-start sm:col-start-2 sm:row-start-1 sm:justify-self-end">
            <ToggleGroup type="single" variant="outline" spacing={0} value={rankMode} onValueChange={(value) => value && setRankMode(value as RankMode)} aria-label="排名维度">
              <ToggleGroupItem value="week">周排名</ToggleGroupItem><ToggleGroupItem value="month">月排名</ToggleGroupItem>
            </ToggleGroup>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("ranking")}>查看详情<ArrowRightIcon data-icon="inline-end" /></Button>
          </CardAction>
        </CardHeader>
        <CardContent className="relative z-10 -mt-2 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(22rem,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid items-stretch md:h-[229px] md:grid-cols-[minmax(11rem,.95fr)_minmax(11rem,1fr)_minmax(8rem,.65fr)_minmax(8rem,.65fr)] md:items-end">
              <div className="flex items-end justify-center overflow-hidden py-5 md:py-0">
                <Image
                  src="/assets/dsp-ranking/rank-trophy-decor-v2.webp"
                  alt=""
                  width={560}
                  height={580}
                  unoptimized
                  sizes="(min-width: 1280px) 18vw, 40vw"
                  className="pointer-events-none h-auto w-full max-w-64 translate-y-2 object-contain"
                  aria-hidden="true"
                />
              </div>
              <div className="flex min-w-0 flex-col items-center gap-3 px-4 py-5 text-center md:py-0">
                <p className="flex items-center gap-2 text-base font-semibold"><WheatIcon className="size-5 text-brand-ink" aria-hidden="true" /><span>站点排名</span><WheatIcon className="size-5 -scale-x-100 text-brand-ink" aria-hidden="true" /></p>
                <p className="font-heading font-bold tracking-tight tabular-nums"><span className="text-8xl text-brand-ink">{ranking.stationRank}</span><span className="text-3xl text-foreground"> / {ranking.stationTotal}</span></p>
                <p className="text-sm text-muted-foreground">{ranking.stationChange} 环比上{cycleLabel}</p>
              </div>
              <RankComparisonStat label="大区排名" value={ranking.regionRank} total={ranking.regionTotal} change={`${ranking.regionChange} 环比上${cycleLabel}`} divided />
              <RankComparisonStat label="综合总分" value={ranking.totalScore} change={`${ranking.totalScoreChange} 环比上${cycleLabel}`} accent divided />
            </div>

            <Alert className="mt-2 border-0 bg-brand-selected/70 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <FlameIcon className="text-brand-ink" aria-hidden="true" />
              <AlertTitle className="font-normal">距{comparisonLabel}最大维度差距 <span className="text-lg font-semibold text-brand-ink tabular-nums">{dimensionGaps[0]?.gap}</span> 分，优先提升{dimensionGaps.map((item) => item.name).join("与")}。</AlertTitle>
              <AlertDescription className="col-start-2 flex flex-wrap items-center gap-2 pt-1 sm:col-start-3 sm:row-start-1 sm:pt-0">
                {dimensionGaps.map((item) => <Badge key={item.name} variant="secondary">{item.name} -{item.gap}分</Badge>)}
                <ToggleGroup type="single" variant="outline" spacing={0} size="sm" value={rankScope} onValueChange={(value) => value && setRankScope(value as "station" | "region")} aria-label="排名对比范围">
                  <ToggleGroupItem value="station">站点第一名</ToggleGroupItem>
                  <ToggleGroupItem value="region">大区第一名</ToggleGroupItem>
                </ToggleGroup>
              </AlertDescription>
            </Alert>
          </div>

          <Card size="sm" className="h-full bg-card/60 backdrop-blur-md supports-[backdrop-filter]:bg-card/50">
            <CardHeader><CardTitle className="text-base">维度得分对比</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <EChartsChart option={radar} className="h-56" />
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GaugeIcon />运营指标</CardTitle>
          <CardDescription>{periodMode === "day" ? "日数据·每日更新" : periodMode === "week" ? "周数据·每周更新" : "月数据·每月更新"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TimeFilter mode={periodMode} value={periodValue} onModeChange={setPeriodMode} onValueChange={setPeriodValue} allowCustom={false} />
            <ToggleGroup type="single" variant="outline" spacing={0} value={metricFilter} onValueChange={(value) => value && setMetricFilter(value as "all" | "assessment")} aria-label="指标筛选">
              <ToggleGroupItem value="all">全部指标</ToggleGroupItem><ToggleGroupItem value="assessment">仅考核指标</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {sections.map((section) => {
            const sourceMetrics = section.key === "timeliness" && periodMode === "day" ? overviewMetrics.timeliness.map((metric) => {
              const gap = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(`${periodValue}T00:00:00`).getTime()) / 86400000)
              const updating = (metric.detailType === "4800" && gap < 2) || (metric.detailType === "7200" && gap < 3)
              return updating ? { ...metric, status: "更新中" as const, change: undefined } : metric
            }) : overviewMetrics[section.key]
            const metrics = metricFilter === "assessment" ? sourceMetrics.filter((metric) => metric.assessment) : sourceMetrics
            return <section key={section.key} className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{section.label}</h3><Button variant="ghost" size="sm" onClick={() => onNavigate(section.view)}>查看详情<ArrowRightIcon data-icon="inline-end" /></Button></div>
              <MetricGrid metrics={metrics} onDetail={onMetricDetail} />
            </section>
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="grid-cols-1 sm:grid-cols-[1fr_auto]"><CardTitle className="flex items-center gap-2"><UsersIcon />司机表现</CardTitle><CardDescription>月度数据·每月5号更新</CardDescription><CardAction className="col-start-1 row-start-3 row-span-1 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end"><Button variant="ghost" size="sm" onClick={() => onNavigate("driver")}>查看详情<ArrowRightIcon data-icon="inline-end" /></Button></CardAction></CardHeader>
        <CardContent><MetricGrid metrics={overviewMetrics.driver} /></CardContent>
      </Card>
    </div>
  )
}

function RankComparisonStat({ label, value, total, change, accent = false, divided = false }: { label: string; value: number; total?: number; change: string; accent?: boolean; divided?: boolean }) {
  return <div className={cn("flex min-w-0 flex-col gap-3 px-4 py-5 md:py-0", divided && "border-t md:border-s md:border-t-0")}>
    <dt className="text-base font-medium text-muted-foreground">{label}</dt>
    <dd className="font-heading text-4xl font-bold tracking-tight tabular-nums"><span className={accent ? "text-brand-ink" : undefined}>{value}</span>{total ? <span className="text-xl font-semibold text-foreground"> / {total}</span> : null}</dd>
    <dd className="text-sm text-muted-foreground">{change}</dd>
  </div>
}
