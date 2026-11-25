"use client"

import { BookOpenIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { learningItems, type LearningItem, type LearningStatus } from "../data"
import type { LearningState } from "../store"

export function getItemStatus(item: LearningItem, state: LearningState): LearningStatus {
  return state.statuses[getLearningStateKey(item)] ?? (item.version < 2.3 ? state.statuses[item.id] : undefined) ?? item.status
}

export function getLearningStateKey(item: LearningItem) {
  return `${item.id}:v${item.version}`
}

export function getItemMinutes(item: LearningItem, state: LearningState) {
  return state.minutes[getLearningStateKey(item)] ?? (item.version < 2.3 ? state.minutes[item.id] : undefined) ?? item.minutes
}

export function getItemCompletedAt(item: LearningItem, state: LearningState) {
  return state.completedAt[getLearningStateKey(item)] ?? (item.version < 2.3 ? state.completedAt[item.id] : undefined) ?? item.completedAt
}

export function getLearningSummary(state: LearningState) {
  const active = learningItems.filter((item) => !item.archived)
  const required = active.filter((item) => item.required)
  const completed = active.filter((item) => getItemStatus(item, state) === "已完成")
  const requiredCompleted = required.filter((item) => getItemStatus(item, state) === "已完成")
  return { total: active.length, completed: completed.length, required: required.length, requiredCompleted: requiredCompleted.length }
}

export function LearningProgress({ state }: { state: LearningState }) {
  const summary = getLearningSummary(state)
  const allPercent = Math.floor((summary.completed / summary.total) * 100)
  const requiredPercent = Math.floor((summary.requiredCompleted / summary.required) * 100)

  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[380px]">
      <Card className="gap-0 py-3 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <p className="text-xs text-muted-foreground">整体学习进度</p>
          <p className="text-xl font-medium tabular-nums">{summary.completed}<span className="ml-1 text-xs font-normal text-muted-foreground">/ {summary.total} · {allPercent}%</span></p>
          <Progress value={allPercent} className="[&_[data-slot=progress-indicator]]:bg-data-accent" aria-label="整体学习进度" />
        </CardContent>
      </Card>
      <Card className="gap-0 py-3 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <p className="text-xs text-muted-foreground">必学进度</p>
          <p className="text-xl font-medium tabular-nums">{summary.requiredCompleted}<span className="ml-1 text-xs font-normal text-muted-foreground">/ {summary.required} · {summary.required - summary.requiredCompleted} 项未完成</span></p>
          <Progress value={requiredPercent} className="[&_[data-slot=progress-indicator]]:bg-warning" aria-label="必学进度" />
        </CardContent>
      </Card>
    </div>
  )
}

export function LearningStatusBadge({ status }: { status: LearningStatus }) {
  return <Badge size="sm" variant={status === "已完成" ? "success" : status === "学习中" ? "warning" : "destructive"}>{status}</Badge>
}

export function LearningThumbnail({ item, index }: { item: LearningItem; index: number }) {
  return (
    <div className="relative flex h-36 overflow-hidden rounded-t-xl bg-muted p-4 sm:h-40">
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-[38%] bg-foreground/5" />
      <div className="relative flex w-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-card text-brand"><BookOpenIcon className="size-5" /></span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs text-muted-foreground">GOFO DSP · {item.category}</span>
            <span className="line-clamp-2 text-lg font-medium leading-snug text-foreground">{item.title}</span>
          </div>
          <span aria-hidden="true" className="shrink-0 text-3xl font-medium tabular-nums text-muted-foreground/50">{String(index + 1).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  )
}
