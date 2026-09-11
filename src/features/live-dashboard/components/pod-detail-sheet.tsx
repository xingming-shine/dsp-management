"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react"
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, ImageIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { MonitorWaybill } from "@/features/live-dashboard/driver-monitor-data"
import { getDemoPodRecord, type PodPhoto } from "@/features/live-dashboard/pod-demo-data"
import { formatDate, formatDateTime, formatTime } from "@/lib/date-time"

function PodRecipientAddress({ waybillId, initialAddress }: { waybillId: string; initialAddress?: string }) {
  const [address, setAddress] = useState(initialAddress)
  const [failed, setFailed] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (initialAddress) return
    const controller = new AbortController()
    async function loadAddress() {
      try {
        const response = await fetch(`/api/live-dashboard/waybills/${encodeURIComponent(waybillId)}/address`, { signal: controller.signal, cache: "no-store" })
        if (!response.ok) throw new Error("Address unavailable")
        const result: { address?: unknown } = await response.json()
        if (typeof result.address !== "string" || !result.address.trim()) throw new Error("Invalid address")
        if (!controller.signal.aborted) setAddress(result.address)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }
    void loadAddress()
    return () => controller.abort()
  }, [waybillId, initialAddress, revision])

  if (initialAddress || address) return <>{initialAddress || address}</>
  if (failed) return <div className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">地址加载失败</span><Button variant="link" size="xs" onClick={() => { setFailed(false); setRevision((value) => value + 1) }}>重试</Button></div>
  return <span role="status" aria-label="正在加载收件地址"><Skeleton className="h-4 w-full" /></span>
}

function PhotoThumbnail({ photo }: { photo: PodPhoto }) {
  const [failed, setFailed] = useState(false)
  return failed ? <ImageIcon aria-label="图片加载失败" /> : <Image unoptimized src={photo.url} alt={photo.label} width={96} height={96} className="size-full object-cover" onError={() => setFailed(true)} />
}

function Thumbnails({ photos, selected, onSelect, label }: { photos: PodPhoto[]; selected: string; onSelect: (id: string) => void; label: string }) {
  return <ToggleGroup type="single" value={selected} onValueChange={(value) => { if (value) onSelect(value) }} aria-label={label} className="max-w-full flex-wrap gap-2">
    {photos.map((photo) => <ToggleGroupItem key={photo.id} value={photo.id} aria-label={`查看${photo.label}`} className="pod-thumbnail size-14 overflow-hidden p-0"><PhotoThumbnail photo={photo} /></ToggleGroupItem>)}
  </ToggleGroup>
}

