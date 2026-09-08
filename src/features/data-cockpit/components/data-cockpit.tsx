"use client"

import Image from "next/image"
import { useMemo, useState, useSyncExternalStore } from "react"
import { AlertTriangleIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Field,
  FieldTitle,
} from "@/components/ui/field"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  horizontalBarOption,
  lineOption,
} from "@/features/data-cockpit/chart-options"
import {
  ChartPanel,
  DataTableCard,
  type TableColumn,
} from "@/features/data-cockpit/components/dashboard-primitives"
import { DriverTab } from "@/features/data-cockpit/components/driver-tab"
import { EChartsChart } from "@/features/data-cockpit/components/echarts-chart"
import {
  CapacityTab,
  EfficiencyTab,
  QualityTab,
  TimelinessTab,
} from "@/features/data-cockpit/components/operations-tabs"
import { OverviewTab } from "@/features/data-cockpit/components/overview-tab"
import { RankingTab } from "@/features/data-cockpit/components/ranking-tab"
import { TimeFilter } from "@/features/data-cockpit/components/time-filter"
import {
  getDefaultPeriod,
} from "@/features/data-cockpit/date-utils"
import {
  cockpitTabs,
  deliveryRows,
  trendLabels,
} from "@/features/data-cockpit/mock-data"
import type {
  CockpitView,
  KpiMetric,
  PeriodMode,
} from "@/features/data-cockpit/types"
import { formatDateTime } from "@/lib/date-time"

const detailViews: CockpitView[] = [
  "capacity",
  "efficiency",
  "timeliness",
  "quality",
]

interface ParcelRow {
  trackingNumber: string
  driver: string
  route: string
  status: string
  updatedAt: string
}

const parcelRows: ParcelRow[] = [
  { trackingNumber: "GF202606180001", driver: "Alex Chen", route: "路区 A-1", status: "待复核", updatedAt: "2026-06-18T18:24:00-04:00" },
  { trackingNumber: "GF202606180002", driver: "Maria Garcia", route: "路区 A-2", status: "派送异常", updatedAt: "2026-06-18T18:10:00-04:00" },
  { trackingNumber: "GF202606180003", driver: "James Wilson", route: "路区 B-1", status: "POD不合规", updatedAt: "2026-06-18T17:56:00-04:00" },
  { trackingNumber: "GF202606180004", driver: "Linda Brown", route: "路区 B-2", status: "未完结", updatedAt: "2026-06-18T17:42:00-04:00" },
  { trackingNumber: "GF202606180005", driver: "Robert Davis", route: "路区 C-1", status: "疑似断更", updatedAt: "2026-06-18T17:31:00-04:00" },
]

const parcelColumns: TableColumn<ParcelRow>[] = [
  { key: "trackingNumber", label: "运单号" },
  { key: "driver", label: "司机" },
  { key: "route", label: "路区" },
  { key: "status", label: "状态" },
  {
    key: "updatedAt",
    label: "更新时间",
    render: (row) => <span className="tabular-nums">{formatDateTime(row.updatedAt)}</span>,
    exportValue: (row) => formatDateTime(row.updatedAt),
  },
]

function isCockpitView(value: string | null): value is CockpitView {
  return cockpitTabs.some((tab) => tab.value === value)
}

function subscribeLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  return () => window.removeEventListener("popstate", onChange)
}

function getLocationView(): CockpitView {
  const queryView = new URLSearchParams(window.location.search).get("view")
  return isCockpitView(queryView) ? queryView : "overview"
}

