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
import {
  createAlertMetricDetailTitle,
  parseAlertMetricDetailTitle,
  parseAlertMetricKey,
} from "@/features/live-dashboard/alert-metric-config"
import { getDeliveryDetailTitle } from "@/features/live-dashboard/components/delivery-detail-view"
import {
  MetricDetailView,
  type TaskAssignmentRow,
} from "@/features/live-dashboard/components/metric-detail-dialog"
import type { WorkMode } from "@/features/live-dashboard/mock-data"
import { formatDateTime } from "@/lib/date-time"

const INITIAL_REFRESH_TIME = new Date("2026-08-21T10:05:12-04:00")

export function LiveDashboard() {
  const [workMode, setWorkMode] = useState<WorkMode>("same-day")
  const [lastRefresh, setLastRefresh] = useState(() => INITIAL_REFRESH_TIME)
  const [detailTitle, setDetailTitle] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskAssignmentRow | null>(null)
  const lastManualRefresh = useRef(0)

  const openDetail = useCallback((title: string) => {
    setSelectedTask(null)
    setDetailTitle(title)
    const alertMetric = parseAlertMetricDetailTitle(title)
    if (alertMetric) {
      const url = new URL(window.location.href)
      url.searchParams.set("alertMetric", alertMetric.key)
      window.history.pushState({}, "", url)
    }
  }, [])

  const returnToDashboard = useCallback(() => {
    setSelectedTask(null)
    setDetailTitle(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has("alertMetric")) {
      url.searchParams.delete("alertMetric")
      window.history.replaceState({}, "", url)
    }
  }, [])

  const returnToTaskAssignment = useCallback(() => {
    setSelectedTask(null)
  }, [])

  useEffect(() => {
    function syncAlertMetricFromUrl() {
      const metric = parseAlertMetricKey(new URL(window.location.href).searchParams.get("alertMetric"))
      setSelectedTask(null)
      setDetailTitle((current) => {
        if (metric) return createAlertMetricDetailTitle(metric.key)
        return current && parseAlertMetricDetailTitle(current) ? null : current
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

    return [dashboardItem, { label: getDeliveryDetailTitle(detailTitle) }]
  }, [detailTitle, returnToDashboard, returnToTaskAssignment, selectedTask])

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

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={detailTitle ? "hidden" : "flex flex-col gap-3"} aria-hidden={detailTitle ? true : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-0 overflow-hidden p-0 has-data-[icon=inline-end]:pe-0"
              onClick={() => setWorkMode((current) => current === "same-day" ? "next-day" : "same-day")}
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

      {detailTitle ? (
        <MetricDetailView
          title={detailTitle}
          onBack={returnToDashboard}
          onNavigateDetail={openDetail}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTask}
        />
      ) : null}
    </div>
  )
}
