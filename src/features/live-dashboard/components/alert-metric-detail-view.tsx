"use client"

import { useState } from "react"
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardListIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  alertMetricGroups,
  createAlertMetricDetailTitle,
  parseAlertMetricDetailTitle,
  type AlertMetricItem,
} from "@/features/live-dashboard/alert-metric-config"
import { cn } from "@/lib/utils"

export function AlertMetricDetailView({
  title,
  onBack,
  onNavigate,
}: {
  title: string
  onBack: () => void
  onNavigate: (title: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const activeMetric = parseAlertMetricDetailTitle(title)
  if (!activeMetric) return null

  function navigateToMetric(key: Parameters<typeof createAlertMetricDetailTitle>[0]) {
    const nextTitle = createAlertMetricDetailTitle(key)
    if (nextTitle && nextTitle !== title) {
      onNavigate(nextTitle)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function metricButton(item: AlertMetricItem, nested = false, quiet = false) {
    const selected = item.key === activeMetric?.key
    return (
      <button
        type="button"
        aria-current={selected ? "page" : undefined}
        className={cn(
          "group/metric relative flex min-h-20 w-full flex-1 flex-col items-center justify-center gap-2 rounded-md px-2 py-3 text-center outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring",
          quiet ? "bg-transparent" : "bg-card",
          nested && "min-h-14 gap-1 bg-muted py-2",
          selected && "bg-brand-selected ring-1 ring-inset ring-brand/30",
        )}
        onClick={() => navigateToMetric(item.key)}
      >
        {nested && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-muted transition-colors group-hover/metric:bg-brand-hover",
              selected && "border-t border-l border-brand/30 bg-brand-selected",
            )}
          />
        )}
        <span className={cn("tabular-nums", nested ? "text-sm" : "text-xl", ["pod", "delivery-location", "pending"].includes(item.key) ? "text-destructive" : "text-foreground")}>{item.value}</span>
        <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">{item.label}</span>
      </button>
    )
  }

  return (
    <section
      className="animate-in fade-in slide-in-from-right-4 min-w-0 rounded-xl bg-card p-5 duration-200"
      aria-label={`${activeMetric.label}详情`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeftIcon data-icon="inline-start" />
            返回
          </Button>
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-semibold text-foreground">{activeMetric.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">异常指标详情</p>
          </div>
        </div>
      </div>

      <div className={cn("mt-5 grid min-w-0 gap-5 lg:items-start", collapsed ? "lg:grid-cols-[minmax(0,1fr)_3rem]" : "lg:grid-cols-[minmax(0,1fr)_10rem]")}>
        <div className="order-last flex min-h-[32rem] min-w-0 flex-col gap-4 lg:order-first">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-muted-foreground">当前指标</span>
              <strong className="truncate text-base font-medium">{activeMetric.label}</strong>
            </div>
            <div className="text-end">
              <strong className="font-heading text-2xl font-semibold tabular-nums text-foreground">{activeMetric.value}</strong>
              <span className="ml-1 text-xs text-muted-foreground">件</span>
            </div>
          </div>

          <Empty className="min-h-96 border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><ClipboardListIcon /></EmptyMedia>
              <EmptyTitle>详情内容建设中</EmptyTitle>
              <EmptyDescription>筛选条件、统计信息和数据列表将在后续需求确认后补充。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>

        <aside className={cn("sticky top-16 order-first min-w-0 self-start lg:fixed lg:top-14 lg:right-0 lg:z-30 lg:order-last lg:h-[calc(100dvh-3.5rem)]", collapsed ? "lg:w-12" : "lg:w-40")} aria-label="异常指标切换">
          <nav className="alert-nav-glass flex flex-col rounded-lg lg:h-full lg:rounded-none">
            <div className={cn("flex shrink-0 items-center gap-2 p-2", collapsed ? "justify-center" : "justify-between pl-3")}>
              {!collapsed && <span className="text-sm font-semibold">异常指标</span>}
              <Button variant="ghost" size="icon-sm" className="alert-nav-toggle" aria-label={collapsed ? "展开异常指标导航" : "收起异常指标导航"} aria-expanded={!collapsed} aria-controls="alert-metric-navigation" onClick={() => setCollapsed((value) => !value)}>
                {collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </Button>
            </div>
            <div id="alert-metric-navigation" hidden={collapsed} className="min-h-0 flex-1 overflow-auto">
            <div className="flex max-h-[calc(100dvh-10rem)] gap-3 overflow-auto p-2 pt-0 lg:h-full lg:min-h-[44rem] lg:max-h-none lg:flex-col lg:gap-3 lg:overflow-visible">
              {alertMetricGroups.map((group) => (
                <section key={group.title} className="flex min-w-32 shrink-0 flex-col rounded-lg border p-1.5 lg:min-w-0 lg:grow" style={{ flexGrow: group.items.length }} aria-label={group.title}>
                  <h3 className="px-2 py-2 text-center text-xs font-semibold">{group.title}</h3>
                  <div className="flex flex-1 flex-col gap-2">
                    {group.items.filter((item) => !item.nested).map((item) => {
                      const nested = item.key === "pending" ? group.items.find((entry) => entry.nested) : undefined
                      const quiet = item.key === "fake-delivery" || item.key === "dsp-tracking"
                      return (
                        <div key={item.key} className={cn("flex flex-1 flex-col", nested && "rounded-md bg-card p-1.5", item.key === "fake-delivery" && "mt-2 border-t border-dashed pt-2")} style={{ flexGrow: nested ? 2 : 1 }}>
                          {metricButton(item, false, quiet)}
                          {nested && metricButton(nested, true)}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
            </div>
          </nav>
        </aside>
      </div>
    </section>
  )
}
