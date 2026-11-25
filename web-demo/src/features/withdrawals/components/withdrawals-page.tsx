"use client"

import { useRef, useState } from "react"
import { HistoryIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DriverWithdrawalModePage } from "@/features/driver-withdrawal-mode/components/driver-withdrawal-mode-page"
import { useOrganization } from "@/features/organizations/organization-context"
import { useTimezone } from "@/features/preferences/timezone-store"
import { OpeningPanel } from "@/features/withdrawal-mode/components/opening-panel"
import { ClosingPanel } from "@/features/withdrawal-mode/components/review-panels"
import { AgreementSigning } from "@/features/withdrawal-mode/components/payment-agreement"
import { ApplicationInfo, ApplicationMaterials, AuditBadge, AuditHistory, InfoItem, ModeBadge, Notice, WorkflowPanel } from "@/features/withdrawal-mode/components/withdrawal-parts"
import { enterWithdrawalWorkspace, WithdrawalRecordWorkspace } from "@/features/withdrawal-mode/components/withdrawal-workspace"
import { rowActions, type WorkflowAction } from "@/features/withdrawal-mode/model"
import { formatDate, formatDateTime } from "@/lib/date-time"
import { mockSession } from "@/mocks/session"
import { emptyFleet } from "../mock-data"
import { activeDrivers, withAffectedDrivers } from "../model"
import { dispatchFleetAction, useFinanceWithdrawals } from "../store"

type FleetPanel = { type: "create" } | { type: "history" | "close" | "reapply"; id: string }
export function WithdrawalsPage() {
  const { organizationId } = useOrganization()
  return <FleetWithdrawals key={organizationId} />
}
function FleetWithdrawals() {
  const { organization } = useOrganization()
  const state = useFinanceWithdrawals()
  const timeZone = useTimezone()
  const application = state.applications.find((row) => row.organizationId === organization.id)
  const fleet = withAffectedDrivers(application ?? emptyFleet(organization.id, organization.name), state.drivers)
  const history = state.history.filter((row) => row.organizationId === organization.id).sort((a, b) => b.logs[0].time.localeCompare(a.logs[0].time))
  const count = activeDrivers(state.drivers, organization.id).length
  const [panel, setPanel] = useState<FleetPanel | null>(null)
  const lastTrigger = useRef<HTMLElement | null>(null)
  const selected = panel && panel.type !== "create" ? history.find((row) => row.requestId === panel.id) : undefined
  const pending = application?.auditStatus === "pending_business" || application?.auditStatus === "pending_financial"
  const actions = rowActions(fleet)
  function open(next: FleetPanel, trigger: HTMLElement) {
    lastTrigger.current = trigger
    enterWithdrawalWorkspace(() => setPanel(next))
  }
  function returnToList() {
    setPanel(null)
    requestAnimationFrame(() => lastTrigger.current?.focus({ preventScroll: true }))
  }
  function commit(action: WorkflowAction) {
    try {
      dispatchFleetAction(action, mockSession.user.name)
      returnToList()
      toast.success(action.type === "close" ? "关闭申请已提交，等待业务审核" : "开通申请已提交，等待业务及财务审核")
    } catch (error) { toast.error(error instanceof Error ? error.message : "提交失败，请重试") }
  }
  const summary = <Card size="sm">
    <CardHeader><CardTitle className="flex flex-wrap items-center gap-2">车队提现模式 <ModeBadge status={fleet.modeStatus} />{pending && <AuditBadge status={fleet.auditStatus} />}</CardTitle><CardDescription>{organization.name} · {fleet.dspName}</CardDescription></CardHeader>
    <CardContent><dl className="grid grid-cols-1 gap-4 sm:grid-cols-3"><InfoItem label="开启时间">{fleet.openedAt ? formatDateTime(fleet.openedAt, { timeZone }) : "—"}</InfoItem><InfoItem label="当前开通提现司机"><span className="tabular-nums">{count} 人</span></InfoItem>{fleet.modeStatus === "closing_pending_effective" && <InfoItem label="关闭生效时间">{formatDateTime(fleet.expectedCloseTime, { timeZone })}</InfoItem>}</dl></CardContent>
    <CardFooter className="flex flex-wrap justify-end gap-3"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={(event) => { if (!history.length) { toast.info("暂无申请记录"); return } open({ type: "history", id: history[0].requestId! }, event.currentTarget) }}><HistoryIcon data-icon="inline-start" />申请记录 {history.length} 条</Button>
      {actions.close && <Button variant="outline" size="sm" onClick={(event) => open({ type: "close", id: application!.requestId! }, event.currentTarget)}>申请关闭</Button>}
      {(!application || actions.reopen || actions.reapply) && <Button size="sm" onClick={(event) => open(application ? { type: "reapply", id: application.requestId! } : { type: "create" }, event.currentTarget)}><PlusIcon data-icon="inline-start" />{actions.reapply ? "修改并重新提交" : "申请开启提现模式"}</Button>}
    </div></CardFooter>
  </Card>
  return <>
    <div hidden={Boolean(panel)}><DriverWithdrawalModePage overview={summary} management /></div>
    {panel && <WithdrawalRecordWorkspace<FleetPanel> panel={panel} title="提现管理" newPanel={{ type: "create" }} onReturn={returnToList} onNavigate={setPanel} detailPanel={(id) => ({ type: "history", id })} cards={history.map((row) => ({ id: row.requestId!, label: `${row.applicationType === "open" ? "开启" : "关闭"}申请 ${row.requestId}`, content: <><span className="flex items-center justify-between gap-2"><Badge variant="outline" size="sm">{row.applicationType === "open" ? "开启申请" : "关闭申请"}</Badge><AuditBadge status={row.auditStatus} /></span><span>{row.fleetName}</span><span className="text-xs text-muted-foreground">{formatDate(row.latestOperationDate)}</span></> }))}>
      {({ onCancel, onNavigate }) => panel.type === "create" || panel.type === "reapply" ? <OpeningPanel key={panel.type} row={panel.type === "reapply" ? application : undefined} prefill={fleet} lockFleet onClose={onCancel} onSubmit={(draft) => commit({ type: "open", id: fleet.id, existingId: panel.type === "reapply" ? application?.id : undefined, draft })} />
        : panel.type === "close" ? <ClosingPanel key={fleet.id} row={fleet} onClose={onCancel} onSubmit={(reason) => commit({ type: "close", id: fleet.id, reason })} />
        : selected ? <WorkflowPanel key={selected.requestId} title="车队提现申请记录" description={`${selected.fleetName} · ${selected.dspName}`} onClose={onCancel} footer={() => <>{selected.requestId === application?.requestId && actions.close && <Button variant="outline" onClick={() => onNavigate({ type: "close", id: selected.requestId! })}>申请关闭</Button>}{selected.requestId === application?.requestId && (actions.reapply || actions.reopen) && <Button onClick={() => onNavigate({ type: "reapply", id: selected.requestId! })}>{actions.reapply ? "修改并重新提交" : "申请开启提现模式"}</Button>}</>}>
          <ApplicationInfo row={selected} /><Separator />{selected.applicationType === "open" ? <><ApplicationMaterials row={selected} /><Separator /><AgreementSigning /><Separator /></> : <Notice>关闭申请只需业务审核，通过后联动关闭车队及司机的提现模式。</Notice>}<AuditHistory row={selected} />
        </WorkflowPanel> : null}
    </WithdrawalRecordWorkspace>}
  </>
}
