"use client"

import { type ReactNode, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, InfoIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldTitle,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  barOption,
  horizontalBarOption,
  lineOption,
  pieOption,
} from "@/features/data-cockpit/chart-options"
import {
  ChartPanel,
  DataTableCard,
  MetricGrid,
  downloadCsv,
  type TableColumn,
} from "@/features/data-cockpit/components/dashboard-primitives"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { getMonthOptions, getPeriodContext, getWeekOptions } from "@/features/data-cockpit/date-utils"
import {
  complaintDistribution,
  deliveryRows,
  deliveryTimeDistribution,
  efficiencyRows,
  overviewMetrics,
  qualityRows,
  timelinessRows,
} from "@/features/data-cockpit/mock-data"
import type {
  DeliveryRow,
  EfficiencyRow,
  KpiMetric,
  Perspective,
  QualityRow,
  PeriodMode,
  TimelinessRow,
} from "@/features/data-cockpit/types"

type PeriodProps = {
  periodMode: PeriodMode
  periodValue: string
  range?: { start: string; end: string }
}

function fitSeries(values: number[], count: number, drift = 0) {
  return Array.from({ length: count }, (_, index) => {
    const source = values[(values.length - count + index + values.length * 10) % values.length]
    return Number((source + drift * Math.floor(index / values.length)).toFixed(3))
  })
}

function withPeriodColumn<Row>(columns: TableColumn<Row>[], unit: PeriodContextUnit) {
  return columns.map((column, index) => index === 0 ? { ...column, label: `${unit}期` } : column)
}

type PeriodContextUnit = "日" | "周" | "月"

function periodRows<Row extends object>(
  labels: string[],
  source: Row[],
  labelKey: keyof Row
) {
  return labels.slice(-12).reverse().map((label, index) => {
    const next = { ...source[index % source.length] } as Row
    ;(next as Record<string, unknown>)[String(labelKey)] = label
    return next
  })
}