export function PodDetailSheet({ row, address, onClose, initialPhotoId, embedded = false }: { row: MonitorWaybill; address?: string; onClose: () => void; initialPhotoId?: string; embedded?: boolean }) {
  const record = getDemoPodRecord(row)
  const [submissionId, setSubmissionId] = useState(record.latestSubmissionId)
  const [selected, setSelected] = useState(record.photos.find((photo) => photo.id === initialPhotoId)?.id ?? record.photos[0]?.id ?? "")
  const [loaded, setLoaded] = useState("")
  const [failed, setFailed] = useState<string[]>([])
  const [retryRevision, setRetryRevision] = useState(0)
  const [naturalSize, setNaturalSize] = useState({ width: 768, height: 1024 })
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 })
  const viewportRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  function submissionPhotos(id: string) {
    return (record.submissions.find((submission) => submission.id === id)?.photoIds ?? [])
      .flatMap((photoId) => record.photos.filter((photo) => photo.id === photoId))
  }
  const photos = submissionPhotos(submissionId)
  const latestPhotos = submissionPhotos(record.latestSubmissionId)
  const index = photos.findIndex((photo) => photo.id === selected)
  const photo = photos[index]
  const isFailed = failed.includes(selected)
  const ready = Boolean(photo && loaded === selected && !isFailed)
  const fit = Math.min(Math.max(1, viewportSize.width - 32) / naturalSize.width, Math.max(1, viewportSize.height - 32) / naturalSize.height)
  const width = naturalSize.width * fit
  const height = naturalSize.height * fit

  const observeViewport = useCallback((viewport: HTMLDivElement | null) => {
    viewportRef.current = viewport
    if (!viewport) return
    const observer = new ResizeObserver(([entry]) => setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  function choosePhoto(id: string, groupId = submissionId) {
    setSubmissionId(groupId)
    setSelected(id)
    viewportRef.current?.scrollTo({ left: 0, top: 0 })
    previewRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }
  function stepPhoto(offset: number) {
    const next = photos[index + offset]
    if (next) choosePhoto(next.id)
  }
  async function copyNumber() {
    try { await navigator.clipboard.writeText(row.id); toast.success("单号已复制") }
    catch { toast.error("复制失败，请手动复制单号") }
  }

  return <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
    <PodDetailSurface embedded={embedded} side="right" className="pod-detail-sheet gap-0 p-0" showCloseButton={false}
      onOpenAutoFocus={(event) => { event.preventDefault(); openerRef.current = document.activeElement as HTMLElement | null; closeRef.current?.focus() }}
      onCloseAutoFocus={(event) => { event.preventDefault(); openerRef.current?.focus({ preventScroll: true }) }}>
      <SheetHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b px-6 py-4 sm:px-10">
        <div className="min-w-0"><div className="flex min-w-0 items-center gap-2">
          <SheetTitle className="min-w-0 break-all">{row.id}</SheetTitle>
          <Button variant="ghost" size="icon-sm" className="pod-header-action" aria-label="复制运单号" onClick={() => void copyNumber()}><CopyIcon /></Button>
        </div><SheetDescription className="sr-only">查看签收信息、POD 图片和审核记录</SheetDescription></div>
        <SheetClose asChild><Button ref={closeRef} variant="ghost" size="icon-sm" className="pod-header-action" aria-label={embedded ? "关闭 POD 详情" : "关闭 POD 抽屉"}><XIcon /></Button></SheetClose>
      </SheetHeader>
      <div className="pod-detail-body">
        <aside className="pod-detail-info flex min-w-0 flex-col gap-5 px-6 py-4 sm:px-10 sm:py-5" aria-label="POD 签收信息与审核记录">
          <section className="flex flex-col gap-3" aria-labelledby="pod-signature-title">
            <h3 id="pod-signature-title" className="text-sm font-medium">签收信息</h3>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
              <dt className="text-muted-foreground">签收人</dt><dd>{record.recipient}</dd>
              <dt className="text-muted-foreground">签收类型</dt><dd>{record.recipientType}</dd>
              <dt className="text-muted-foreground">签收时间</dt><dd className="tabular-nums">{record.signedAt ? formatDateTime(record.signedAt, { includeSeconds: true }) : "—"}</dd>
              <dt className="text-muted-foreground">收件地址</dt><dd className="break-words"><PodRecipientAddress key={row.id} waybillId={row.id} initialAddress={address} /></dd>
            </dl>
            {latestPhotos.length > 0 && <Thumbnails key={retryRevision} photos={latestPhotos} selected={submissionId === record.latestSubmissionId ? selected : ""} onSelect={(id) => choosePhoto(id, record.latestSubmissionId)} label="POD 图片" />}
          </section>
          <section className="flex flex-col gap-4 border-t pt-4" aria-labelledby="pod-audit-title">
            <h3 id="pod-audit-title" className="text-sm font-medium">POD 审核记录</h3>
            {record.audits.length ? <ol className="flex flex-col">
              {record.audits.map((audit) => <li key={audit.id} className="pod-audit-entry grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3 pb-5">
                <time dateTime={audit.at} className="flex flex-col gap-1 text-xs tabular-nums"><span>{formatTime(audit.at)}</span><span className="text-muted-foreground">{formatDate(audit.at)}</span></time>
                <div className="pod-audit-content relative flex min-w-0 flex-col gap-2 pl-4">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium">核查机构：{audit.reviewer}</span>{audit.passed && <Badge variant="secondary">合规</Badge>}</div>
                  {audit.reason && <p className="text-xs text-muted-foreground">不合规原因：{audit.reason}</p>}
                  <Thumbnails key={retryRevision} photos={submissionPhotos(audit.submissionId)} selected={submissionId === audit.submissionId ? selected : ""} onSelect={(id) => choosePhoto(id, audit.submissionId)} label={`${audit.reviewer} ${formatTime(audit.at)} 审核图片`} />
                </div>
              </li>)}
            </ol> : <p className="text-xs text-muted-foreground">暂无审核记录</p>}
          </section>
        </aside>
        <section ref={previewRef} className="pod-preview flex min-h-0 min-w-0 flex-col px-6 sm:px-10" aria-label="POD 图片预览">
          <div ref={observeViewport} className="pod-image-viewport relative min-h-0 flex-1 overflow-auto" tabIndex={photo ? 0 : undefined} aria-label="POD 图片画布，可用左右方向键切换图片" onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); stepPhoto(event.key === "ArrowLeft" ? -1 : 1) } }}>
            {!photo || isFailed ? <Empty className="h-full"><EmptyHeader><EmptyMedia variant="icon"><ImageIcon /></EmptyMedia><EmptyTitle>{isFailed ? "图片加载失败" : "暂无 POD 图片"}</EmptyTitle><EmptyDescription>{isFailed ? "请切换其他图片或重试。" : "该运单尚无可展示的签收照片。"}</EmptyDescription></EmptyHeader>{isFailed && <Button variant="outline" size="sm" onClick={() => { setLoaded(""); setFailed((items) => items.filter((id) => id !== selected)); setRetryRevision((value) => value + 1) }}>重新加载</Button>}</Empty> : <>
              {!ready && <Skeleton className="absolute inset-4" />}
              <div className="relative" style={{ width: viewportSize.width, height: viewportSize.height }}>
                <Image key={photo.id} unoptimized src={photo.url} alt={photo.label} width={naturalSize.width} height={naturalSize.height} draggable={false} className="pod-preview-image absolute left-1/2 top-1/2 max-w-none object-contain" style={{ width, height, transform: "translate(-50%, -50%)", opacity: ready ? 1 : 0 }} onLoad={(event) => { setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }); setLoaded(photo.id) }} onError={() => setFailed((items) => [...items, photo.id])} />
              </div>
            </>}
          </div>
          <div className="flex shrink-0 items-center justify-center gap-4 border-t p-3">
            <Button variant="outline" size="icon-sm" aria-label="上一张 POD 图片" disabled={index <= 0} onClick={() => stepPhoto(-1)}><ChevronLeftIcon /></Button>
            <span className="text-xs tabular-nums" aria-live="polite">{photo ? `${index + 1} / ${photos.length}` : "0 / 0"}</span>
            <Button variant="outline" size="icon-sm" aria-label="下一张 POD 图片" disabled={index < 0 || index >= photos.length - 1} onClick={() => stepPhoto(1)}><ChevronRightIcon /></Button>
          </div>
        </section>
      </div>
    </PodDetailSurface>
  </Sheet>
}

function PodDetailSurface({ embedded, children, ...props }: ComponentProps<typeof SheetContent> & { embedded: boolean }) {
  if (embedded) return <div className="pod-detail-sheet pod-detail-embedded flex h-full min-h-0 min-w-0 flex-col">{children}</div>
  return <SheetContent {...props}>{children}</SheetContent>
}