export function DataCockpit() {
  const view = useSyncExternalStore<CockpitView>(
    subscribeLocation,
    getLocationView,
    (): CockpitView => "overview"
  )
  const [periodMode, setPeriodMode] = useState<PeriodMode>("day")
  const [periodValue, setPeriodValue] = useState(getDefaultPeriod("day"))
  const [range, setRange] = useState<{ start: string; end: string }>()
  const [detailMetric, setDetailMetric] = useState<KpiMetric | null>(null)

  const changeView = (next: string) => {
    if (!isCockpitView(next)) return
    const url = new URL(window.location.href)
    if (next === "overview") {
      url.searchParams.delete("view")
    } else {
      url.searchParams.set("view", next)
    }
    window.history.replaceState(null, "", url)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }

  return (
    <div className="relative -m-4 flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4">
      <Image
        src="/assets/dsp-ranking/data-cockpit-page-bg.png"
        alt=""
        width={1986}
        height={792}
        priority
        sizes="100vw"
        className="pointer-events-none absolute right-0 -top-[45px] h-auto w-full object-contain object-right-top"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <Tabs value={view} onValueChange={changeView} className="relative z-10 gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList variant="line">
            {cockpitTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {detailViews.includes(view) ? (
          <Card size="sm">
            <CardContent>
              <TimeFilter
                mode={periodMode}
                value={periodValue}
                range={range}
                onModeChange={setPeriodMode}
                onValueChange={setPeriodValue}
                onRangeChange={setRange}
              />
            </CardContent>
          </Card>
        ) : null}

        <TabsContent value="overview">
          <OverviewTab
            onNavigate={changeView}
            onMetricDetail={setDetailMetric}
          />
        </TabsContent>
        <TabsContent value="ranking">
          <RankingTab />
        </TabsContent>
        <TabsContent value="capacity">
          <CapacityTab onMetricDetail={setDetailMetric} periodMode={periodMode} periodValue={periodValue} range={range} />
        </TabsContent>
        <TabsContent value="efficiency">
          <EfficiencyTab onMetricDetail={setDetailMetric} periodMode={periodMode} periodValue={periodValue} range={range} />
        </TabsContent>
        <TabsContent value="timeliness">
          <TimelinessTab onMetricDetail={setDetailMetric} periodMode={periodMode} periodValue={periodValue} range={range} />
        </TabsContent>
        <TabsContent value="quality">
          <QualityTab onMetricDetail={setDetailMetric} periodMode={periodMode} periodValue={periodValue} range={range} />
        </TabsContent>
        <TabsContent value="driver">
          <DriverTab />
        </TabsContent>
      </Tabs>

      <MetricDetailDialog
        metric={detailMetric}
        onOpenChange={(open) => {
          if (!open) setDetailMetric(null)
        }}
      />
    </div>
  )
}

function MetricDetailDialog({
  metric,
  onOpenChange,
}: {
  metric: KpiMetric | null
  onOpenChange: (open: boolean) => void
}) {
  const [perspective, setPerspective] = useState<"driver" | "route">("driver")
  const isParcelDetail =
    metric?.detailType === "undelivered" ||
    metric?.detailType?.endsWith("-count") ||
    metric?.detailType === "pod-noncompliance"
  const hasNoComplaintBreakdown = ["dnr", "complaint-rate", "valid-complaint-rate"].includes(metric?.detailType ?? "")

  const trendOption = useMemo(
    () =>
      lineOption(trendLabels, [
        {
          name: metric?.label ?? "指标",
          data: [88, 89, 91, 90, 92, 91, 93, 94, 93, 95, 96, 97],
        },
      ]),
    [metric?.label]
  )
  const comparisonOption = useMemo(
    () =>
      horizontalBarOption(
        perspective === "driver"
          ? ["Alex Chen", "Maria Garcia", "James Wilson", "Linda Brown", "Robert Davis"]
          : deliveryRows.map((row) => row.route),
        perspective === "driver"
          ? [98.8, 98.2, 97.9, 97.5, 96.8]
          : deliveryRows.map((row) => Number.parseFloat(row.pickupRate)),
        metric?.label ?? "指标"
      ),
    [metric?.label, perspective]
  )

  return (
    <Dialog open={Boolean(metric)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{metric?.label ?? "指标详情"}</DialogTitle>
          <DialogDescription>
            {metric
              ? `${metric.value}${metric.target ? ` · ${metric.target}` : ""}`
              : "查看指标趋势与明细"}
          </DialogDescription>
        </DialogHeader>
        {metric ? (
          isParcelDetail ? (
            <DataTableCard
              title={`${metric.label}运单详情`}
              columns={parcelColumns}
              rows={parcelRows}
              filename={`${metric.label}运单详情`}
            />
          ) : hasNoComplaintBreakdown ? (
            <Alert><AlertTriangleIcon /><AlertDescription>暂无司机和路区维度的客诉率/有效客诉率/DNR率指标。</AlertDescription></Alert>
          ) : (
            <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              <Field orientation="horizontal" className="w-auto">
                <FieldTitle id="metric-perspective">对比视角</FieldTitle>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  value={perspective}
                  onValueChange={(value) =>
                    value &&
                    setPerspective(value as "driver" | "route")
                  }
                  aria-labelledby="metric-perspective"
                >
                  <ToggleGroupItem value="driver">司机视角</ToggleGroupItem>
                  <ToggleGroupItem value="route">路区视角</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartPanel title="指标趋势">
                  <EChartsChart option={trendOption} />
                </ChartPanel>
                <ChartPanel title="指标对比">
                  <EChartsChart option={comparisonOption} />
                </ChartPanel>
              </div>
            </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
