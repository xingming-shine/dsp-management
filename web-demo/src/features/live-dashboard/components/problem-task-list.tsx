"use client"

import { useEffect, useRef, useState } from "react"
import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"
import { QueryFilterLayout } from "./query-filter-layout"
import { buildProblemTasksCsv } from "../problem-task-export"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataPagination } from "@/components/ui/pagination"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { monitorDrivers, statusLabels } from "../driver-monitor-data"
import { emptyProblemFilters, filterProblemTasks, trackingProblemTasks, fakeDeliveryProblemTasks, inProgressProblemTasks, pendingProblemTasks, suspectedLostProblemTasks, matchesTrackingGap, trackingGapOptions, problemInstructions, problemSnapshotAt, problemTypes, remainingProblemTime, type ProblemFilters, type ProblemTask, type TrackingGapRange } from "../problem-task-data"
import { AlertWaybillWorkspace } from "./alert-waybill-workspace"
import { StatusMultiSelect } from "./status-multi-select"
import { formatDateTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"

const columns = ["运单编号", "运单状态", "问题件上报时间", "问题件类型", "问题件状态", "是否虚假问题件", "处理指令", "剩余处理时长", "责任机构", "当前处理机构", "司机", "路区", "邮编", "最新操作", "操作时间", "操作人"]
const suspectedLostColumns = ["运单编号", "运单状态", "剩余处理时长", "问题件上报时间", "问题件类型", "问题件状态", "处理指令", "责任机构", "司机", "路区", "邮编", "最新操作", "操作时间", "操作人"]
const completedColumns = ["运单编号", "运单状态", "问题件上报时间", "问题件结束时间", "问题件类型", "问题件状态", "处理结果", "责任机构", "司机", "路区", "邮编", "最新操作", "操作时间", "操作人"]

function RemainingTimeCell({ task, now }: { task: ProblemTask; now: number }) {
  return <TableCell className={cn("tabular-nums", Date.parse(task.deadline) <= now && "text-destructive")} title={`截止时间：${formatDateTime(task.deadline)}（纽约时间）`}>{remainingProblemTime(task.deadline, now)}</TableCell>
}

function TaskFilter({ name, label, value, options, onChange }: { name: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <Field><FieldLabel htmlFor={`problem-${name}`}>{label}</FieldLabel><Select value={value} onValueChange={onChange}><SelectTrigger id={`problem-${name}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}

export function ProblemTaskList({ metric, onWorkspaceChange }: { metric: "pending" | "in-progress" | "suspected-lost" | "fake-delivery" | "dsp-tracking"; onWorkspaceChange: (active: boolean) => void }) {
  const isSuspectedLost = metric === "suspected-lost"
  const isFakeDelivery = metric === "fake-delivery"
  const isTracking = metric === "dsp-tracking"
  const isCompleted = isFakeDelivery || isTracking
  const showRemainingTime = metric === "pending" || isSuspectedLost
  const showProcessingAction = metric === "pending" || isSuspectedLost
  const showProcessingFields = !isSuspectedLost && !isCompleted
  const label = isTracking ? "DSP 轨迹断更" : isFakeDelivery ? "虚假签收" : isSuspectedLost ? "疑似丢失" : metric === "pending" ? "待处理" : "进行中"
  const visibleColumns = isCompleted ? completedColumns : isSuspectedLost ? suspectedLostColumns : columns.filter((column) => showRemainingTime || column !== "剩余处理时长")
  const [draft, setDraft] = useState<ProblemFilters>(emptyProblemFilters)
  const [query, setQuery] = useState<ProblemFilters>(emptyProblemFilters)
  const [draftRanges, setDraftRanges] = useState<TrackingGapRange[]>([])
  const [queryRanges, setQueryRanges] = useState<TrackingGapRange[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [now, setNow] = useState(Date.parse(problemSnapshotAt))
  const top = useRef<HTMLDivElement>(null)
  // Demo clock advances from the fixture snapshot; production uses server time.
  useEffect(() => {
    if (!showRemainingTime) return
    const started = Date.now()
    const timer = window.setInterval(() => setNow(Date.parse(problemSnapshotAt) + Date.now() - started), 30_000)
    return () => window.clearInterval(timer)
  }, [showRemainingTime])
  const tasks = isTracking ? trackingProblemTasks : isFakeDelivery ? fakeDeliveryProblemTasks : isSuspectedLost ? suspectedLostProblemTasks : metric === "pending" ? pendingProblemTasks : inProgressProblemTasks
  const rows = filterProblemTasks(tasks, query).filter((task) => !isSuspectedLost || matchesTrackingGap(task.trackingUpdatedAt, queryRanges, now))
  const visible = rows.slice((page - 1) * pageSize, page * pageSize)
  function update(field: keyof ProblemFilters, value: string) { setDraft((current) => ({ ...current, [field]: value })) }
  function changePage(value: number) { setPage(value); top.current?.scrollIntoView({ block: "start" }) }
  function exportRows() {
    try {
      const csv = buildProblemTasksCsv(rows, visibleColumns, now)
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `${label}问题件明细.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(`已导出 ${rows.length} 条记录`)
    } catch {
      toast.error("导出失败，请重试")
    }
  }
  return <AlertWaybillWorkspace rows={rows.map((task) => ({ id: task.id, waybill: task.waybill, task }))} metric={metric} pageSize={pageSize} onPageChange={setPage} onActiveChange={onWorkspaceChange} now={now}>{(open) => <div ref={top} className="flex min-w-0 scroll-mt-20 flex-col gap-4">
    <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); setQuery({ ...draft, number: draft.number.trim() }); setQueryRanges([...draftRanges]); setPage(1) }}>
      <QueryFilterLayout
        desktopBreakpoint="lg"
        fieldCount={showProcessingFields ? 5 : isSuspectedLost ? 3 : 2}
        fields={<>
        <TaskFilter name="driver" label="司机" value={draft.driver} onChange={(value) => update("driver", value)} options={monitorDrivers.map((driver) => ({ value: driver.id, label: driver.name }))} />
        <Field><FieldLabel htmlFor="problem-number">运单编号</FieldLabel><Input id="problem-number" value={draft.number} placeholder="输入完整运单编号" maxLength={100} onChange={(event) => update("number", event.target.value)} /></Field>
        {isSuspectedLost && <Field><FieldLabel htmlFor="problem-tracking-gap">断更时长</FieldLabel><StatusMultiSelect id="problem-tracking-gap" ariaLabel="断更时长" options={trackingGapOptions} value={draftRanges} onValueChange={setDraftRanges} /></Field>}
        {showProcessingFields && <>
        <TaskFilter name="instruction" label="处理指令" value={draft.instruction} onChange={(value) => update("instruction", value)} options={problemInstructions.map((value) => ({ value, label: value }))} />
        <TaskFilter name="type" label="问题件类型" value={draft.type} onChange={(value) => update("type", value)} options={problemTypes.map((value) => ({ value, label: value }))} />
        <TaskFilter name="fake" label="是否虚假问题件" value={draft.fake} onChange={(value) => update("fake", value)} options={[{ value: "yes", label: "是" }, { value: "no", label: "否" }]} />
        </>}
        </>}
        actions={<><Button type="submit">查询</Button><Button type="button" variant="outline" onClick={() => { setDraft(emptyProblemFilters); setQuery(emptyProblemFilters); setDraftRanges([]); setQueryRanges([]); setPage(1) }}>重置</Button></>}
        secondaryActions={<Button type="button" variant="outline" disabled={!rows.length} onClick={exportRows}><DownloadIcon data-icon="inline-start" />导出</Button>}
      />
    </form>
    <Table variant="grid" className={isSuspectedLost || isCompleted ? "min-w-[120rem]" : showRemainingTime ? "min-w-[140rem]" : "min-w-[130rem]"} aria-label={`${label}问题件任务列表`} viewportClassName="max-h-[36rem]" footer={<DataPagination page={page} pageSize={pageSize} total={rows.length} onPageChange={changePage} onPageSizeChange={setPageSize} />}>
      <TableHeader><TableRow>{visibleColumns.map((column) => <TableHead key={column} className={column === "是否虚假问题件" ? "text-center" : undefined}>{column}</TableHead>)}{showProcessingAction && <TableHead sticky="right" className="w-32 min-w-32 text-center">操作</TableHead>}</TableRow></TableHeader>
      <TableBody>{visible.length ? visible.map((task) => <TableRow key={task.id} data-alert-source={task.id}>
        <TableCell><Button variant="link" size="xs" className="px-0" onClick={() => open(task.id)}>{task.waybill.id}</Button></TableCell>
        <TableCell>{statusLabels[task.waybill.status]}</TableCell>
        {isSuspectedLost && <RemainingTimeCell task={task} now={now} />}
        <TableCell className="tabular-nums">{formatDateTime(task.reportedAt)}</TableCell>
        {isCompleted && <TableCell className="tabular-nums">{task.endedAt ? formatDateTime(task.endedAt) : "—"}</TableCell>}
        <TableCell>{task.type}</TableCell>
        <TableCell><Badge variant="secondary">{task.status}</Badge></TableCell>
        {showProcessingFields && <TableCell className="text-center">{task.fake ? "是" : "否"}</TableCell>}
        <TableCell>{isCompleted ? task.result ?? "—" : task.instruction}</TableCell>
        {showRemainingTime && !isSuspectedLost && <RemainingTimeCell task={task} now={now} />}
        <TableCell>{task.responsibleOrg}</TableCell>{showProcessingFields && <TableCell>{task.currentOrg}</TableCell>}
        <TableCell>{task.driver}</TableCell><TableCell>{task.route}</TableCell><TableCell>{task.waybill.postalCode}</TableCell>
        <TableCell>{task.latestAction}</TableCell><TableCell className="tabular-nums">{formatDateTime(task.actionAt)}</TableCell><TableCell>{task.operator}</TableCell>
        {showProcessingAction && <TableCell sticky="right" className="w-32 min-w-32 text-center"><Button type="button" variant="link" size="xs" aria-label={`处理问题件 ${task.waybill.id}`} onClick={() => toast.info(`将打开运单 ${task.waybill.id} 的问题件处理抽屉，当前暂未接入。`)}>处理问题件</Button></TableCell>}
      </TableRow>) : <TableRow><TableCell colSpan={visibleColumns.length + Number(showProcessingAction)}><Empty className="items-start"><EmptyHeader><EmptyTitle>暂无匹配任务</EmptyTitle><EmptyDescription>请调整筛选条件，运单编号需完整匹配。</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}</TableBody>
    </Table>
  </div>}</AlertWaybillWorkspace>
}
