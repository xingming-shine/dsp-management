"use client"

import { useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTimezone } from "@/features/preferences/timezone-store"
import { formatDate, formatDateTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { learningItems, type DownloadRecord, type LearningItem } from "../data"
import { useLearningState, type LearningState } from "../store"
import { LearningContentDetail } from "./learning-content-detail"
import { getItemCompletedAt, getItemMinutes, getItemStatus, LearningProgress, LearningStatusBadge } from "./learning-shared"

export type RecordsTab = "progress" | "downloads"

function readLocation(): { tab: RecordsTab; selectedId: string | null } {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get("tab") === "downloads" ? "downloads" : "progress"
  return { tab, selectedId: params.get(tab === "downloads" ? "record" : "item") }
}

function writeLocation(tab: RecordsTab, selectedId: string | null, method: "pushState" | "replaceState") {
  const url = new URL(window.location.href)
  url.searchParams.delete("tab")
  url.searchParams.delete("item")
  url.searchParams.delete("record")
  if (tab === "downloads") url.searchParams.set("tab", tab)
  if (selectedId) url.searchParams.set(tab === "downloads" ? "record" : "item", selectedId)
  window.history[method](window.history.state, "", url)
}

export function RecordsPage({ initialTab = "progress", initialSelection = null }: { initialTab?: RecordsTab; initialSelection?: string | null }) {
  const { state } = useLearningState()
  const timeZone = useTimezone()
  const [activeTab, setActiveTab] = useState<RecordsTab>(initialTab)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelection)
  const tableScrollRef = useRef<number | null>(null)
  const openedFromTableRef = useRef(false)
  const listViewportRef = useRef<HTMLDivElement>(null)

  const selectedDownload = activeTab === "downloads" ? state.downloads.find((record) => record.id === selectedId) : undefined
  const selectedItem = activeTab === "progress"
    ? learningItems.find((item) => item.id === selectedId)
    : learningItems.find((item) => item.id === selectedDownload?.itemId)
  const showDetail = Boolean(selectedId && (selectedItem || selectedDownload))

  useEffect(() => {
    function handlePopState() {
      const next = readLocation()
      setActiveTab(next.tab)
      setSelectedId(next.selectedId)
      if (!next.selectedId) openedFromTableRef.current = false
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (selectedId || tableScrollRef.current === null) return
    const savedScroll = tableScrollRef.current
    tableScrollRef.current = null
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: "instant" }))
    return () => window.cancelAnimationFrame(frame)
  }, [selectedId])

  useEffect(() => {
    if (!showDetail || !selectedId) return
    const frame = window.requestAnimationFrame(() => {
      const viewport = listViewportRef.current
      const selectedCard = Array.from(viewport?.querySelectorAll<HTMLElement>("[data-record-id]") ?? [])
        .find((card) => card.dataset.recordId === selectedId)
      if (!viewport || !selectedCard) return
      const viewportRect = viewport.getBoundingClientRect()
      const cardRect = selectedCard.getBoundingClientRect()
      if (cardRect.top < viewportRect.top) viewport.scrollTop -= viewportRect.top - cardRect.top
      if (cardRect.bottom > viewportRect.bottom) viewport.scrollTop += cardRect.bottom - viewportRect.bottom
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeTab, selectedId, showDetail])

  function changeTab(value: string) {
    const nextTab: RecordsTab = value === "downloads" ? "downloads" : "progress"
    if (nextTab === activeTab) return
    tableScrollRef.current = null
    openedFromTableRef.current = false
    writeLocation(nextTab, null, "pushState")
    setActiveTab(nextTab)
    setSelectedId(null)
  }

  function openDetail(id: string) {
    if (id === selectedId) return
    if (!showDetail) {
      tableScrollRef.current = window.scrollY
      openedFromTableRef.current = true
    }
    writeLocation(activeTab, id, showDetail ? "replaceState" : "pushState")
    setSelectedId(id)
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  function closeDetail() {
    if (openedFromTableRef.current) {
      window.history.back()
      return
    }
    writeLocation(activeTab, null, "replaceState")
    setSelectedId(null)
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <h1 className="sr-only">学习记录</h1>
      <Tabs value={activeTab} onValueChange={changeTab} className="min-w-0 gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 overflow-x-auto pb-1">
            <TabsList variant="line" aria-label="学习记录分类" className="justify-start">
              <TabsTrigger value="progress">学习进度</TabsTrigger>
              <TabsTrigger value="downloads">下载记录 {state.downloads.length}</TabsTrigger>
              <TabsTrigger value="drivers" disabled>司机学习 · 二期</TabsTrigger>
            </TabsList>
          </div>
          <LearningProgress state={state} />
        </div>

        <TabsContent value="progress">
          {showDetail && selectedItem ? (
            <div className="grid min-w-0 items-stretch gap-4 lg:h-[min(48rem,calc(100dvh-12rem))] lg:grid-cols-[20rem_minmax(0,1fr)]">
              <nav aria-label="学习记录列表" className="hidden min-h-0 flex-col gap-2 lg:flex">
                <p className="shrink-0 px-1 text-xs text-muted-foreground">全部学习记录 · {learningItems.length}</p>
                <div ref={listViewportRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {learningItems.map((item) => <LearningRecordListItem key={item.id} item={item} state={state} selected={item.id === selectedItem.id} onSelect={() => openDetail(item.id)} />)}
                </div>
              </nav>
              <LearningContentDetail key={selectedItem.id} item={selectedItem} onClose={closeDetail} closeLabel="返回列表" recordSummary={<LearningRecordSummary item={selectedItem} state={state} timeZone={timeZone} />} />
            </div>
          ) : (
            <Table footer={<p className="border-t px-4 py-3 text-xs leading-relaxed text-muted-foreground">学习记录按 DSP 与内容版本保存；新版本独立记录，旧记录保留。已下架内容不计入当前完成率。点击内容可在当前页查看详情。</p>}>
              <TableHeader><TableRow><TableHead>内容</TableHead><TableHead>类型</TableHead><TableHead>版本</TableHead><TableHead>必学</TableHead><TableHead>状态</TableHead><TableHead>累计时长</TableHead><TableHead>完成时间</TableHead></TableRow></TableHeader>
              <TableBody>{learningItems.map((item) => {
                const status = getItemStatus(item, state)
                const minutes = getItemMinutes(item, state)
                const completedAt = getItemCompletedAt(item, state)
                return <TableRow key={item.id}>
                  <TableCell className="min-w-60 whitespace-normal"><Button type="button" variant="ghost" className="h-auto justify-start px-0 text-start" onClick={() => openDetail(item.id)}>{item.title}</Button>{item.archived ? <Badge size="sm" variant="outline" className="ml-2">已下架 · 不计分母</Badge> : null}</TableCell>
                  <TableCell>{item.type}</TableCell><TableCell>v{item.version}</TableCell><TableCell>{item.required ? <Badge size="sm" variant="secondary">必学</Badge> : "—"}</TableCell><TableCell><LearningStatusBadge status={status} /></TableCell><TableCell className="tabular-nums">{minutes} 分钟</TableCell><TableCell className="tabular-nums">{status === "已完成" && completedAt ? formatDate(completedAt, { timeZone }) : "—"}</TableCell>
                </TableRow>
              })}</TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="downloads">
          {showDetail && selectedDownload ? (
            <div className="grid min-w-0 items-stretch gap-4 lg:h-[min(48rem,calc(100dvh-12rem))] lg:grid-cols-[20rem_minmax(0,1fr)]">
              <nav aria-label="下载记录列表" className="hidden min-h-0 flex-col gap-2 lg:flex">
                <p className="shrink-0 px-1 text-xs text-muted-foreground">全部下载记录 · {state.downloads.length}</p>
                <div ref={listViewportRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {state.downloads.map((record) => <DownloadRecordListItem key={record.id} record={record} item={learningItems.find((entry) => entry.id === record.itemId)} selected={record.id === selectedDownload.id} timeZone={timeZone} onSelect={() => openDetail(record.id)} />)}
                </div>
              </nav>
              {selectedItem ? <LearningContentDetail key={selectedDownload.id} item={selectedItem} onClose={closeDetail} closeLabel="返回列表" recordSummary={<DownloadRecordSummary record={selectedDownload} item={selectedItem} timeZone={timeZone} />} /> : <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
                <Button type="button" variant="outline" size="sm" className="self-end" onClick={closeDetail}>返回列表</Button>
                <Empty><EmptyHeader><EmptyTitle>内容已移除</EmptyTitle><EmptyDescription>这条下载记录仍保留，但关联内容已无法展示。</EmptyDescription></EmptyHeader></Empty>
              </div>}
            </div>
          ) : (
            <Table footer={<p className="border-t px-4 py-3 text-xs text-muted-foreground">下载记录保留操作账号、内容版本、文件与时间。旧记录未保存文件信息时显示“未记录”。点击内容可在当前页查看详情。</p>}>
              <TableHeader><TableRow><TableHead>时间（当前时区）</TableHead><TableHead>操作账号</TableHead><TableHead>内容</TableHead><TableHead>版本</TableHead><TableHead>下载文件</TableHead><TableHead>备注</TableHead></TableRow></TableHeader>
              <TableBody>{state.downloads.map((record) => {
                const item = learningItems.find((entry) => entry.id === record.itemId)
                return <TableRow key={record.id}><TableCell className="tabular-nums">{formatDateTime(record.downloadedAt, { timeZone, includeSeconds: false })}</TableCell><TableCell>{record.account}</TableCell><TableCell className="min-w-56 whitespace-normal">{item ? <Button type="button" variant="ghost" className="h-auto justify-start px-0 text-start" onClick={() => openDetail(record.id)}>{item.title}</Button> : "已移除内容"}</TableCell><TableCell>v{record.version ?? item?.version ?? "—"}</TableCell><TableCell className="min-w-44 max-w-64 whitespace-normal break-all">{record.fileName ? <>{record.fileName}{record.fileFormat ? <span className="block text-xs text-muted-foreground">{record.fileFormat}</span> : null}</> : "未记录"}</TableCell><TableCell>{record.note?.trim() || "—"}</TableCell></TableRow>
              })}</TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}

function LearningRecordListItem({ item, state, selected, onSelect }: { item: LearningItem; state: LearningState; selected: boolean; onSelect: () => void }) {
  const status = getItemStatus(item, state)
  const minutes = getItemMinutes(item, state)
  return <div data-record-id={item.id} className={cn("relative shrink-0 overflow-hidden rounded-xl border bg-card", selected && "border-brand/40 bg-brand-selected before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-brand")}>
    <button type="button" aria-current={selected ? "true" : undefined} className="flex w-full flex-col gap-2 p-3 text-left outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring/50" onClick={onSelect}>
      <span className="flex w-full min-w-0 items-start justify-between gap-2"><span className={cn("line-clamp-2 min-w-0 text-sm font-medium", selected && "text-brand")}>{item.title}</span><LearningStatusBadge status={status} /></span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums"><span>v{item.version}</span><span>累计 {minutes} 分钟</span>{item.archived ? <Badge size="sm" variant="outline">已下架</Badge> : null}</span>
    </button>
  </div>
}

function DownloadRecordListItem({ record, item, selected, timeZone, onSelect }: { record: DownloadRecord; item?: LearningItem; selected: boolean; timeZone: string; onSelect: () => void }) {
  return <div data-record-id={record.id} className={cn("relative shrink-0 overflow-hidden rounded-xl border bg-card", selected && "border-brand/40 bg-brand-selected before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-brand")}>
    <button type="button" aria-current={selected ? "true" : undefined} className="flex w-full flex-col gap-2 p-3 text-left outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring/50" onClick={onSelect}>
      <span className={cn("line-clamp-2 text-sm font-medium", selected && "text-brand")}>{item?.title ?? "已移除内容"}</span>
      <span className="text-xs text-muted-foreground tabular-nums">v{record.version ?? item?.version ?? "—"} · {formatDateTime(record.downloadedAt, { timeZone, includeSeconds: false })}</span>
      <span className="truncate text-xs text-muted-foreground">文件：{record.fileName ?? "未记录"}</span>
      <span className="text-xs text-muted-foreground">操作账号：{record.account}</span>
    </button>
  </div>
}

function LearningRecordSummary({ item, state, timeZone }: { item: LearningItem; state: LearningState; timeZone: string }) {
  const status = getItemStatus(item, state)
  const minutes = getItemMinutes(item, state)
  const completedAt = getItemCompletedAt(item, state)
  return <div className="grid gap-3 rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-3">
    <p><span className="text-muted-foreground">记录版本</span><br /><span className="font-medium">v{item.version}{item.archived ? " · 历史版本" : ""}</span></p>
    <p><span className="text-muted-foreground">学习进度</span><br /><span className="font-medium tabular-nums">{minutes} / {item.duration} 分钟 · {status}</span></p>
    <p><span className="text-muted-foreground">完成时间</span><br /><span className="font-medium tabular-nums">{status === "已完成" && completedAt ? formatDate(completedAt, { timeZone }) : "—"}</span></p>
  </div>
}

function DownloadRecordSummary({ record, item, timeZone }: { record: DownloadRecord; item: LearningItem; timeZone: string }) {
  const recordVersion = record.version ?? item.version
  const historicalVersion = recordVersion !== item.version
  return <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-xs">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <p><span className="text-muted-foreground">下载时间</span><br /><span className="font-medium tabular-nums">{formatDateTime(record.downloadedAt, { timeZone, includeSeconds: false })}</span></p>
      <p><span className="text-muted-foreground">操作账号</span><br /><span className="font-medium">{record.account}</span></p>
      <p><span className="text-muted-foreground">记录版本</span><br /><span className="font-medium">v{recordVersion}</span></p>
      <p><span className="text-muted-foreground">下载文件</span><br /><span className="break-all font-medium">{record.fileName ?? "未记录"}{record.fileFormat ? ` · ${record.fileFormat}` : ""}</span></p>
      <p><span className="text-muted-foreground">备注</span><br /><span className="font-medium">{record.note?.trim() || "—"}</span></p>
    </div>
    {historicalVersion ? <p className="text-muted-foreground">这条记录下载的是 v{recordVersion}；下方内容展示当前 v{item.version}，不能代表当时下载的文件。</p> : null}
  </div>
}
