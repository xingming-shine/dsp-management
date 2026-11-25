"use client"

import type { ReactNode } from "react"
import { EyeIcon, EyeOffIcon, ExternalLinkIcon, ImageIcon, LoaderCircleIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PodDetailSheet } from "@/features/live-dashboard/components/pod-detail-sheet"
import { WaybillDetailSheet } from "@/features/live-dashboard/components/waybill-detail-sheet"
import { alertLabels, statusLabels, validCoordinate, type MonitorWaybill, type MonitorDriver } from "@/features/live-dashboard/driver-monitor-data"
import { formatDateTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"

export function WaybillLocationLink({ row, label }: { row: MonitorWaybill; label?: string }) {
  const point = row.collectedPosition
  if (row.status === "pending" || row.status === "nonstandard_return" || !validCoordinate(point)) return null
  const locationLabel = row.status === "delivered" ? "妥投位置" : "异常采集位置"
  return <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point[1]},${point[0]}`)}`} target="_blank" rel="noopener noreferrer" className="delivery-waybill-link inline-flex shrink-0 items-center gap-1 text-xs" aria-label={label ? `跳转至${locationLabel}` : undefined} title={`采集坐标：${point[1].toFixed(5)}, ${point[0].toFixed(5)}`} onClick={(event) => event.stopPropagation()}><ExternalLinkIcon className="size-3" />{label ?? locationLabel}</a>
}

type CardProps = {
  layout?: "map" | "list"
  media?: ReactNode
  row: MonitorWaybill
  driver: MonitorDriver
  selected: boolean
  address?: string
  addressLoading: boolean
  onAddress: () => void
  onSelect: () => void
  onDetail: () => void
  onPod: () => void
  selectable?: boolean
  detailPresentation?: "dialog" | "workspace"
}

