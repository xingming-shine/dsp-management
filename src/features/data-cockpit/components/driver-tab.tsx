"use client"

import { useMemo, useState } from "react"
import { HistoryIcon, SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  barOption,
  lineOption,
  pieOption,
  radarOption,
} from "@/features/data-cockpit/chart-options"
import {
  ChartPanel,
  DataTableCard,
  MetricGrid,
  type TableColumn,
} from "@/features/data-cockpit/components/dashboard-primitives"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import { getMonthOptions, resolveDriverMonth } from "@/features/data-cockpit/date-utils"
import { formatDate, formatMonth } from "@/lib/date-time"
import {
  driverHistory,
  drivers,
  monthlyLabels,
  overviewMetrics,
} from "@/features/data-cockpit/mock-data"
import type {
  DriverHistoryRow,
  DriverRow,
} from "@/features/data-cockpit/types"

function getDriverColumns(onHistory: (driver: DriverRow) => void): TableColumn<DriverRow>[] {
 return [
  { key: "index", label: "#", render: (row) => drivers.indexOf(row) + 1 },
  { key: "name", label: "司机" },
  { key: "tenure", label: "在职时长", render: (row) => `${(drivers.indexOf(row) % 3) + 1}年${(drivers.indexOf(row) * 3) % 12}月` },
  { key: "route", label: "路区" },
  {
    key: "active",
    label: "是否活跃",
    render: (row) => (
      <Badge variant={row.active ? "secondary" : "outline"}>
        {row.active ? "活跃" : "非活跃"}
      </Badge>
    ),
  },
  { key: "star", label: "星级", render: (row) => `${row.star}★` },
  { key: "score", label: "司机分数" },
  { key: "service", label: "服务分" },
  { key: "quality", label: "质量分" },
  { key: "efficiency", label: "效率分" },
  { key: "redline", label: "红线行为量" },
  { key: "dspRank", label: "DSP排名" },
  { key: "stationRank", label: "全站点排名" },
  { key: "history", label: "操作", render: (row) => <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); onHistory(row) }}><HistoryIcon data-icon="inline-start" />司机历史表现</Button> },
 ]
}

const historyColumns: TableColumn<DriverHistoryRow>[] = [
  { key: "month", label: "月份", render: (row) => formatMonth(row.month), exportValue: (row) => formatMonth(row.month) },
  { key: "star", label: "星级", render: (row) => `${row.star}★` },
  { key: "score", label: "司机分数" },
  { key: "service", label: "服务分" },
  { key: "quality", label: "质量分" },
  { key: "efficiency", label: "效率分" },
]

