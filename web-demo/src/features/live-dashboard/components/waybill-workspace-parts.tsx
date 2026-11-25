"use client"

import type { ComponentProps, ReactNode, Ref } from "react"
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ListIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const WAYBILL_CARD_HEIGHT = 112
export const WAYBILL_CARD_PITCH = WAYBILL_CARD_HEIGHT + 8

export function WorkspaceHeader({ title, index, count, onClose, onPrevious, onNext, mobileList, onToggleList, closeRef, disabled = false }: {
  title: string; index: number; count: number; onClose: () => void; onPrevious: () => void; onNext: () => void
  mobileList: boolean; onToggleList: () => void; closeRef?: Ref<HTMLButtonElement>; disabled?: boolean
}) {
  return <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      <Button ref={closeRef} variant="outline" size="sm" onClick={onClose} disabled={disabled}><ArrowLeftIcon data-icon="inline-start" />返回列表</Button>
      <h2 className="truncate text-base font-medium">{title}</h2>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">第 {index + 1} / {count} 件</span>
      <Button variant="outline" size="icon-sm" aria-label="上一件运单" disabled={index <= 0 || disabled} onClick={onPrevious}><ChevronLeftIcon /></Button>
      <Button variant="outline" size="icon-sm" aria-label="下一件运单" disabled={index < 0 || index >= count - 1 || disabled} onClick={onNext}><ChevronRightIcon /></Button>
      <Button variant="outline" size="sm" className="lg:hidden" aria-expanded={mobileList} onClick={onToggleList}><ListIcon data-icon="inline-start" />{mobileList ? "查看详情" : "切换运单"}</Button>
    </div>
  </header>
}

export function WorkspaceColumns({ children }: { children: ReactNode }) {
  return <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[304px_minmax(0,1fr)]">{children}</div>
}

export function WorkspaceRail({ mobileList, children, ...props }: ComponentProps<"aside"> & { mobileList: boolean }) {
  return <aside {...props} className={cn("min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card pt-3 lg:flex", mobileList ? "flex" : "hidden")}>{children}</aside>
}

export function WorkspaceDetail({ mobileList, children, ...props }: ComponentProps<"div"> & { mobileList: boolean }) {
  return <div {...props} className={cn("waybill-detail-region min-h-0 min-w-0 overflow-hidden rounded-xl border bg-card lg:block", mobileList && "hidden")}>{children}</div>
}

export function WaybillCardHeading({ number, status }: { number: string; status?: string }) {
  const value = status?.trim()
  const visible = value && value !== "—" && value !== "-"
  const variant = value === "已妥投" || value === "已签收" ? "success" : value?.includes("异常") ? "destructive" : value === "已下架" ? "warning" : "secondary"
  return <div className="flex min-h-6 min-w-0 items-center justify-between gap-2"><span className="truncate font-medium text-brand [font-size:var(--button-font-size)]">{number}</span>{visible && <Badge variant={variant}>{value}</Badge>}</div>
}

/** A full-card selection button sits beside (never around) contact/location controls. */
export function WaybillNavigationCard({ children, active, label, onSelect, onKeyDown, index, autoHeight = false }: {
  children: ReactNode; active: boolean; label: string; onSelect: () => void
  onKeyDown?: ComponentProps<"button">["onKeyDown"]; index?: number
  autoHeight?: boolean
}) {
  return <div className={cn("relative min-w-0 shrink-0", autoHeight ? "min-h-28" : "h-28")} onClick={(event) => {
    if (!(event.target as HTMLElement).closest("button,a,[data-card-interactive]")) onSelect()
  }}>
    <Button type="button" variant="outline" data-card-index={index} aria-current={active ? "true" : undefined} aria-label={label} className="waybill-navigation-card absolute inset-0 size-full" onClick={onSelect} onKeyDown={onKeyDown} />
    <div className="pointer-events-none relative flex h-full min-w-0 flex-col items-stretch gap-1 px-2.5 py-2.5 text-left text-xs [&_[data-card-interactive]]:pointer-events-auto [&_[data-slot=tooltip-trigger]]:pointer-events-auto [&_a]:pointer-events-auto [&_button]:pointer-events-auto">{children}</div>
  </div>
}
