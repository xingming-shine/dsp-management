"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { ArrowRightIcon, FlameIcon, TrophyIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { radarOption } from "@/features/data-cockpit/chart-options"
import { OverviewOperations } from "./cockpit-operations"
import type { Selection } from "../cockpit-model"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { getRankingPeriodLabel } from "@/features/data-cockpit/date-utils"
import { rankingSnapshots } from "@/features/data-cockpit/mock-data"
import { getDspScenario } from "@/features/data-cockpit/mocks"
import type { CockpitView, RankMode } from "@/features/data-cockpit/types"
import { cn } from "@/lib/utils"

const rankingRecommendations: Record<string, string> = {
  时效: "聚焦 2400/4800 妥投时效与异常路区",
  质量: "复盘断更、虚假签收与 POD 合规问题",
  客诉: "排查客诉高发司机与路区，并复核派送标准",
  团队表现: "改善高分司机占比和出勤稳定性",
}

function formatDimensionGap(gap: number) {
  if (gap > 0) return `-${gap}分`
  if (gap < 0) return `+${Math.abs(gap)}分`
  return "持平"
}

export function OverviewTab({ organizationId, onNavigate }: { organizationId: string; onNavigate: (view: CockpitView, selection?: Selection) => void }) {
  const [rankMode, setRankMode] = useState<RankMode>("week")
  const [rankScope, setRankScope] = useState<"station" | "region">("station")
  const scenario = getDspScenario(organizationId)
  const ranking = useMemo(() => {
    const base = rankingSnapshots[rankMode]
    return {
      ...base,
      dspName: scenario.name,
      stationRank: scenario.stationRank,
      stationTotal: scenario.stationDspCount,
      regionRank: scenario.regionRank,
      regionTotal: scenario.regionDspCount,
      totalScore: Math.max(0, base.totalScore + scenario.scoreShift),
      dimensions: base.dimensions.map((item) => ({
        ...item,
        value: Math.max(0, Math.min(100, item.value + scenario.scoreShift)),
        previous: Math.max(0, Math.min(100, item.previous + scenario.scoreShift)),
      })),
    }
  }, [rankMode, scenario])
  const comparisonLabel = rankScope === "station" ? "站点第一名" : "大区第一名"
  const radar = useMemo(() => radarOption(
    ranking.dimensions.map((item) => ({ name: item.name, max: 100 })),
    [
      { name: "当前DSP", values: ranking.dimensions.map((item) => item.value) },
      {
        name: comparisonLabel,
        values: ranking.dimensions.map((item) => rankScope === "station" ? item.stationFirst : item.regionFirst),
      },
    ]
  ), [comparisonLabel, rankScope, ranking])
  const cycleLabel = rankMode === "week" ? "周" : "月"
  const rankingPeriodLabel = getRankingPeriodLabel(rankMode)
  const dimensionGaps = useMemo(() => ranking.dimensions
    .map((item) => ({
      name: item.name,
      gap: (rankScope === "station" ? item.stationFirst : item.regionFirst) - item.value,
    }))
    .sort((a, b) => b.gap - a.gap), [rankScope, ranking])
  const comparisonRank = rankScope === "station" ? ranking.stationRank : ranking.regionRank
  const comparisonTotal = rankScope === "station" ? ranking.stationTotal : ranking.regionTotal
  const comparisonScore = rankScope === "station" ? scenario.stationFirstScore : scenario.regionFirstScore
  const totalScoreGap = Math.max(0, comparisonScore - ranking.totalScore)
  const priorityGaps = dimensionGaps.filter((item) => item.gap > 0).slice(0, 2)
  const recommendation = priorityGaps.length
    ? `优先${rankingRecommendations[priorityGaps[0].name]}${priorityGaps[1] ? `，同时${rankingRecommendations[priorityGaps[1].name]}` : ""}；下周期持续跟踪模块差值和排名变化。`
    : `当前各模块已达到${comparisonLabel}水平，建议持续关注排名和环比波动。`

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={rankMode} onValueChange={(value) => setRankMode(value as RankMode)}>
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
              <TabsList aria-label="排名维度">
                <TabsTrigger value="week">周排名</TabsTrigger>
                <TabsTrigger value="month">月排名</TabsTrigger>
              </TabsList>
              <Button variant="link" size="sm" onClick={() => onNavigate("ranking")}>详情<ArrowRightIcon data-icon="inline-end" aria-hidden="true" /></Button>
            </CardAction>
          </CardHeader>
          <TabsContent value={rankMode} asChild>
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
                    <p className="text-base font-semibold">站点排名</p>
                    <p className="font-heading font-bold tracking-tight tabular-nums"><span className="text-8xl text-brand-ink">{ranking.stationRank}</span><span className="text-3xl text-foreground"> / {ranking.stationTotal}</span></p>
                    <p className="text-sm text-muted-foreground">{ranking.stationChange} 环比上{cycleLabel}</p>
                  </div>
                  <RankComparisonStat label="大区排名" value={ranking.regionRank} total={ranking.regionTotal} change={`${ranking.regionChange} 环比上${cycleLabel}`} divided />
                  <RankComparisonStat label="综合总分" value={ranking.totalScore} change={`${ranking.totalScoreChange} 环比上${cycleLabel}`} accent divided />
                </div>

                <Alert className="mt-2 border-0 bg-brand-selected/70 px-4 py-3">
                  <div className="grid min-w-0 gap-2.5">
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <FlameIcon className="size-4 shrink-0 text-brand-ink" aria-hidden="true" />
                        <AlertTitle className="min-w-0 text-[13px] font-normal">
                          <span className="min-w-0">与{comparisonLabel}相差 <strong className="font-semibold text-brand-ink tabular-nums">{totalScoreGap}分</strong><span className="text-muted-foreground"> · 当前{rankScope === "station" ? "站点" : "大区"}排名 {comparisonRank}/{comparisonTotal}</span></span>
                        </AlertTitle>
                      </div>
                      <ToggleGroup className="justify-self-start sm:justify-self-end" type="single" variant="raised" spacing={1} size="sm" value={rankScope} onValueChange={(value) => value && setRankScope(value as "station" | "region")} aria-label="排名对比范围">
                        <ToggleGroupItem value="station">站点第一名</ToggleGroupItem>
                        <ToggleGroupItem value="region">大区第一名</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <AlertDescription className="grid min-w-0 gap-2.5 text-left text-sm">
                      <div className="flex min-w-0 flex-wrap gap-2">
                        {dimensionGaps.map((item) => <Badge key={item.name} variant={item.gap > 0 ? "destructive" : item.gap < 0 ? "success" : "secondary"}>{item.name} {formatDimensionGap(item.gap)}</Badge>)}
                      </div>
                      <p className="min-w-0 text-xs leading-5 text-muted-foreground">{recommendation}</p>
                    </AlertDescription>
                  </div>
                </Alert>
              </div>

              <Card size="sm" className="h-full bg-card/60 backdrop-blur-md supports-[backdrop-filter]:bg-card/50">
                <CardHeader><CardTitle className="text-base">维度得分对比</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <EChartsChart
                    option={radar}
                    colors={["--brand", rankScope === "station" ? "--chart-2" : "--chart-3"]}
                    height="compact"
                    ariaLabel="维度得分对比"
                  />
                </CardContent>
              </Card>
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>

      <OverviewOperations organizationId={organizationId} onNavigate={onNavigate} />
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