export function DriverTab() {
  const [selectedDriver, setSelectedDriver] = useState<DriverRow | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyDriverId, setHistoryDriverId] = useState(drivers[0].id)
  const [historyMonth, setHistoryMonth] = useState(
    monthlyLabels.at(-1) ?? ""
  )
  const [updateMessage, setUpdateMessage] = useState("")
  const historyDriver =
    drivers.find((driver) => driver.id === historyDriverId) ?? drivers[0]
  const driverColumns = useMemo(() => getDriverColumns((driver) => { setHistoryDriverId(driver.id); setHistoryOpen(true) }), [])

  const starDistribution = useMemo(
    () =>
      pieOption(
        [
          { name: "5星", value: 8 },
          { name: "4星", value: 14 },
          { name: "3星", value: 13 },
          { name: "2星", value: 7 },
          { name: "1星", value: 3 },
        ],
        "45名司机"
      ),
    []
  )
  const driverCountTrend = useMemo(
    () =>
      lineOption(monthlyLabels.map((item) => formatMonth(item)), [
        { name: "派件司机人数", data: [38, 39, 40, 41, 42, 42, 43, 44, 44, 45, 43, 45] },
        { name: "活跃司机人数", data: [32, 33, 34, 35, 35, 36, 36, 37, 38, 38, 37, 38] },
      ]),
    []
  )
  const performanceTrend = useMemo(
    () =>
      lineOption(monthlyLabels.map((item) => formatMonth(item)), [
        { name: "平均星级", data: [3.6, 3.7, 3.7, 3.8, 3.9, 3.8, 4.0, 4.0, 4.1, 4.0, 4.1, 4.2] },
        { name: "平均分数", data: [82.6, 83.2, 84.1, 84.8, 85.5, 85.1, 86.2, 86.9, 87.4, 87.1, 87.8, 88.5] },
      ]),
    []
  )
  const historyRadar = useMemo(
    () =>
      radarOption(
        [
          { name: "服务", max: 30 },
          { name: "质量", max: 30 },
          { name: "效率", max: 40 },
        ],
        [
          {
            name: historyDriver.name,
            values: [
              historyDriver.service,
              historyDriver.quality,
              historyDriver.efficiency,
            ],
          },
          { name: "DSP平均", values: [26.4, 25.9, 35.8] },
        ]
      ),
    [historyDriver]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">司机表现</h2>
        <Badge variant="secondary">数据每月5号更新</Badge>
        <DriverHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          driver={historyDriver}
          driverId={historyDriverId}
          month={historyMonth}
          onDriverChange={setHistoryDriverId}
          onMonthChange={(requested) => {
            const resolved = resolveDriverMonth(requested)
            setHistoryMonth(resolved.period)
            if (resolved.message) setUpdateMessage(resolved.message)
          }}
          radarOptionValue={historyRadar}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <MetricGrid metrics={overviewMetrics.driver} className="xl:grid-cols-2" />
        <ChartPanel title="司机星级分布">
          <EChartsChart option={starDistribution} />
        </ChartPanel>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>单项排名 Top 5</CardTitle>
          <CardDescription>服务 / 质量 / 效率</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <DriverRankCard title="服务" field="service" onSelect={setSelectedDriver} />
          <DriverRankCard title="质量" field="quality" onSelect={setSelectedDriver} />
          <DriverRankCard title="效率" field="efficiency" onSelect={setSelectedDriver} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="派件司机数量趋势图"
          description="近12个月趋势"
        >
          <EChartsChart option={driverCountTrend} />
        </ChartPanel>
        <ChartPanel title="司机表现趋势" description="近12个月趋势">
          <EChartsChart option={performanceTrend} />
        </ChartPanel>
      </div>

      <Tabs defaultValue="overall">
        <TabsList variant="line">
          <TabsTrigger value="overall">司机综合表现</TabsTrigger>
          <TabsTrigger value="score">司机分数明细</TabsTrigger>
        </TabsList>
        <TabsContent value="overall">
          <DataTableCard
            title="司机综合表现"
            columns={driverColumns}
            rows={drivers}
            filename="司机综合表现"
            variant="grid"
            onRowClick={setSelectedDriver}
          />
        </TabsContent>
        <TabsContent value="score">
          <DriverScoreTable onRowClick={setSelectedDriver} />
        </TabsContent>
      </Tabs>

      <DriverDetailDialog
        driver={selectedDriver}
        onOpenChange={(open) => {
          if (!open) setSelectedDriver(null)
        }}
      />
      <Dialog open={Boolean(updateMessage)} onOpenChange={(open) => !open && setUpdateMessage("")}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>数据更新提示</DialogTitle><DialogDescription>{updateMessage}</DialogDescription></DialogHeader><Button onClick={() => setUpdateMessage("")}>确定</Button></DialogContent></Dialog>
    </div>
  )
}

