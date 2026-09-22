"use client"

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ListIcon, PlusIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { AUDIT_LABELS, MODE_LABELS, type Application } from "../model"
import { AuditBadge, ConfirmAction, ModeBadge, WorkflowDirtyContext, type Confirmation } from "./withdrawal-parts"

export type WithdrawalPanel = { type: "create" } | { type: "detail" | "reapply" | "close" | "business" | "financial"; id: string }
type Navigation = { onCancel: () => void; onNavigate: (panel: WithdrawalPanel) => void }
const NavigationContext = createContext<Navigation | null>(null)
export function useWithdrawalNavigation() {
  const navigation = useContext(NavigationContext)
  if (!navigation) throw new Error("Withdrawal panels require a workspace")
  return navigation
}

export const withdrawalTransitionName = (id: string) => `withdrawal-row-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`

/** Use the same list-to-card transition as the live dashboard, with a CSS fallback. */
export function enterWithdrawalWorkspace(update: () => void) {
  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update()
    return
  }
  document.documentElement.dataset.withdrawalTransition = "open"
  const transition = document.startViewTransition(() => flushSync(update))
  void transition.finished.catch(() => {}).finally(() => { delete document.documentElement.dataset.withdrawalTransition })
}

export function WithdrawalWorkspace({ panel, rows, onNavigate, onReturn, children }: {
  panel: WithdrawalPanel; rows: Application[]; onNavigate: (panel: WithdrawalPanel) => void; onReturn: () => void
  children: ReactNode
}) {
  const [mobileList, setMobileList] = useState(false)
  const [closing, setClosing] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const dirtyRef = useRef(false)
  const confirmedNavigation = useRef(false)
  const railRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedId = panel.type === "create" ? "new" : panel.id
  const selectedIndex = rows.findIndex((row) => row.id === selectedId)

  useLayoutEffect(() => { workspaceRef.current?.scrollIntoView({ block: "start", behavior: "instant" }) }, [])
  useLayoutEffect(() => {
    const rail = railRef.current
    const card = rail?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!rail?.clientHeight || !card) return
    const bounds = rail.getBoundingClientRect()
    const rect = card.getBoundingClientRect()
    if (rect.top < bounds.top) rail.scrollTop += rect.top - bounds.top
    else if (rect.bottom > bounds.bottom) rail.scrollTop += rect.bottom - bounds.bottom
  }, [selectedId, mobileList])
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  function request(action: () => void) {
    if (closing) return
    if (!dirtyRef.current) { action(); return }
    setConfirmation({
      title: "放弃未提交的内容？", description: "当前修改尚未提交，离开后将丢失这些修改。", label: "放弃修改", destructive: true,
      onConfirm: () => { confirmedNavigation.current = true; action() },
    })
  }
  function navigate(next: WithdrawalPanel, focusCard = false) {
    if (next.type === panel.type && (next.type === "create" || (panel.type !== "create" && next.id === panel.id))) {
      setMobileList(false)
      requestAnimationFrame(() => workspaceRef.current?.querySelector<HTMLElement>("article h2")?.focus({ preventScroll: true }))
      return
    }
    request(() => {
      onNavigate(next)
      if (!focusCard) setMobileList(false)
      else requestAnimationFrame(() => railRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus({ preventScroll: true }))
    })
  }
  function select(index: number, focusCard = false) {
    const row = rows[index]
    if (row) navigate({ type: "detail", id: row.id }, focusCard)
  }
  function close() {
    request(() => {
      setClosing(true)
      closeTimer.current = setTimeout(onReturn, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180)
    })
  }
  function cancel() {
    if (panel.type === "create") close()
    else navigate({ type: "detail", id: panel.id })
  }
  return <WorkflowDirtyContext.Provider value={dirtyRef}>
    <section ref={workspaceRef} aria-label="DSP提现模式工作区" className={cn("withdrawal-workspace flex min-w-0 flex-col gap-3", closing && "withdrawal-workspace-closing")} onKeyDown={(event) => {
      if (event.key !== "Escape" || event.defaultPrevented || (event.target as HTMLElement).closest('[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]')) return
      event.preventDefault()
      close()
    }}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><Button variant="outline" size="sm" onClick={close} disabled={closing}><ArrowLeftIcon data-icon="inline-start" />返回列表</Button><h1 className="truncate text-base font-medium">DSP提现模式管理</h1></div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">{panel.type === "create" ? "新建申请" : `第 ${selectedIndex + 1} / ${rows.length} 条`}</span>
          <Button variant="outline" size="icon-sm" aria-label="上一条申请" disabled={closing || selectedIndex <= 0} onClick={() => select(selectedIndex - 1)}><ChevronLeftIcon /></Button>
          <Button variant="outline" size="icon-sm" aria-label="下一条申请" disabled={closing || selectedIndex < 0 || selectedIndex >= rows.length - 1} onClick={() => select(selectedIndex + 1)}><ChevronRightIcon /></Button>
          <Button variant="outline" size="sm" className="lg:hidden" aria-expanded={mobileList} aria-controls="withdrawal-card-list" onClick={() => {
            setMobileList(!mobileList)
            requestAnimationFrame(() => {
              const target = mobileList ? workspaceRef.current?.querySelector<HTMLElement>("article h2") : railRef.current?.querySelector<HTMLElement>('[aria-current="true"]')
              target?.focus({ preventScroll: true })
            })
          }} disabled={closing}><ListIcon data-icon="inline-start" />{mobileList ? "查看内容" : "切换记录"}</Button>
        </div>
      </header>
      <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        <aside id="withdrawal-card-list" aria-label="提现模式申请卡片列表" className={cn("min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card p-3 lg:flex", mobileList ? "flex" : "hidden")} style={{ viewTransitionName: "withdrawal-list" }}>
          <div ref={railRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ul className="flex flex-col gap-2">
              {panel.type === "create" && <li><Button variant="outline" aria-current="true" className="withdrawal-navigation-card h-auto w-full flex-col items-start gap-2 px-3 py-4" onClick={() => navigate({ type: "create" })}><span className="flex items-center gap-2"><PlusIcon data-icon="inline-start" />新建申请</span><span className="text-xs text-muted-foreground">未提交</span></Button></li>}
              {rows.map((row, index) => <li key={row.id} style={{ viewTransitionName: withdrawalTransitionName(row.id) }}>
                <Button variant="outline" className="withdrawal-navigation-card h-auto w-full flex-col items-stretch gap-2 px-3 py-3 text-left" aria-current={row.id === selectedId ? "true" : undefined} aria-label={`查看 ${row.dspName} · ${row.fleetName}，${AUDIT_LABELS[row.auditStatus]}，${row.applicationType === "open" ? "开启申请" : "关闭申请"}，${MODE_LABELS[row.modeStatus]}，最新操作日期：${formatDate(row.latestOperationDate)}`} disabled={closing} onClick={() => select(index)} onKeyDown={(event) => {
                  const target = event.key === "ArrowDown" ? index + 1 : event.key === "ArrowUp" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : null
                  if (target !== null) { event.preventDefault(); select(target, true) }
                }}>
                  <span className="flex min-w-0 items-center justify-between gap-2"><CardText value={row.dspName} /><AuditBadge status={row.auditStatus} /></span>
                  <span className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground"><CardText value={row.fleetName} /><Badge size="sm" variant="outline">{row.applicationType === "open" ? "开启申请" : "关闭申请"}</Badge></span>
                  <span className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground"><span className="flex min-w-0 flex-wrap"><span>最新操作日期：</span><time dateTime={row.latestOperationDate} className="tabular-nums">{formatDate(row.latestOperationDate)}</time></span><ModeBadge status={row.modeStatus} /></span>
                </Button>
              </li>)}
            </ul>
          </div>
        </aside>
        <div className={cn("withdrawal-detail-region min-h-0 min-w-0 overflow-hidden rounded-xl border bg-card lg:block", mobileList && "hidden")} style={{ viewTransitionName: "withdrawal-detail" }}>
          <NavigationContext.Provider value={{ onCancel: cancel, onNavigate: navigate }}>{children}</NavigationContext.Provider>
        </div>
      </div>
    </section>
    <ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} onCloseAutoFocus={(event) => {
      if (confirmedNavigation.current) { event.preventDefault(); confirmedNavigation.current = false }
    }} />
  </WorkflowDirtyContext.Provider>
}

function CardText({ value }: { value: string }) {
  return <Tooltip><TooltipTrigger asChild><span className="min-w-0 truncate">{value}</span></TooltipTrigger><TooltipContent>{value}</TooltipContent></Tooltip>
}