function ExpandablePeriodTable<Row extends object>({
  title,
  description,
  columns,
  rows,
  labelKey,
  filename,
  detailNotice,
}: {
  title: string
  description: string
  columns: TableColumn<Row>[]
  rows: Row[]
  labelKey: keyof Row
  filename: string
  detailNotice?: string
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const detailRows = (row: Row, rowIndex: number) => ["Alex Chen", "Maria Garcia", "James Wilson", "Linda Brown"].map((driver, index) => {
    const next = { ...row } as Row
    const record = next as Record<string, unknown>
    record[String(labelKey)] = driver
    for (const column of columns.slice(1)) {
      const key = String(column.key)
      const value = record[key]
      if (typeof value === "number") record[key] = Number((value / (4.1 + index * .15)).toFixed(2))
      else if (typeof value === "string" && value.endsWith("%")) record[key] = `${Math.max(0, Number.parseFloat(value) - index * .08 + rowIndex * .02).toFixed(2)}%`
    }
    return next
  })
  const allRows = rows.flatMap((row, index) => [row, ...detailRows(row, index)])

  return <Card>
    <CardHeader className="grid-cols-1 sm:grid-cols-[1fr_auto]">
      <div><CardTitle>{title}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
      <div className="flex flex-wrap gap-2 sm:justify-self-end">
        <Button variant="outline" size="sm" onClick={() => downloadCsv(`${filename}-汇总`, columns, rows)}><DownloadIcon />导出汇总</Button>
        <Button variant="outline" size="sm" onClick={() => downloadCsv(`${filename}-全部`, columns, allRows)}><DownloadIcon />导出全部</Button>
      </div>
    </CardHeader>
    <CardContent className="-mx-(--card-spacing) -mb-(--card-spacing)">
      {detailNotice ? <Alert className="mx-(--card-spacing) mb-3 w-auto"><InfoIcon /><AlertDescription>{detailNotice}</AlertDescription></Alert> : null}
      <Table variant="grid"><TableHeader><TableRow>{columns.map((column, index) => <TableHead key={String(column.key)}>{index === 0 ? <span className="pl-5">{column.label}</span> : column.label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((row, rowIndex) => {
        const open = expanded === rowIndex
        const children = detailRows(row, rowIndex)
        return <FragmentRow key={rowIndex} row={row} columns={columns} open={open} onToggle={() => setExpanded(open ? null : rowIndex)} childrenRows={children} />
      })}</TableBody></Table>
    </CardContent>
  </Card>
}

function FragmentRow<Row extends object>({ row, columns, open, onToggle, childrenRows }: { row: Row; columns: TableColumn<Row>[]; open: boolean; onToggle: () => void; childrenRows: Row[] }) {
  const value = (item: Row, key: string) => String((item as Record<string, unknown>)[key] ?? "")
  return <>
    <TableRow className="cursor-pointer font-medium" tabIndex={0} onClick={onToggle} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onToggle()}>{columns.map((column, index) => <TableCell key={String(column.key)}>{index === 0 ? <span className="flex items-center gap-1">{open ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}{column.render ? column.render(row) : value(row, String(column.key))}</span> : column.render ? column.render(row) : value(row, String(column.key))}</TableCell>)}</TableRow>
    {open ? childrenRows.map((child, childIndex) => <TableRow key={childIndex} className="bg-muted/35 text-muted-foreground">{columns.map((column, index) => <TableCell key={String(column.key)} className={index === 0 ? "pl-9" : undefined}>{column.render ? column.render(child) : value(child, String(column.key))}</TableCell>)}</TableRow>) : null}
  </>
}

const deliveryColumns: TableColumn<DeliveryRow>[] = [
  { key: "route", label: "路区" },
  { key: "expected", label: "应领件量" },
  { key: "picked", label: "当日领件量" },
  { key: "pickupRate", label: "领件率" },
  { key: "finalPicked", label: "final领件量" },
  { key: "finalPickupRate", label: "final领件率" },
  { key: "delivered", label: "派送总量" },
  { key: "completed", label: "妥投量" },
  { key: "exception", label: "派送异常量" },
]

const efficiencyColumns: TableColumn<EfficiencyRow>[] = [
  { key: "route", label: "路区" },
  { key: "delivery", label: "派送总量" },
  { key: "pph", label: "PPH" },
  { key: "sortingHours", label: "分拣时长" },
  { key: "firstStopHours", label: "首单时长" },
  { key: "deliveryHours", label: "派件时长" },
  { key: "workingHours", label: "司机工作时长" },
  { key: "avgSortingHours", label: "人均分拣时长", render: (row) => (row.sortingHours / 45).toFixed(2), exportValue: (row) => (row.sortingHours / 45).toFixed(2) },
  { key: "avgFirstStopHours", label: "人均首单时长", render: (row) => (row.firstStopHours / 45).toFixed(2), exportValue: (row) => (row.firstStopHours / 45).toFixed(2) },
  { key: "avgDeliveryHours", label: "人均派件时长", render: (row) => (row.deliveryHours / 45).toFixed(2), exportValue: (row) => (row.deliveryHours / 45).toFixed(2) },
  { key: "avgWorkingHours", label: "人均工作时长", render: (row) => (row.workingHours / 45).toFixed(2), exportValue: (row) => (row.workingHours / 45).toFixed(2) },
]

const timelinessColumns: TableColumn<TimelinessRow>[] = [
  { key: "route", label: "路区" },
  { key: "assigned", label: "应派件量", render: (row) => 380 + row.undelivered * 3, exportValue: (row) => 380 + row.undelivered * 3 },
  { key: "pod2400Amount", label: "2400妥投量", render: (row) => Math.round((380 + row.undelivered * 3) * Number.parseFloat(row.pod2400) / 100), exportValue: (row) => Math.round((380 + row.undelivered * 3) * Number.parseFloat(row.pod2400) / 100) },
  { key: "pod2400", label: "2400妥投率" },
  { key: "pod4800Amount", label: "4800妥投量", render: (row) => Math.round((380 + row.undelivered * 3) * Number.parseFloat(row.pod4800) / 100), exportValue: (row) => Math.round((380 + row.undelivered * 3) * Number.parseFloat(row.pod4800) / 100) },
  { key: "pod4800", label: "4800妥投率" },
  { key: "pod72hAmount", label: "72H完结量", render: (row) => Math.round((380 + row.undelivered * 3) * Number.parseFloat(row.pod72h) / 100), exportValue: (row) => Math.round((380 + row.undelivered * 3) * Number.parseFloat(row.pod72h) / 100) },
  { key: "undelivered", label: "72H未完结量" },
  { key: "pod72h", label: "72H完结率" },
  { key: "finalCompleted", label: "最终妥投量", render: (row) => 380 + row.undelivered * 2, exportValue: (row) => 380 + row.undelivered * 2 },
]

const qualityColumns: TableColumn<QualityRow>[] = [
  { key: "route", label: "路区" },
  { key: "podSample", label: "POD抽检量", render: () => 420, exportValue: () => 420 },
  { key: "podNoncompliant", label: "POD不合规量", render: (row) => Math.round(420 * (100 - Number.parseFloat(row.podComplianceRate)) / 100), exportValue: (row) => Math.round(420 * (100 - Number.parseFloat(row.podComplianceRate)) / 100) },
  { key: "fakeSignRate", label: "虚假签收率" },
  { key: "podComplianceRate", label: "POD合规率" },
  { key: "suspectedBreakAmount", label: "DSP疑似断更量", render: (row) => Math.max(1, Math.round(Number.parseFloat(row.breakRate) * 18)), exportValue: (row) => Math.max(1, Math.round(Number.parseFloat(row.breakRate) * 18)) },
  { key: "breakAmount", label: "DSP断更量", render: (row) => Math.max(0, Math.round(Number.parseFloat(row.breakRate) * 9)), exportValue: (row) => Math.max(0, Math.round(Number.parseFloat(row.breakRate) * 9)) },
  { key: "breakRate", label: "DSP断更率" },
  { key: "dnrAmount", label: "DNR量", render: (row) => Math.round(Number.parseFloat(row.dnrRate) * 4), exportValue: (row) => Math.round(Number.parseFloat(row.dnrRate) * 4) },
  { key: "dnrRate", label: "DNR率" },
  { key: "complaintAmount", label: "客诉量", render: (row) => Math.round(Number.parseFloat(row.complaintRate) * 5), exportValue: (row) => Math.round(Number.parseFloat(row.complaintRate) * 5) },
  { key: "complaintRate", label: "客诉率" },
  { key: "validComplaintAmount", label: "有效客诉量", render: (row) => Math.round(Number.parseFloat(row.validComplaintRate) * 5), exportValue: (row) => Math.round(Number.parseFloat(row.validComplaintRate) * 5) },
  { key: "validComplaintRate", label: "有效客诉率" },
]

export function CapacityTab({
  onMetricDetail,
  periodMode,
  periodValue,
  range,
}: {
  onMetricDetail: (metric: KpiMetric) => void
} & PeriodProps) {
  const [target, setTarget] = useState("98.5")
  const [filter, setFilter] = useState("all")
  const [distributionView, setDistributionView] = useState<"chart" | "list">(
    "chart"
  )
  const [perspective, setPerspective] = useState<Perspective>("driver")
  const [selectedBucket, setSelectedBucket] = useState("妥投量")
  const period = useMemo(() => getPeriodContext(periodMode, periodValue, range), [periodMode, periodValue, range])

  const pickupTrend = useMemo(
    () => {
      const allSeries = [
        { name: "领件率", data: [98.7, 99.0, 98.9, 99.2, 99.1, 98.8, 99.3, 99.0, 98.9, 99.2, 99.1, 99.01] },
        { name: "final领件率", data: [99.2, 99.4, 99.3, 99.5, 99.4, 99.3, 99.6, 99.5, 99.4, 99.6, 99.5, 99.48] },
      ]
      const visible = target === "none" || filter === "all" ? allSeries : allSeries.filter((item) => filter === "pass" ? item.data.at(-1)! >= Number(target) : item.data.at(-1)! < Number(target))
      return lineOption(period.labels, visible.map((item) => ({ ...item, data: fitSeries(item.data, period.labels.length) })), { percent: true, target: target === "none" ? undefined : Number(target) })
    },
    [filter, period.labels, target]
  )

  const volume = useMemo(
    () =>
      barOption(period.labels, [
        { name: "妥投量", data: fitSeries([1720, 1745, 1780, 1810, 1775, 1805, 1790, 1820, 1845, 1812, 1834, 1820], period.labels.length, 3), stack: "delivery" },
        { name: "派送异常量", data: fitSeries([42, 38, 45, 41, 49, 44, 40, 43, 39, 42, 41, 36], period.labels.length), stack: "delivery" },
      ]),
    [period.labels]
  )

  const detailNames =
    perspective === "driver"
      ? ["Alex Chen", "Maria Garcia", "James Wilson", "Linda Brown", "Robert Davis"]
      : perspective === "route"
        ? deliveryRows.map((row) => row.route)
        : ["32801", "32803", "32805", "32807", "32809"]
  const detailValues =
    perspective === "driver"
      ? [186, 173, 169, 158, 152]
      : perspective === "route"
        ? deliveryRows.map((row) => row.completed)
        : [342, 328, 317, 305, 292]

  return (
    <div className="flex flex-col gap-4">
      <MetricGrid
        metrics={overviewMetrics.capacity}
        onDetail={onMetricDetail}
      />

      <ChartPanel
        title="领件趋势"
        description={`${period.display} · 领件率与 final 领件率`}
        action={
          <div className="flex items-center gap-2">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger size="sm" aria-label="选择目标线">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="98.5">目标 98.5%</SelectItem>
                  <SelectItem value="none">不展示</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger size="sm" aria-label="选择达标筛选">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pass">仅已达标</SelectItem>
                  <SelectItem value="fail">仅未达标</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <EChartsChart option={pickupTrend} />
        {target !== "none" ? (
          <p className="text-xs text-muted-foreground">
            当前目标线：{target}% · 筛选：{filter === "all" ? "全部" : filter === "pass" ? "仅已达标" : "仅未达标"}
          </p>
        ) : null}
      </ChartPanel>

      <ChartPanel title="派送总量构成" description={period.display}>
        <EChartsChart option={volume} />
      </ChartPanel>

      <ChartPanel
        title="妥投时效分布"
        description={`${selectedBucket} · 点击环形图切换分布明细`}
        action={
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            size="sm"
            value={distributionView}
            onValueChange={(value) =>
              value && setDistributionView(value as "chart" | "list")
            }
            aria-label="分布展示方式"
          >
            <ToggleGroupItem value="chart">图表视图</ToggleGroupItem>
            <ToggleGroupItem value="list">列表视图</ToggleGroupItem>
          </ToggleGroup>
        }
      >
        {distributionView === "chart" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <EChartsChart
              option={pieOption(deliveryTimeDistribution, "妥投量")}
              onChartClick={(event) =>
                setSelectedBucket(String(event.name ?? "妥投量"))
              }
            />
            <div className="flex min-w-0 flex-col gap-3">
              <Field orientation="horizontal" className="w-auto">
                <FieldTitle id="capacity-perspective">分布视角</FieldTitle>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  size="sm"
                  value={perspective}
                  onValueChange={(value) =>
                    value && setPerspective(value as Perspective)
                  }
                  aria-labelledby="capacity-perspective"
                >
                  <ToggleGroupItem value="driver">司机</ToggleGroupItem>
                  <ToggleGroupItem value="route">路区</ToggleGroupItem>
                  <ToggleGroupItem value="postal">邮编</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <EChartsChart
                option={horizontalBarOption(
                  detailNames,
                  detailValues,
                  selectedBucket
                )}
              />
            </div>
          </div>
        ) : (
          <DataTableCard
            title={`${selectedBucket}分布列表`}
            columns={[
              { key: "name", label: perspective === "driver" ? "司机" : perspective === "route" ? "路区" : "邮编" },
              { key: "value", label: "妥投量" },
            ]}
            rows={detailNames.map((name, index) => ({
              name,
              value: detailValues[index],
            }))}
            filename="妥投时效分布"
          />
        )}
      </ChartPanel>

      <ExpandablePeriodTable
        title="数据明细表"
        description={`按${period.unit}汇总，点击周期展开司机明细`}
        columns={withPeriodColumn(deliveryColumns, period.unit)}
        rows={periodRows(period.labels, deliveryRows, "route")}
        labelKey="route"
        filename="产能数据明细"
      />
    </div>
  )
}

export function EfficiencyTab({
  onMetricDetail,
  periodMode,
  periodValue,
  range,
}: {
  onMetricDetail: (metric: KpiMetric) => void
} & PeriodProps) {
  const [trendView, setTrendView] = useState<"total" | "average">("total")
  const [structureView, setStructureView] = useState<"total" | "average">(
    "total"
  )
  const period = useMemo(() => getPeriodContext(periodMode, periodValue, range), [periodMode, periodValue, range])

  const metrics: KpiMetric[] = [
    { label: "派送总量", value: "1,856", detailType: "delivery" },
    { label: "PPH", value: "28.5", detailType: "pph" },
    { label: "派件时长", value: "189h", change: "人均 4.2h", detailType: "hours" },
    { label: "分拣时长", value: "81h", change: "人均 1.8h", detailType: "hours" },
    { label: "首单时长", value: "99h", change: "人均 2.2h", detailType: "hours" },
  ]

  const pphTrend = useMemo(
    () =>
      lineOption(period.labels, [
        { name: "派送总量", data: fitSeries([1762, 1783, 1825, 1810, 1833, 1796, 1844, 1827, 1851, 1838, 1849, 1856], period.labels.length, 2) },
        { name: "PPH", data: fitSeries([27.1, 27.5, 28.0, 27.8, 28.2, 27.6, 28.8, 28.3, 28.9, 28.6, 28.7, 28.5], period.labels.length) },
      ]),
    [period.labels]
  )
  const hourFactor = trendView === "total" ? 1 : 1 / 45
  const hourTrend = useMemo(
    () =>
      lineOption(period.labels, [
        { name: "分拣时长", data: fitSeries([86, 84, 83, 85, 82, 84, 80, 82, 79, 81, 80, 81], period.labels.length).map((value) => Number((value * hourFactor).toFixed(1))) },
        { name: "首单时长", data: fitSeries([104, 102, 101, 100, 103, 99, 101, 98, 100, 98, 99, 99], period.labels.length).map((value) => Number((value * hourFactor).toFixed(1))) },
        { name: "派件时长", data: fitSeries([198, 196, 194, 192, 195, 191, 190, 193, 188, 190, 189, 189], period.labels.length).map((value) => Number((value * hourFactor).toFixed(1))) },
      ]),
    [hourFactor, period.labels]
  )
  const structureFactor = structureView === "total" ? 1 : 1 / 45
  const structure = useMemo(
    () =>
      barOption(["当前周期"], [
        { name: "分拣时长", data: [Number((81 * structureFactor).toFixed(1))], stack: "hours" },
        { name: "首单时长", data: [Number((99 * structureFactor).toFixed(1))], stack: "hours" },
        { name: "派件时长", data: [Number((189 * structureFactor).toFixed(1))], stack: "hours" },
      ]),
    [structureFactor]
  )

  return (
    <div className="flex flex-col gap-4">
      <MetricGrid metrics={metrics} onDetail={onMetricDetail} />
      <ChartPanel title="PPH趋势（派送总量 & PPH）" description={period.display}>
        <EChartsChart option={pphTrend} />
      </ChartPanel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
        <ChartPanel
          title="工时趋势"
          action={
            <TimeViewToggle value={trendView} onChange={setTrendView} />
          }
        >
          <EChartsChart option={hourTrend} />
        </ChartPanel>
        <ChartPanel
          title="工时结构拆解"
          action={
            <TimeViewToggle value={structureView} onChange={setStructureView} />
          }
        >
          <EChartsChart option={structure} />
        </ChartPanel>
      </div>
      <ExpandablePeriodTable
        title="数据明细表"
        description={`按${period.unit}汇总，点击周期展开司机明细`}
        columns={withPeriodColumn(efficiencyColumns, period.unit)}
        rows={periodRows(period.labels, efficiencyRows, "route")}
        labelKey="route"
        filename="人效数据明细"
      />
    </div>
  )
}

function TimeViewToggle({
  value,
  onChange,
}: {
  value: "total" | "average"
  onChange: (value: "total" | "average") => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      size="sm"
      value={value}
      onValueChange={(next) =>
        next && onChange(next as "total" | "average")
      }
      aria-label="工时展示方式"
    >
      <ToggleGroupItem value="total">总时长</ToggleGroupItem>
      <ToggleGroupItem value="average">人均时长</ToggleGroupItem>
    </ToggleGroup>
  )
}

export function TimelinessTab({
  onMetricDetail,
  periodMode,
  periodValue,
  range,
}: {
  onMetricDetail: (metric: KpiMetric) => void
} & PeriodProps) {
  const [target, setTarget] = useState("2400")
  const [filter, setFilter] = useState("all")
  const period = useMemo(() => getPeriodContext(periodMode, periodValue, range), [periodMode, periodValue, range])
  const selectedDate = periodMode === "day" ? new Date(`${periodValue}T00:00:00`) : null
  const dayGap = selectedDate ? Math.floor((new Date().setHours(0, 0, 0, 0) - selectedDate.getTime()) / 86400000) : 99
  const today = new Date()
  const isLatestClosedWeek = periodMode === "week" && periodValue === getWeekOptions().at(-2)?.value
  const isLatestClosedMonth = periodMode === "month" && periodValue === getMonthOptions().at(-2)?.value
  const pod4800Updating = (periodMode === "day" && dayGap < 2) || (isLatestClosedWeek && today.getDay() === 1) || (isLatestClosedMonth && today.getDate() === 1)
  const pod72hUpdating = (periodMode === "day" && dayGap < 3) || (isLatestClosedWeek && [1, 2].includes(today.getDay())) || (isLatestClosedMonth && today.getDate() <= 2)
  const metrics: KpiMetric[] = [
    { label: "2400妥投率", value: "92.3%", target: "目标 ≥ 96.0%", status: "达标", assessment: true, detailType: "2400" },
    { label: "4800妥投率", value: "97.8%", target: "目标 ≥ 98.5%", status: pod4800Updating ? "更新中" : "达标", assessment: true, detailType: "4800" },
    { label: "72H完结率", value: "99.2%", target: "目标 ≥ 98.5%", status: pod72hUpdating ? "更新中" : "达标", assessment: true, detailType: "7200" },
    { label: "72H未完结量", value: "14", change: "查看运单", detailType: "undelivered" },
  ]
  const trend = useMemo(
    () => {
      const allSeries = [
          { name: "2400妥投率", data: [91.4, 92.0, 93.1, 92.7, 94.0, 93.6, 94.8, 94.2, 93.9, 94.7, 95.1, 92.3] },
          { name: "4800妥投率", data: [97.0, 97.3, 97.8, 98.0, 98.1, 97.9, 98.3, 98.0, 98.2, 98.1, 98.4, 97.8] },
          { name: "72H完结率", data: [98.8, 99.0, 99.1, 99.0, 99.3, 99.2, 99.4, 99.3, 99.1, 99.4, 99.3, 99.2] },
        ]
      const targetValue = target === "2400" ? 96 : 98.5
      const visible = target === "none" || filter === "all" ? allSeries : allSeries.filter((item) => filter === "pass" ? item.data.at(-1)! >= targetValue : item.data.at(-1)! < targetValue)
      return lineOption(
        period.labels,
        visible.map((item) => ({ ...item, data: fitSeries(item.data, period.labels.length) })),
        { percent: true, target: target === "none" ? undefined : targetValue }
      )
    },
    [filter, period.labels, target]
  )

  return (
    <div className="flex flex-col gap-4">
      <MetricGrid metrics={metrics} onDetail={onMetricDetail} />
      <ChartPanel
        title="时效趋势图"
        description={period.display}
        action={
          <div className="flex items-center gap-2">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger size="sm" aria-label="选择时效目标线">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="2400">2400目标 96%</SelectItem>
                  <SelectItem value="4800">4800目标 98.5%</SelectItem>
                  <SelectItem value="7200">72H目标 98.5%</SelectItem>
                  <SelectItem value="none">不展示</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger size="sm" aria-label="选择时效达标筛选">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pass">仅已达标</SelectItem>
                  <SelectItem value="fail">仅未达标</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <EChartsChart option={trend} />
      </ChartPanel>
      <ExpandablePeriodTable
        title="数据明细表（点击展开司机明细）"
        description={`按${period.unit}汇总；近期开口径指标会标记为“更新中”`}
        columns={withPeriodColumn(timelinessColumns, period.unit)}
        rows={periodRows(period.labels, timelinessRows, "route")}
        labelKey="route"
        filename="时效数据明细"
      />
    </div>
  )
}

export function QualityTab({
  onMetricDetail,
  periodMode,
  periodValue,
  range,
}: {
  onMetricDetail: (metric: KpiMetric) => void
} & PeriodProps) {
  const [complaintMode, setComplaintMode] = useState<"complaint" | "valid">(
    "complaint"
  )
  const [perspective, setPerspective] = useState<"driver" | "route">("driver")
  const [integrityTarget, setIntegrityTarget] = useState("0.1")
  const [integrityFilter, setIntegrityFilter] = useState("all")
  const [safetyTarget, setSafetyTarget] = useState("0.5")
  const [safetyFilter, setSafetyFilter] = useState("all")
  const integrityRef = useRef<HTMLDivElement>(null)
  const safetyRef = useRef<HTMLDivElement>(null)
  const complaintRef = useRef<HTMLDivElement>(null)
  const period = useMemo(() => getPeriodContext(periodMode, periodValue, range), [periodMode, periodValue, range])

  const integrityMetrics: KpiMetric[] = [
    { label: "虚假签收率", value: "0.08%", target: "目标 ≤ 0.1%", status: "达标", detailType: "fake-sign" },
    { label: "POD合规率", value: "97.5%", detailType: "pod" },
    { label: "POD不合规量", value: "42", change: "查看运单详情", detailType: "pod-noncompliance" },
    { label: "虚假签收量", value: "2", change: "查看运单详情", detailType: "fake-sign-count" },
  ]
  const safetyMetrics: KpiMetric[] = [
    { label: "DSP疑似断更率", value: "0.08%", detailType: "suspected-break" },
    { label: "DSP断更率", value: "0.12%", target: "目标 ≤ 0.5%", status: "达标", detailType: "break" },
    { label: "DSP疑似断更量", value: "5", change: "查看运单详情", detailType: "suspected-break-count" },
    { label: "DSP断更量", value: "3", change: "查看运单详情", detailType: "break-count" },
  ]
  const complaintMetrics: KpiMetric[] = [
    { label: "DNR率", value: "1.2%", detailType: "dnr" },
    { label: "客诉率", value: "0.66%", detailType: "complaint-rate" },
    { label: "有效客诉率", value: "0.27%", detailType: "valid-complaint-rate" },
    { label: "DNR量", value: "8", change: "查看运单详情", detailType: "dnr-count" },
    { label: "客诉量", value: "12", change: "查看运单详情", detailType: "complaint-count" },
    { label: "有效客诉量", value: "5", change: "查看运单详情", detailType: "valid-complaint-count" },
  ]

  const integrityTrend = useMemo(
    () => lineOption(period.labels, [
      ...(integrityFilter === "fail" ? [] : [{ name: "虚假签收率", data: fitSeries([0.12, 0.11, 0.09, 0.1, 0.08, 0.09, 0.07, 0.08, 0.08, 0.07, 0.09, 0.08], period.labels.length) }]),
      { name: "POD合规率", data: fitSeries([95.8, 96.1, 96.5, 96.8, 97.0, 96.9, 97.2, 97.1, 97.4, 97.3, 97.6, 97.5], period.labels.length) },
    ], { target: integrityTarget === "none" ? undefined : Number(integrityTarget), percent: true }),
    [integrityFilter, integrityTarget, period.labels]
  )
  const safetyTrend = useMemo(
    () => lineOption(period.labels, [
        { name: "DSP疑似断更率", data: fitSeries([0.17, 0.15, 0.14, 0.13, 0.11, 0.12, 0.1, 0.11, 0.09, 0.1, 0.09, 0.08], period.labels.length) },
        ...(safetyFilter === "fail" ? [] : [
        { name: "DSP断更率", data: fitSeries([0.25, 0.22, 0.2, 0.18, 0.17, 0.16, 0.15, 0.14, 0.15, 0.13, 0.12, 0.12], period.labels.length) },
        ]),
      ], { target: safetyTarget === "none" ? undefined : Number(safetyTarget), percent: true }),
    [period.labels, safetyFilter, safetyTarget]
  )
  const complaintTrend = useMemo(
    () =>
      lineOption(period.labels, [
        { name: "DNR率", data: fitSeries([1.7, 1.6, 1.5, 1.6, 1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.2], period.labels.length) },
        { name: "客诉率", data: fitSeries([0.91, 0.86, 0.82, 0.8, 0.77, 0.75, 0.72, 0.71, 0.69, 0.68, 0.67, 0.66], period.labels.length) },
        { name: "有效客诉率", data: fitSeries([0.41, 0.39, 0.36, 0.35, 0.33, 0.32, 0.3, 0.29, 0.28, 0.28, 0.27, 0.27], period.labels.length) },
      ]),
    [period.labels]
  )
  const selectedDistribution =
    complaintMode === "complaint"
      ? complaintDistribution
      : complaintDistribution.map((item) => ({
          ...item,
          value: Math.max(0, Math.round(item.value * 0.42)),
        }))
  const detailLabels =
    perspective === "driver"
      ? ["Alex Chen", "Maria Garcia", "James Wilson", "Linda Brown", "Robert Davis"]
      : qualityRows.map((row) => row.route)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => integrityRef.current?.scrollIntoView({ behavior: "smooth" })}>诚信与妥投质量</Button>
        <Button variant="outline" size="sm" onClick={() => safetyRef.current?.scrollIntoView({ behavior: "smooth" })}>安全</Button>
        <Button variant="outline" size="sm" onClick={() => complaintRef.current?.scrollIntoView({ behavior: "smooth" })}>客诉</Button>
      </div>
      <div ref={integrityRef}><QualitySection
        title="诚信与妥投质量"
        metrics={integrityMetrics}
        chartTitle="诚信与妥投质量趋势图"
        chart={integrityTrend}
        onMetricDetail={onMetricDetail}
        action={<TargetControls target={integrityTarget} onTargetChange={setIntegrityTarget} filter={integrityFilter} onFilterChange={setIntegrityFilter} targetOptions={[{ value: "0.1", label: "虚假签收率目标(0.1%)" }]} />}
      /></div>
      <div ref={safetyRef}><QualitySection
        title="安全"
        metrics={safetyMetrics}
        chartTitle="断更趋势图"
        chart={safetyTrend}
        onMetricDetail={onMetricDetail}
        action={<TargetControls target={safetyTarget} onTargetChange={setSafetyTarget} filter={safetyFilter} onFilterChange={setSafetyFilter} targetOptions={[{ value: "0.5", label: "DSP断更率目标(0.5%)" }]} />}
      /></div>
      <div ref={complaintRef}><Card>
        <CardHeader>
          <CardTitle>客诉</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <MetricGrid metrics={complaintMetrics} onDetail={onMetricDetail} />
          <ChartPanel title="客诉指标趋势" description={period.display}>
            <EChartsChart option={complaintTrend} />
          </ChartPanel>
          <ChartPanel
            title="客诉分布"
            action={
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                size="sm"
                value={complaintMode}
                onValueChange={(value) =>
                  value &&
                  setComplaintMode(value as "complaint" | "valid")
                }
                aria-label="客诉分布类型"
              >
                <ToggleGroupItem value="complaint">客诉</ToggleGroupItem>
                <ToggleGroupItem value="valid">有效客诉</ToggleGroupItem>
              </ToggleGroup>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <EChartsChart
                option={pieOption(
                  selectedDistribution,
                  complaintMode === "complaint" ? "客诉量" : "有效客诉量"
                )}
              />
              <div className="flex min-w-0 flex-col gap-3">
                <Field orientation="horizontal" className="w-auto">
                  <FieldTitle id="quality-perspective">分布视角</FieldTitle>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={0}
                    size="sm"
                    value={perspective}
                    onValueChange={(value) =>
                      value &&
                      setPerspective(value as "driver" | "route")
                    }
                    aria-labelledby="quality-perspective"
                  >
                    <ToggleGroupItem value="driver">司机</ToggleGroupItem>
                    <ToggleGroupItem value="route">路区</ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                <EChartsChart
                  option={horizontalBarOption(
                    detailLabels,
                    perspective === "driver"
                      ? [4, 3, 2, 2, 1]
                      : [3, 3, 2, 2, 2],
                    complaintMode === "complaint" ? "客诉量" : "有效客诉量"
                  )}
                />
              </div>
            </div>
          </ChartPanel>
        </CardContent>
      </Card></div>
      <ExpandablePeriodTable
        title="数据明细表"
        description={`按${period.unit}汇总，点击周期展开司机明细`}
        columns={withPeriodColumn(qualityColumns, period.unit)}
        rows={periodRows(period.labels, qualityRows, "route")}
        labelKey="route"
        filename="质量数据明细"
        detailNotice="司机维度仅展示数量；DNR率、客诉率和有效客诉率按DSP口径计算，不下钻到司机。"
      />
    </div>
  )
}

function QualitySection({
  title,
  metrics,
  chartTitle,
  chart,
  action,
  onMetricDetail,
}: {
  title: string
  metrics: KpiMetric[]
  chartTitle: string
  chart: ReturnType<typeof lineOption>
  action?: ReactNode
  onMetricDetail: (metric: KpiMetric) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <MetricGrid metrics={metrics} onDetail={onMetricDetail} />
        <ChartPanel title={chartTitle} action={action}>
          <EChartsChart option={chart} />
        </ChartPanel>
      </CardContent>
    </Card>
  )
}

function TargetControls({ target, onTargetChange, filter, onFilterChange, targetOptions }: { target: string; onTargetChange: (value: string) => void; filter: string; onFilterChange: (value: string) => void; targetOptions: Array<{ value: string; label: string }> }) {
  return <div className="flex items-center gap-2">
    <Select value={target} onValueChange={onTargetChange}><SelectTrigger size="sm" aria-label="选择目标线"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{targetOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}<SelectItem value="none">不展示</SelectItem></SelectGroup></SelectContent></Select>
    <Select value={filter} onValueChange={onFilterChange}><SelectTrigger size="sm" aria-label="选择达标筛选"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem value="pass">仅已达标</SelectItem><SelectItem value="fail">仅未达标</SelectItem></SelectGroup></SelectContent></Select>
  </div>
}