export function MonitorWaybillCard({ row, driver, selected, address, addressLoading, onAddress, onSelect, onDetail, onPod, selectable = false, layout = "map", media, detailPresentation = "dialog" }: CardProps) {
  if (layout === "list") return <article id={`map-waybill-${row.id}`} data-selected={selected} aria-label={`${row.id} ${statusLabels[row.status]}`} tabIndex={selectable ? 0 : undefined} className={cn("@container rounded-lg border bg-card p-4 outline-none focus-visible:ring-1 focus-visible:ring-ring", selected && "border-brand/30 bg-brand-selected")} onClick={(event) => { if (!(event.target as HTMLElement).closest("button,a")) onSelect() }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect() } }}>
    <div className="flex min-w-0 flex-col gap-4 @min-[600px]:flex-row @min-[600px]:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <a href={`#waybill-${row.id}`} className="delivery-waybill-link delivery-waybill-number text-sm" aria-haspopup={detailPresentation === "dialog" ? "dialog" : undefined} onClick={(event) => { event.preventDefault(); onDetail() }}>{row.id}</a>
          <span className="inline-flex shrink-0 items-center gap-1"><i aria-hidden="true" className="delivery-status-dot" data-status={row.status} />{statusLabels[row.status]}</span>
          {row.alerts.map((alert) => <Badge key={alert} variant="destructive">{alertLabels[alert]}</Badge>)}
          {row.overdueDays > 0 && <Badge variant="destructive">超 {row.overdueDays} 天</Badge>}
          <span className="inline-flex items-center gap-2"><Badge variant="secondary" className="bg-brand-selected text-brand">{driver.rating}★</Badge>{driver.name}</span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
          <span>{row.stop}</span><span>序号 {row.deliveryNumber.replace(/^B/, "")}</span>
          {row.type !== "普通件" && <Badge variant="outline">{row.type}</Badge>}
          <span>{row.postalCode}</span>
          <span className="inline-flex min-w-0 flex-1 basis-40 items-center gap-2"><span className="truncate text-foreground" title={address ?? row.maskedAddress}>{address ?? row.maskedAddress}</span><Button variant="ghost" size="icon-xs" className="shrink-0 border-transparent bg-transparent" aria-label={`${address ? "隐藏" : "查看"} ${row.id} 收件地址`} disabled={addressLoading} onClick={onAddress}>{addressLoading ? <LoaderCircleIcon className="animate-spin" /> : address ? <EyeOffIcon /> : <EyeIcon />}</Button></span>
          {row.transferred && <Badge variant="destructive">今日转派</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
          <span>{row.status === "delivered" ? "签收时间" : "最新操作"}：{row.status !== "delivered" && `${row.latestAction} `}<time dateTime={row.signedAt ?? row.actionAt} className="tabular-nums">{formatDateTime(row.signedAt ?? row.actionAt, { includeSeconds: true })}</time></span>
          {row.status === "pending" && row.attempts > 0 && <span>派送 {row.attempts} 次</span>}
          {row.issueType && <span>问题件类型：{row.issueType}</span>}
          <WaybillLocationLink row={row} />
          {row.deviation !== null && <span className={cn(row.deviation > 800 && "text-destructive")}>偏离度 {row.deviation} m</span>}
        </div>
      </div>
      {media}
    </div>
  </article>
  return <article id={`map-waybill-${row.id}`} data-status={row.status} data-selected={selected} className={cn("delivery-waybill-card flex gap-3 bg-card p-3 outline-none focus-visible:ring-1 focus-visible:ring-ring", layout === "map" ? "cursor-pointer flex-col rounded-md border hover:bg-muted/40" : "flex-col gap-5 rounded-lg border p-4 lg:flex-row lg:justify-between")} tabIndex={layout === "map" ? 0 : undefined} aria-label={`${row.deliveryNumber} ${row.id} ${statusLabels[row.status]}`} onClick={(event) => { if (!(event.target as HTMLElement).closest("button,a")) onSelect() }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect() } }}>
    <div className={cn("flex min-w-0 flex-col gap-2", undefined)} >
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <div className="flex min-w-0 items-center gap-4">
      <a href={`#waybill-${row.id}`} className="delivery-waybill-link delivery-waybill-number break-all text-sm" aria-haspopup={detailPresentation === "dialog" ? "dialog" : undefined} onClick={(event) => { event.preventDefault(); onDetail() }}>{row.id}</a>
      <span className="flex shrink-0 items-center gap-1 text-xs"><i className="delivery-status-dot" data-status={row.status} />{statusLabels[row.status]}</span>
      </div>
      {(row.overdueDays > 0 || row.alerts.length > 0) && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-1" role="group" aria-label="运单标签">
      {row.alerts.map((alert) => <Badge key={alert} variant="destructive">{alertLabels[alert]}</Badge>)}
      {row.overdueDays > 0 && <Badge variant="destructive">超 {row.overdueDays} 天</Badge>}
      </div>}
    </div>
    <div className={cn("flex flex-wrap items-center gap-y-2 text-xs text-muted-foreground", "gap-x-2")}>
      <Badge variant="secondary" className="bg-brand-selected text-brand">{driver.rating}★</Badge><span className="text-foreground">{driver.name}</span>
      <span className={cn("inline-flex items-center gap-2", layout === "map" && "ml-auto")}><span>{row.stop}</span><span className="font-normal text-foreground">{row.deliveryNumber.replace(/^B/, "")}</span></span>{row.type !== "普通件" && <Badge variant="outline" className="bg-transparent">{row.type}</Badge>}
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs"><div className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-muted-foreground">{row.postalCode}</span><span className="min-w-0 break-words">{address ?? row.maskedAddress}</span><Button variant="ghost" size="icon-xs" className="shrink-0 border-transparent bg-transparent" aria-label={`${address ? "隐藏" : "查看"} ${row.id} 收件地址`} disabled={addressLoading} onClick={onAddress}>{addressLoading ? <LoaderCircleIcon className="animate-spin" /> : address ? <EyeOffIcon /> : <EyeIcon />}</Button></div>{row.transferred && <Badge variant="destructive">今日转派</Badge>}</div>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>{row.signedAt ? "签收时间" : "最新操作"}：{!row.signedAt && `${row.latestAction} `}<time dateTime={row.signedAt ?? row.actionAt} className="tabular-nums">{formatDateTime(row.signedAt ?? row.actionAt, { includeSeconds: true })}</time></span>
      {row.status === "pending" && row.attempts > 0 && <span>派送 <b className="font-medium text-destructive">{row.attempts}</b> 次</span>}
      {(row.issueType || (row.status === "exception" && validCoordinate(row.collectedPosition))) && <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
        <span>问题件类型：{row.issueType ?? "—"}</span>
        {row.status === "exception" && <WaybillLocationLink row={row} label="跳转" />}
      </div>}
    </div>
    {layout === "map" && (row.status === "delivered" || row.deviation !== null) && <div className="flex flex-wrap items-center gap-2">
      {row.status === "delivered" && <WaybillLocationLink row={row} />}
      {row.deviation !== null && <span className={cn("text-xs", row.deviation > 800 ? "text-destructive" : "text-muted-foreground")}>偏离度 {row.deviation} m</span>}
      {row.status === "delivered" && !media && <Button variant="outline" size="xs" className="ml-auto border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" onClick={onPod}><ImageIcon data-icon="inline-start" />查看 POD</Button>}
    </div>}
    </div>
    {media}
  </article>
}

export function MonitorWaybillOverlay({ row, driver, initialTab, initialPhotoId, address, onClose, embedded = false }: { row: MonitorWaybill | null; driver?: MonitorDriver; initialTab: "details" | "pod"; initialPhotoId?: string; address?: string; onClose: () => void; embedded?: boolean }) {
  if (initialTab === "pod") return row?.status === "delivered" ? <PodDetailSheet embedded={embedded} key={`${row.id}-${initialPhotoId ?? "default"}`} row={row} initialPhotoId={initialPhotoId} address={address} onClose={onClose} /> : null

  return <WaybillDetailSheet
    key={row?.id ?? "closed"}
    embedded={embedded}
    row={row ? {
      trackingNumber: row.id,
      pushedAt: row.actionAt,
      pickupCourier: driver?.name ?? null,
      pickupStatus: statusLabels[row.status],
      actionAt: row.actionAt,
      route: driver?.route ?? "—",
      postalCode: row.postalCode,
      nonStandardReturnInfo: row.nonStandardReturnInfo,
    } : null}
    onOpenChange={(open) => { if (!open) onClose() }}
  />
}
