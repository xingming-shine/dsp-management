"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeftRightIcon,
  CalendarClockIcon,
  RefreshCwIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useAppBreadcrumbs } from "@/components/layout/app-breadcrumb-context"
import { DesktopRealtimeOverview } from "@/features/live-dashboard/components/desktop-realtime-overview"
import { DriverMonitorDetailView } from "@/features/live-dashboard/components/driver-monitor-detail-view"
import {
  createAlertMetricDetailTitle,
  parseAlertMetricDetailTitle,
  parseAlertMetricKey,
} from "@/features/live-dashboard/alert-metric-config"
import { getDeliveryDetailTitle } from "@/features/live-dashboard/components/delivery-detail-view"
import { parseWaybillAlert, type WaybillAlert } from "@/features/live-dashboard/driver-monitor-data"
import {
  MetricDetailView,
  type TaskAssignmentRow,
} from "@/features/live-dashboard/components/metric-detail-dialog"
import type { PickupPeriod } from "@/features/live-dashboard/overview-card-config"
import type { WorkMode } from "@/features/live-dashboard/mock-data"
import { formatDateTime } from "@/lib/date-time"

const INITIAL_REFRESH_TIME = new Date("2026-08-21T10:05:12-04:00")

export function LiveDashboard({ initialWorkMode = "same-day" }: { initialWorkMode?: WorkMode }) {
  const [workMode, setWorkMode] = useState<WorkMode>(initialWorkMode)
  const [lastRefresh, setLastRefresh] = useState(() => INITIAL_REFRESH_TIME)
  const [detailTitle, setDetailTitle] = useState<string | null>(null)
  const [detailParentTitle, setDetailParentTitle] = useState<string | null>(null)
  const [taskPeriod, setTaskPeriod] = useState<PickupPeriod>("current")
  const [mapDriverId, setMapDriverId] = useState<string | null>(null)
  const [mapAlertType, setMapAlertType] = useState<WaybillAlert | null>(null)
  const [monitorView, setMonitorView] = useState<"waybill" | "map" | undefined>(undefined)
  const [pickupDriverId, setPickupDriverId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskAssignmentRow | null>(null)
  const lastManualRefresh = useRef(0)
  const dashboardScroll = useRef(0)

  const openDetail = useCallback((title: string, driverId?: string, period: PickupPeriod = "current", alertType?: WaybillAlert, initialMonitorView?: "waybill" | "map") => {
    setTaskPeriod(period)
    setPickupDriverId(title === "领件详情" ? driverId ?? null : null)
    dashboardScroll.current = window.scrollY
    setSelectedTask(null)
    setDetailTitle(title)
    if (title === "司机监控地图") {
      setMapDriverId(driverId ?? null)
      setMapAlertType(alertType ?? null)
      setMonitorView(initialMonitorView)
      const url = new URL(window.location.href)
      url.searchParams.delete("alertMetric")
      url.searchParams.set("view", "driver-map")
      if (initialMonitorView) url.searchParams.set("monitorView", initialMonitorView)
      else url.searchParams.delete("monitorView")
      if (driverId) url.searchParams.set("driverId", driverId)
      else url.searchParams.delete("driverId")
      if (alertType) url.searchParams.set("alertType", alertType)
      else url.searchParams.delete("alertType")
      window.history.pushState({}, "", url)
      window.scrollTo({ top: 0 })
      return
    }
    if (title === "领件详情" || title === "应退回") {
      const url = new URL(window.location.href)
      url.searchParams.delete("alertMetric")
      url.searchParams.set("view", title === "领件详情" ? "pickup" : "return")
      url.searchParams.set("taskPeriod", period)
      if (title === "领件详情" && driverId) url.searchParams.set("driverId", driverId)
      else url.searchParams.delete("driverId")
      window.history.pushState({}, "", url)
    }
    const alertMetric = parseAlertMetricDetailTitle(title)
    if (alertMetric) {
      const url = new URL(window.location.href)
      url.searchParams.set("alertMetric", alertMetric.key)
      window.history.pushState({}, "", url)
    }
  }, [])

  const returnToDashboard = useCallback(() => {
    setMapDriverId(null)
    setMapAlertType(null)
    setMonitorView(undefined)
    setPickupDriverId(null)
    setSelectedTask(null)
    setDetailParentTitle(null)
    setDetailTitle(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has("alertMetric") || url.searchParams.has("view")) {
      url.searchParams.delete("alertMetric")
      url.searchParams.delete("view")
      url.searchParams.delete("driverId")
      url.searchParams.delete("taskPeriod")
      url.searchParams.delete("alertType")
      url.searchParams.delete("monitorView")
      window.history.replaceState({}, "", url)
    }
    requestAnimationFrame(() => window.scrollTo({ top: dashboardScroll.current }))
  }, [])

  const returnFromDetail = useCallback(() => {
    if (!detailParentTitle) {
      returnToDashboard()
      return
    }
    setDetailTitle(detailParentTitle)
    setDetailParentTitle(null)
    window.scrollTo({ top: 0 })
  }, [detailParentTitle, returnToDashboard])

  const navigateFromDetail = useCallback((title: string) => {
    if (detailTitle === "派送异常分布详情" || detailTitle === "派送异常原因分布详情") {
      setDetailParentTitle(detailTitle)
    }
    openDetail(title, undefined, taskPeriod)
  }, [detailTitle, openDetail, taskPeriod])

  const returnToTaskAssignment = useCallback(() => {
    setSelectedTask(null)
  }, [])

  useEffect(() => {
    function syncAlertMetricFromUrl() {
      const url = new URL(window.location.href)
      const detailView = url.searchParams.get("view")
      const driverId = url.searchParams.get("driverId")
      const alertType = parseWaybillAlert(url.searchParams.get("alertType"))
      const metric = parseAlertMetricKey(url.searchParams.get("alertMetric"))
      setWorkMode(url.searchParams.get("workMode") === "next-day" ? "next-day" : "same-day")
      setMapDriverId(detailView === "driver-map" ? driverId : null)
      setMapAlertType(detailView === "driver-map" ? alertType : null)
      const urlMonitorView = url.searchParams.get("monitorView")
      setMonitorView(detailView === "driver-map" && (urlMonitorView === "waybill" || urlMonitorView === "map") ? urlMonitorView : undefined)
      setPickupDriverId(detailView === "pickup" ? driverId : null)
      setSelectedTask(null)
      setTaskPeriod(url.searchParams.get("taskPeriod") === "next" ? "next" : "current")
      setDetailTitle((current) => {
        if (url.searchParams.get("view") === "driver-map") return "司机监控地图"
        if (url.searchParams.get("view") === "pickup") return "领件详情"
        if (url.searchParams.get("view") === "return") return "应退回"
        if (metric) return createAlertMetricDetailTitle(metric.key)
        return current && (parseAlertMetricDetailTitle(current) || current === "司机监控地图" || current === "领件详情" || current === "应退回") ? null : current
      })
    }

    syncAlertMetricFromUrl()
    window.addEventListener("popstate", syncAlertMetricFromUrl)
    return () => window.removeEventListener("popstate", syncAlertMetricFromUrl)
  }, [])

  const breadcrumbItems = useMemo(() => {
    if (!detailTitle) return []

    const dashboardItem = {
      label: "实时看板",
      onSelect: returnToDashboard,
    }

    if (
      detailTitle === "任务分配" ||
      detailTitle === "已分配件量明细" ||
      detailTitle === "未分配件量明细"
    ) {
      if (selectedTask) {
        return [
          dashboardItem,
          { label: "任务分配", onSelect: returnToTaskAssignment },
          { label: "运单列表" },
        ]
      }

      return [dashboardItem, { label: "任务分配" }]
    }

    if (taskPeriod === "next" && detailTitle === "领件详情") return [dashboardItem, { label: `${detailTitle}（下期领件任务）` }]

    if (detailTitle === "司机监控地图") return [dashboardItem, { label: "司机监控" }]
    const alertMetric = parseAlertMetricDetailTitle(detailTitle)
    return [dashboardItem, { label: alertMetric ? createAlertMetricDetailTitle(alertMetric.key) : getDeliveryDetailTitle(detailTitle) }]
  }, [detailTitle, returnToDashboard, returnToTaskAssignment, selectedTask, taskPeriod])

  useAppBreadcrumbs(breadcrumbItems)

  function refreshDashboard() {
    const now = Date.now()
    if (now - lastManualRefresh.current < 60_000) {
      toast.info("操作太频繁，休息一下")
      return
    }
    lastManualRefresh.current = now
    setLastRefresh(new Date(now))
    toast.success("刷新成功")
  }

  function toggleWorkMode() {
    const nextMode: WorkMode = workMode === "same-day" ? "next-day" : "same-day"
    setWorkMode(nextMode)
    const url = new URL(window.location.href)
    url.searchParams.set("workMode", nextMode)
    window.history.replaceState({}, "", url)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={detailTitle ? "hidden" : "flex flex-col gap-3"} aria-hidden={detailTitle ? true : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-0 overflow-hidden p-0 has-data-[icon=inline-end]:pe-0"
              onClick={toggleWorkMode}
              aria-label="切换实时看板工作模式"
              title={workMode === "same-day" ? "切换为隔日派" : "切换为当日派"}
            >
              <span className="flex h-full items-center bg-brand-selected px-2.5 text-brand-ink">
                {workMode === "same-day" ? "当日派" : "隔日派"}
              </span>
              <span className="flex h-full items-center px-2.5 text-foreground">
                {workMode === "same-day" ? "上午领件 → 下午派件" : "下午领件 → 次日派件"}
              </span>
              <span className="flex h-full items-center border-l bg-muted px-2.5">
                <ArrowLeftRightIcon data-icon="inline-end" />
              </span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClockIcon className="size-3" />
              数据更新时间：{formatDateTime(lastRefresh, { includeSeconds: true })}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="border-0 bg-transparent text-brand shadow-none hover:bg-transparent hover:text-brand"
              onClick={refreshDashboard}
              aria-label="刷新实时看板"
              title="刷新实时看板"
            >
              <RefreshCwIcon />
            </Button>
          </div>
        </div>
        <DesktopRealtimeOverview mode={workMode} onDetail={openDetail} />
      </div>

      {detailTitle === "司机监控地图" ? <DriverMonitorDetailView key={`${mapDriverId ?? "all"}-${mapAlertType ?? "all"}-${monitorView ?? "default"}`} initialDriverId={mapDriverId} initialAlertType={mapAlertType} initialViewMode={monitorView} onBack={returnToDashboard} /> : detailTitle ? (
        <MetricDetailView
          key={`${detailTitle}-${taskPeriod}-${pickupDriverId ?? "all"}`}
          title={detailTitle}
          taskPeriod={taskPeriod}
          initialDriverId={pickupDriverId}
          onBack={returnFromDetail}
          onNavigateDetail={navigateFromDetail}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTask}
        />
      ) : null}
    </div>
  )
}
