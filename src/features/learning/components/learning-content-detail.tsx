"use client"

import { useRef, useState, type ReactNode } from "react"
import { ArchiveIcon, DownloadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useProfile } from "@/features/auth/profile-context"
import { useTimezone } from "@/features/preferences/timezone-store"
import { formatDate } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import type { LearningItem, LearningStatus } from "../data"
import { useLearningState } from "../store"
import { LearningContentBody } from "./learning-content-body"
import { getItemMinutes, getItemStatus, getLearningStateKey, LearningStatusBadge } from "./learning-shared"

export function LearningContentDetail({
  item,
  onClose,
  closeLabel = "收起",
  recordSummary,
  className,
  id,
}: {
  item: LearningItem
  onClose: () => void
  closeLabel?: string
  recordSummary?: ReactNode
  className?: string
  id?: string
}) {
  const { state, updateState } = useLearningState()
  const { user } = useProfile()
  const timeZone = useTimezone()
  const status = getItemStatus(item, state)
  const minutes = getItemMinutes(item, state)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloadNote, setDownloadNote] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const downloadInProgress = useRef(false)
  const canLearn = item.type === "PPT" ? item.content?.kind === "slides" && item.content.slides.length > 0
    : item.type === "图文" ? item.content?.kind === "article" && item.content.sections.length > 0
    : item.type === "视频" ? item.content?.kind === "video" && Boolean(item.content.src)
      : item.content?.kind === "external" && Boolean(item.content.url)

  function setLearningStatus(next: LearningStatus) {
    const timestamp = new Date().toISOString()
    const key = getLearningStateKey(item)
    updateState((current) => ({
      ...current,
      statuses: { ...current.statuses, [key]: next },
      minutes: { ...current.minutes, [key]: next === "已完成" ? item.duration : Math.max(getItemMinutes(item, current), 1) },
      completedAt: next === "已完成" ? { ...current.completedAt, [key]: timestamp } : current.completedAt,
    }))
    toast.success(next === "已完成" ? "已记录完成状态" : "已记录学习进度")
  }

  async function downloadItem() {
    const asset = item.downloadAsset
    if (!asset || downloadInProgress.current) return
    downloadInProgress.current = true
    setIsDownloading(true)
    try {
      const response = await fetch(asset.url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = asset.fileName
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      updateState((current) => ({
        ...current,
        downloads: [{ id: crypto.randomUUID(), itemId: item.id, version: item.version, account: user.name, downloadedAt: new Date().toISOString(), note: downloadNote.trim(), fileName: asset.fileName, fileFormat: asset.format, fileUrl: asset.url }, ...current.downloads],
      }))
      setDownloadOpen(false)
      setDownloadNote("")
      toast.success("已发起下载，下载记录已保存")
    } catch {
      toast.error("下载失败，请稍后重试；未生成下载记录")
    } finally {
      downloadInProgress.current = false
      setIsDownloading(false)
    }
  }

  return (
    <>
    <article id={id} className={cn("flex min-h-0 scroll-mt-20 flex-col overflow-hidden rounded-xl border bg-card lg:h-full", className)}>
      <header className="flex shrink-0 flex-col gap-3 border-b p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="text-lg font-medium">{item.title}</h2>
            {!item.archived ? <p className="text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}><XIcon data-icon="inline-start" />{closeLabel}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge size="sm" variant="secondary">{item.type}</Badge>
          {!recordSummary ? <Badge size="sm" variant="outline">v{item.version}</Badge> : null}
          <LearningStatusBadge status={status} />
          {item.required ? <Badge size="sm" variant="destructiveSolid">必学</Badge> : null}
          {item.archived ? <Badge size="sm" variant="outline">已下架</Badge> : null}
          <span className="text-xs text-muted-foreground tabular-nums">发布于 {formatDate(item.publishedAt, { timeZone })}</span>
        </div>
        {recordSummary}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto p-4 sm:p-5", item.archived && "flex items-center justify-center")}>
        {item.archived ? <Empty className="min-h-52"><EmptyHeader><EmptyMedia variant="icon"><ArchiveIcon /></EmptyMedia><EmptyTitle>内容已下架，无法查看正文</EmptyTitle><EmptyDescription>历史记录仍保留。可返回列表查看其他内容。</EmptyDescription></EmptyHeader></Empty> : <>
          <LearningContentBody item={item} />
          <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
            <Badge size="sm" variant="outline">{item.category}</Badge>
            {item.tags.map((value) => <Badge key={value} size="sm" variant="outline">#{value}</Badge>)}
          </div>
        </>}
      </div>
      {!item.archived ? <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-3 sm:px-5">
        <p className="text-xs text-muted-foreground tabular-nums">累计学习 {minutes} 分钟{!canLearn ? " · 内容待配置" : ""}</p>
        <div className="flex flex-wrap gap-2">
          {item.downloadable && item.type !== "外部链接" ? <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={!item.downloadAsset} onClick={() => setDownloadOpen(true)}><DownloadIcon data-icon="inline-start" />下载资料</Button>{!item.downloadAsset ? <span className="text-xs text-muted-foreground">原文件待配置，暂不可下载</span> : null}</div> : null}
          {item.type === "外部链接" && status !== "已完成" ? <Button type="button" size="sm" disabled={!canLearn} onClick={() => setLearningStatus("已完成")}>标记完成</Button> : null}
        </div>
      </footer> : null}
    </article>
    <Dialog open={downloadOpen} onOpenChange={(open) => { if (!downloadInProgress.current) { setDownloadOpen(open); if (!open) setDownloadNote("") } }}>
      <DialogContent showCloseButton={!isDownloading}>
        <DialogHeader>
          <DialogTitle>确认下载资料</DialogTitle>
          <DialogDescription>确认文件后开始下载。用途备注可选，确认后会保存下载记录。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">{item.title} · v{item.version}</p>
          <p className="break-all text-muted-foreground">文件：{item.downloadAsset?.fileName ?? "—"}</p>
          <p className="text-muted-foreground">格式：{item.downloadAsset?.format ?? "—"}</p>
        </div>
        <Field>
          <FieldLabel htmlFor={`download-note-${item.id}`}>下载用途备注（选填）</FieldLabel>
          <Textarea id={`download-note-${item.id}`} value={downloadNote} onChange={(event) => setDownloadNote(event.target.value)} maxLength={200} placeholder="例如：用于司机晨会培训" disabled={isDownloading} />
          <p className="text-right text-xs text-muted-foreground tabular-nums">{downloadNote.length}/200</p>
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isDownloading} onClick={() => setDownloadOpen(false)}>取消</Button>
          <Button type="button" disabled={isDownloading || !item.downloadAsset} onClick={() => void downloadItem()}>{isDownloading ? "正在下载…" : "确认下载"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