function DriverRankCard({
  title,
  field,
  onSelect,
}: {
  title: string
  field: "service" | "quality" | "efficiency"
  onSelect: (driver: DriverRow) => void
}) {
  const top = drivers.slice().sort((a, b) => b[field] - a[field]).slice(0, 5)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} Top 5</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3">
          {top.map((driver, index) => (
            <li
              key={driver.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              tabIndex={0}
              onClick={() => onSelect(driver)}
              onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onSelect(driver)}
            >
              <span className="min-w-0 truncate">
                {index + 1}. {driver.name}
              </span>
              <Badge variant="outline">{driver[field]}</Badge>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function DriverScoreTable({
  onRowClick,
}: {
  onRowClick: (driver: DriverRow) => void
}) {
  type ScoreRow = DriverRow & Record<string, string | number | boolean>
  const rows: ScoreRow[] = drivers.map((driver, index) => ({
    ...driver, tenure: `${(index % 3) + 1}年${(index * 3) % 12}月`,
    pickupVolume: 180 - index * 7, pod2400Volume: 172 - index * 7,
    pod2400Rate: `${(98.6 - index * .24).toFixed(2)}%`, pod2400Score: (14.8 - index * .2).toFixed(1),
    pod4800Volume: 177 - index * 7, pod4800Rate: `${(99.5 - index * .15).toFixed(2)}%`, pod4800Score: (9.8 - index * .12).toFixed(1),
    pod72hVolume: 179 - index * 7, pod72hRate: `${(99.8 - index * .1).toFixed(2)}%`, pod72hScore: (4.9 - index * .08).toFixed(1),
    serviceLevel: driver.service >= 28 ? "优秀" : driver.service >= 26 ? "良好" : "关注",
    breakVolume: index % 3, breakRate: `${(index * .02).toFixed(2)}%`, breakScore: (10 - index * .3).toFixed(1),
    fakeSignVolume: index % 2, fakeSignRate: `${(index * .01).toFixed(2)}%`, fakeSignScore: (10 - index * .25).toFixed(1),
    complaintVolume: index % 4, complaintRate: `${(index * .03).toFixed(2)}%`, complaintScore: (10 - index * .35).toFixed(1),
    qualityLevel: driver.quality >= 28 ? "优秀" : driver.quality >= 26 ? "良好" : "关注",
    dailyVolume: (42 - index * 1.3).toFixed(1), dailyScore: (20 - index * .65).toFixed(1), attendanceDays: 28 - index,
    attendanceScore: (20 - index * .55).toFixed(1), efficiencyLevel: driver.efficiency >= 38 ? "优秀" : driver.efficiency >= 35 ? "良好" : "关注",
  }))
  const labels: Array<[string, string]> = [
    ["name", "司机"], ["tenure", "在职时长"], ["active", "是否活跃"], ["star", "星级"], ["score", "总分"], ["redline", "红线行为"],
    ["pickupVolume", "服务分 · 领件量"], ["pod2400Volume", "服务分 · 2400妥投量"], ["pod2400Rate", "2400妥投率"], ["pod2400Score", "得分（15分）"],
    ["pod4800Volume", "服务分 · 4800妥投量"], ["pod4800Rate", "4800妥投率"], ["pod4800Score", "得分（10分）"], ["pod72hVolume", "服务分 · 72H完结量"], ["pod72hRate", "72H完结率"], ["pod72hScore", "得分（5分）"], ["service", "服务分合计"], ["serviceLevel", "服务等级"],
    ["breakVolume", "质量分 · 断更/丢失量"], ["breakRate", "断更/丢失率"], ["breakScore", "得分（10分）"], ["fakeSignVolume", "虚假签收量"], ["fakeSignRate", "虚假签收率"], ["fakeSignScore", "得分（10分）"], ["complaintVolume", "司机客诉量"], ["complaintRate", "司机客诉率"], ["complaintScore", "得分（10分）"], ["quality", "质量分合计"], ["qualityLevel", "质量等级"],
    ["dailyVolume", "效率分 · 日均妥投量"], ["dailyScore", "得分（20分）"], ["attendanceDays", "出勤天数"], ["attendanceScore", "得分（20分）"], ["efficiency", "效率分合计"], ["efficiencyLevel", "效率等级"], ["dspRank", "DSP排名"], ["stationRank", "站点排名"],
  ]
  const scoreColumns: TableColumn<ScoreRow>[] = labels.map(([key, label]) => ({ key, label }))
  return (
    <DataTableCard
      title="司机分数明细"
      columns={scoreColumns}
      rows={rows}
      filename="司机分数明细"
      variant="grid"
      onRowClick={(row) => onRowClick(row)}
    />
  )
}

function DriverHistorySheet({
  open,
  onOpenChange,
  driver,
  driverId,
  month,
  onDriverChange,
  onMonthChange,
  radarOptionValue,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  driver: DriverRow
  driverId: string
  month: string
  onDriverChange: (value: string) => void
  onMonthChange: (value: string) => void
  radarOptionValue: ReturnType<typeof radarOption>
}) {
  const monthOptions = getMonthOptions()
  const [timeMode, setTimeMode] = useState<"single" | "range">("single")
  const [startMonth, setStartMonth] = useState(monthlyLabels.at(-6) ?? monthlyLabels[0])
  const [detailMetric, setDetailMetric] = useState<"service" | "quality" | "efficiency">("service")
  const historyRows = useMemo(() => {
    if (timeMode === "single") return driverHistory.filter((item) => item.month <= month).slice(-12)
    return driverHistory.filter((item) => item.month >= startMonth && item.month <= month).slice(-12)
  }, [month, startMonth, timeMode])
  const filteredOverall = useMemo(() => lineOption(historyRows.map((item) => formatMonth(item.month)), [{ name: "司机分数", data: historyRows.map((item) => item.score) }]), [historyRows])
  const filteredDetail = useMemo(() => lineOption(historyRows.map((item) => formatMonth(item.month)), [{ name: detailMetric === "service" ? "服务" : detailMetric === "quality" ? "质量" : "效率", data: historyRows.map((item) => item[detailMetric]) }]), [detailMetric, historyRows])
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>司机历史表现</SheetTitle>
          <SheetDescription>
            按司机和月份查询近12个月综合表现与分项得分。
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] px-4 pb-6">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>司机姓名</FieldLabel>
                <Select value={driverId} onValueChange={onDriverChange}>
                  <SelectTrigger>
                    <SearchIcon />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {drivers.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <div className="flex items-center justify-between gap-2"><FieldLabel>数据时间</FieldLabel><ToggleGroup type="single" variant="outline" size="sm" spacing={0} value={timeMode} onValueChange={(value) => value && setTimeMode(value as "single" | "range")}><ToggleGroupItem value="single">单月</ToggleGroupItem><ToggleGroupItem value="range">自定义</ToggleGroupItem></ToggleGroup></div>
                <div className="flex items-center gap-2">
                {timeMode === "range" ? <Select value={startMonth} onValueChange={setStartMonth}><SelectTrigger aria-label="开始月份"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{monthlyLabels.filter((item) => item <= month).map((item) => <SelectItem key={item} value={item}>{formatMonth(item)}</SelectItem>)}</SelectGroup></SelectContent></Select> : null}
                <Select value={month} onValueChange={onMonthChange}>
                  <SelectTrigger aria-label={timeMode === "range" ? "结束月份" : "截至月份"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {monthOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                </div>
                {timeMode === "range" ? <p className="text-xs text-muted-foreground">最多查询连续12个月</p> : null}
              </Field>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{driver.name}</CardTitle>
                <CardDescription>
                  {driver.id} · {driver.route} · 当前 {driver.star} 星
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <HistoryStat label="司机分数" value={String(driver.score)} />
                <HistoryStat label="服务分" value={String(driver.service)} />
                <HistoryStat label="质量分" value={String(driver.quality)} />
                <HistoryStat label="效率分" value={String(driver.efficiency)} />
              </CardContent>
            </Card>

            <ChartPanel title="司机综合表现">
              <EChartsChart option={filteredOverall} />
            </ChartPanel>
            <ChartPanel title="多维度分析">
              <EChartsChart option={radarOptionValue} />
            </ChartPanel>
            <ChartPanel title="分项得分趋势" action={<ToggleGroup type="single" variant="outline" spacing={0} size="sm" value={detailMetric} onValueChange={(value) => value && setDetailMetric(value as typeof detailMetric)}><ToggleGroupItem value="service">服务</ToggleGroupItem><ToggleGroupItem value="quality">质量</ToggleGroupItem><ToggleGroupItem value="efficiency">效率</ToggleGroupItem></ToggleGroup>}>
              <EChartsChart option={filteredDetail} />
            </ChartPanel>
            <Tabs defaultValue="overall"><TabsList variant="line"><TabsTrigger value="overall">综合表现</TabsTrigger><TabsTrigger value="score">分数明细</TabsTrigger></TabsList><TabsContent value="overall"><DataTableCard title="历史数据明细" columns={historyColumns} rows={historyRows} filename={`${driver.name}-司机历史表现`} /></TabsContent><TabsContent value="score"><DataTableCard title="历史分数明细" columns={historyColumns.filter((column) => column.key !== "star")} rows={historyRows} filename={`${driver.name}-司机历史分数`} variant="grid" /></TabsContent></Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function DriverDetailDialog({
  driver,
  onOpenChange,
}: {
  driver: DriverRow | null
  onOpenChange: (open: boolean) => void
}) {
  const trend = useMemo(
    () =>
      lineOption(
        ["D-30", "D-27", "D-24", "D-21", "D-18", "D-15", "D-12", "D-9", "D-6", "D-3", "今天"],
        [{ name: "综合评分", data: [91, 92, 91.8, 93, 94.2, 93.8, 95, 95.6, 96.4, 97.1, driver?.score ?? 98.2] }]
      ),
    [driver?.score]
  )
  const metrics = useMemo(
    () =>
      barOption(["服务分", "质量分", "效率分"], [
        {
          name: "得分",
          data: driver
            ? [driver.service, driver.quality, driver.efficiency]
            : [29.5, 29.8, 38.9],
        },
      ]),
    [driver]
  )

  return (
    <Dialog open={Boolean(driver)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{driver?.name ?? "司机详情"}</DialogTitle>
          <DialogDescription>
            {driver ? `${driver.id} · ${driver.route}` : "司机综合表现详情"}
          </DialogDescription>
        </DialogHeader>
        {driver ? (
          <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-4">
              <HistoryStat label="综合评分" value={String(driver.score)} />
              <HistoryStat label="星级" value={`${driver.star}★`} />
              <HistoryStat label="DSP排名" value={`${driver.dspRank}/45`} />
              <HistoryStat label="全站点排名" value={`${driver.stationRank}/287`} />
            </div>
            <Card>
              <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
                <span>入职：{formatDate("2024-03-15")}</span><span>路区：{driver.route}</span><span>出勤率：98%</span>
              </CardContent>
            </Card>
            <ChartPanel title="近30天评分趋势">
              <EChartsChart option={trend} />
            </ChartPanel>
            <ChartPanel title="关键指标趋势">
              <EChartsChart option={metrics} />
            </ChartPanel>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
