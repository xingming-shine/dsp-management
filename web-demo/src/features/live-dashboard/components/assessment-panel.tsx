"use client"

import { ArrowRightIcon, CircleAlertIcon, InfoIcon } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { assessmentMetrics } from "@/features/live-dashboard/mock-data"

export function AssessmentPanel({
  onDetail,
}: {
  onDetail: (title: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <Alert>
        <InfoIcon />
        <AlertTitle>考核指标监控</AlertTitle>
        <AlertDescription>
          仅展示当前考核周期的达成情况；实时任务与异常处理请切回“实时监控”。
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {assessmentMetrics.map((metric) => {
          const achieved = metric.status === "success"
          return (
            <Card key={metric.label}>
              <CardHeader>
                <CardTitle>{metric.label}</CardTitle>
                <CardDescription>考核标准 ≥ {metric.target}%</CardDescription>
                <CardAction>
                  <Badge variant={achieved ? "success" : "destructive"}>
                    {achieved ? "已达标" : "未达标"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div>
                  <p className="text-3xl font-bold tracking-tight tabular-nums">{metric.value}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">今日实际完成率</p>
                </div>
                <Progress
                  value={Math.min(100, (metric.value / metric.target) * 100)}
                  aria-label={`${metric.label}考核完成度`}
                />
                <button
                  type="button"
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={() => onDetail(`${metric.label} · ${metric.pendingLabel}`)}
                >
                  <span className="text-xs text-muted-foreground">{metric.pendingLabel}</span>
                  <span className="font-semibold tabular-nums">{metric.pending} 件</span>
                </button>
                <div className={achieved ? "text-success" : "text-destructive"}>
                  <p className="flex items-start gap-2 text-xs font-medium">
                    <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                    {metric.message}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t">
                <Button variant="ghost" size="sm" onClick={() => onDetail(`${metric.label}考核运单`)}>
                  查看待处理运单
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>时效指标待处理汇总</CardTitle>
            <CardDescription>按考核日拆分导致未达标的绝对件量</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <AssessmentDay label="今日" pending="97" returnCount="4" onDetail={onDetail} />
            <AssessmentDay label="昨日" pending="12" returnCount="1" onDetail={onDetail} />
            <AssessmentDay label="前日" pending="4" returnCount="0" onDetail={onDetail} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>疑似丢失</CardTitle>
            <CardDescription>按轨迹停滞时长分层预警</CardDescription>
            <CardAction><Badge variant="destructive">7 件</Badge></CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <button
              type="button"
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={() => onDetail("2-4 日无轨迹运单")}
            >
              <span>2-4 日无轨迹</span>
              <Badge variant="warning">5 件</Badge>
            </button>
            <button
              type="button"
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={() => onDetail("4-5 日无轨迹运单")}
            >
              <span>4-5 日无轨迹</span>
              <Badge variant="destructive">2 件</Badge>
            </button>
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>即将断更，请尽快处理</AlertTitle>
              <AlertDescription>2 件运单将在今日进入高危断更区间。</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AssessmentDay({
  label,
  pending,
  returnCount,
  onDetail,
}: {
  label: string
  pending: string
  returnCount: string
  onDetail: (title: string) => void
}) {
  return (
    <Card size="sm" className="shadow-none">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">待派件</span>
          <span className="font-semibold tabular-nums">{pending}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">待退回</span>
          <span className="font-semibold tabular-nums">{returnCount}</span>
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <Button variant="ghost" size="xs" onClick={() => onDetail(`${label}考核待处理`)}>
          查看明细
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}
