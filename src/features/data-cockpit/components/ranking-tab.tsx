"use client"

import { useMemo, useState } from "react"
import { AlertTriangleIcon, InfoIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldTitle } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { lineOption, radarOption } from "@/features/data-cockpit/chart-options"
import { ChartPanel, DataTableCard, MetricGrid, type TableColumn } from "@/features/data-cockpit/components/dashboard-primitives"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { getLatestRankingPeriod, getMonthOptions, getRankingPolicyLabel, getWeekOptions, isRankingBeforePolicy, resolveRankingPeriod } from "@/features/data-cockpit/date-utils"
import { getRankingDetailRows, metricTooltip, rankingSnapshots } from "@/features/data-cockpit/mock-data"
import type { KpiMetric, RankingDetailRow, RankMode } from "@/features/data-cockpit/types"
import { formatMonth } from "@/lib/date-time"

const pct = (value: number) => `${(value * 100).toFixed(value < .001 ? 3 : 2)}%`
const rankingColumns: TableColumn<RankingDetailRow>[] = [
  { key: "period", label: "日期", tooltip: metricTooltip },
  { key: "difficulty", label: "派送难易度", tooltip: metricTooltip },
  { key: "pod2400", label: "时效 · 2400妥投率\n权重 0.25 · 目标 ≥0.97", render: (row) => pct(row.pod2400), exportValue: (row) => pct(row.pod2400), tooltip: metricTooltip },
  { key: "pod2400Score", label: "2400妥投率得分", tooltip: metricTooltip },
  { key: "pod4800", label: "时效 · 4800妥投率\n权重 0.1 · 目标 ≥0.98", render: (row) => pct(row.pod4800), exportValue: (row) => pct(row.pod4800), tooltip: metricTooltip },
  { key: "pod4800Score", label: "4800妥投率得分", tooltip: metricTooltip },
  { key: "breakRate", label: "质量 · 断更率\n权重 0.15 · 目标 ≤0.04%", render: (row) => pct(row.breakRate), exportValue: (row) => pct(row.breakRate), tooltip: metricTooltip },
  { key: "breakRateScore", label: "断更率得分", tooltip: metricTooltip },
  { key: "fakeSignRate", label: "质量 · 虚假签收率\n权重 0.15 · 目标 ≤0.05%", render: (row) => pct(row.fakeSignRate), exportValue: (row) => pct(row.fakeSignRate), tooltip: metricTooltip },
  { key: "fakeSignScore", label: "虚假签收率得分", tooltip: metricTooltip },
  { key: "complaintRate", label: "客诉 · 有效客诉率\n权重 0.1 · 目标 ≤0.1%", render: (row) => pct(row.complaintRate), exportValue: (row) => pct(row.complaintRate), tooltip: metricTooltip },
  { key: "complaintScore", label: "有效客诉率得分", tooltip: metricTooltip },
  { key: "starDriverPct", label: "团队表现 · 高分司机占比\n权重 0.1 · 目标 ≥70%", render: (row) => pct(row.starDriverPct), exportValue: (row) => pct(row.starDriverPct), tooltip: metricTooltip },
  { key: "starDriverPctScore", label: "高分司机得分", tooltip: metricTooltip },
  { key: "starDriverAttendance", label: "团队表现 · 3/4/5星司机出勤率\n权重 0.15 · 目标 ≥70%", render: (row) => pct(row.starDriverAttendance), exportValue: (row) => pct(row.starDriverAttendance), tooltip: metricTooltip },
  { key: "starDriverAttendanceScore", label: "3/4/5星司机出勤得分", tooltip: metricTooltip },
  { key: "scoreAdjust", label: "分数调整", render: (row) => row.scoreAdjust > 0 ? `+${row.scoreAdjust}` : row.scoreAdjust, tooltip: metricTooltip },
  { key: "total", label: "总分（＜85不达标）", render: (row) => row.total + row.scoreAdjust, exportValue: (row) => row.total + row.scoreAdjust, tooltip: metricTooltip },
  { key: "stationRank", label: "站点排名", tooltip: metricTooltip },
  { key: "regionRank", label: "大区排名", tooltip: metricTooltip },
]

export function RankingTab() {
  const [mode, setMode] = useState<RankMode>("week")
  const [weekPeriod, setWeekPeriod] = useState(getLatestRankingPeriod("week"))
  const [monthPeriod, setMonthPeriod] = useState(getLatestRankingPeriod("month"))
  const [scope, setScope] = useState<"station" | "region">("station")
  const [updateMessage, setUpdateMessage] = useState("")
  const options = mode === "week" ? getWeekOptions() : getMonthOptions()
  const period = mode === "week" ? weekPeriod : monthPeriod
  const snapshot = rankingSnapshots[mode]
  const beforePolicy = isRankingBeforePolicy(mode, period)
  const rows = useMemo(() => {
    const base = getRankingDetailRows(mode)
    if (mode === "week") {
      const selectedLabel = options.find((option) => option.value === period)?.label ?? "W24"
      const week = Number(selectedLabel.match(/W(\d+)/)?.[1] ?? 24)
      return base.map((row, index) => ({ ...row, period: `W${week - index}` }))
    }
    const [year, month] = period.split("-").map(Number)
    return base.map((row, index) => {
      const date = new Date(year, month - 1 - index, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      return { ...row, period: formatMonth(value) }
    })
  }, [mode, options, period])
  const labels = rows.map((row) => row.period).reverse()
  const metrics: KpiMetric[] = [
    { label: "站点排名", value: beforePolicy ? "—" : `${snapshot.stationRank} / ${snapshot.stationTotal}`, change: beforePolicy ? "考核口径调整前暂无排名" : `${snapshot.stationChange} 环比` },
    { label: "大区排名", value: beforePolicy ? "—" : `${snapshot.regionRank} / ${snapshot.regionTotal}`, change: beforePolicy ? "考核口径调整前暂无排名" : `${snapshot.regionChange} 环比` },
    { label: "综合总分", value: String(snapshot.totalScore), change: `${snapshot.totalScoreChange} 环比` },
    { label: "派送难易度", value: snapshot.difficulty },
  ]
  const rankTrend = useMemo(() => lineOption(labels, [
    { name: "站点排名", data: rows.map((row) => row.stationRank).reverse() },
    { name: "大区排名", data: rows.map((row) => row.regionRank).reverse() },
  ], { inverse: true }), [labels, rows])
  const radar = useMemo(() => radarOption(snapshot.dimensions.map((item) => ({ name: item.name, max: 100 })), [
    { name: "当前DSP", values: snapshot.dimensions.map((item) => item.value) },
    ...(beforePolicy ? [] : [{ name: scope === "station" ? "站点第1名" : "大区第1名", values: snapshot.dimensions.map((item) => scope === "station" ? item.stationFirst : item.regionFirst) }]),
  ]), [beforePolicy, scope, snapshot])
  const dimensionTrend = useMemo(() => lineOption(labels, [
    { name: "时效", data: [78,80,82,81,84,83,86,84,85,87,86,85] },
    { name: "质量", data: [84,82,85,83,82,80,84,83,82,80,82,81] },
    { name: "客诉", data: [76,75,78,74,73,71,76,72,70,71,70,69] },
    { name: "团队表现", data: [82,84,83,86,85,84,82,83,81,80,80,79] },
  ]), [labels])

  const changePeriod = (requested: string) => {
    const resolved = resolveRankingPeriod(mode, requested)
    if (mode === "week") setWeekPeriod(resolved.period)
    else setMonthPeriod(resolved.period)
    if (resolved.message) setUpdateMessage(resolved.message)
  }

  const changeMode = (nextMode: RankMode) => {
    setMode(nextMode)
    setScope("station")
  }

  const tableColumns = useMemo<TableColumn<RankingDetailRow>[]>(() => rankingColumns.map((column) => {
    if (!beforePolicy || (column.key !== "stationRank" && column.key !== "regionRank")) return column
    return { ...column, render: () => "—", exportValue: () => "—" }
  }), [beforePolicy])

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold">DSP排名</h2><Badge variant="secondary">{mode === "week" ? "数据每周三更新" : "数据每月7号更新"}</Badge></div>
    <div className="flex flex-wrap items-center gap-3">
      <Field orientation="horizontal" className="w-auto"><FieldTitle id="rank-mode">排名维度</FieldTitle><ToggleGroup type="single" variant="outline" spacing={0} value={mode} onValueChange={(value) => value && changeMode(value as RankMode)} aria-labelledby="rank-mode"><ToggleGroupItem value="week">周</ToggleGroupItem><ToggleGroupItem value="month">月</ToggleGroupItem></ToggleGroup></Field>
      <Field orientation="horizontal" className="w-auto"><FieldTitle>数据时间</FieldTitle><Select value={period} onValueChange={changePeriod}><SelectTrigger className="min-w-56" aria-label="选择排名周期"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
    </div>
    {beforePolicy ? <Alert className="border-amber-500/50 bg-amber-500/5"><AlertTriangleIcon className="text-amber-600" /><AlertDescription>{getRankingPolicyLabel(mode)} 起调整考核指标，暂无调整前的排名信息；指标得分仍可查看。</AlertDescription></Alert> : period === (mode === "month" ? "2026-07" : "2026-07-06~2026-07-12") ? <Alert><InfoIcon /><AlertDescription>本周期处于考核指标调整期，排名仅供参考。</AlertDescription></Alert> : null}
    <MetricGrid metrics={metrics} />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]"><ChartPanel title="历史排名趋势" description={options.find((option) => option.value === period)?.label}><EChartsChart option={rankTrend} /></ChartPanel><ChartPanel title="维度得分对比" action={beforePolicy ? undefined : <ToggleGroup type="single" variant="outline" spacing={0} size="sm" value={scope} onValueChange={(value) => value && setScope(value as "station" | "region")} aria-label="排名对比范围"><ToggleGroupItem value="station">站点排名</ToggleGroupItem><ToggleGroupItem value="region">大区排名</ToggleGroupItem></ToggleGroup>}><EChartsChart option={radar} /></ChartPanel></div>
    <ChartPanel title="维度得分趋势" description={options.find((option) => option.value === period)?.label}><EChartsChart option={dimensionTrend} /></ChartPanel>
    <DataTableCard title="DSP排名详细数据" columns={tableColumns} rows={rows} filename="DSP排名详细数据" variant="grid" />
    <Dialog open={Boolean(updateMessage)} onOpenChange={(open) => !open && setUpdateMessage("")}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>数据更新提示</DialogTitle><DialogDescription>{updateMessage}</DialogDescription></DialogHeader><DialogFooter><Button onClick={() => setUpdateMessage("")}>确定</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
