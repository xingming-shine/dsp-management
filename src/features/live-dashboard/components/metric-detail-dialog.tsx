"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  DownloadIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DataPagination } from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { waybillRows } from "@/features/live-dashboard/mock-data"
import { formatDate, formatTime } from "@/lib/date-time"
import { PickupDetailView } from "@/features/live-dashboard/components/pickup-detail-dialog"
import { ReturnDetailView } from "@/features/live-dashboard/components/return-detail-view"
import { DeliveryDetailView, parseDeliveryDetailKey } from "@/features/live-dashboard/components/delivery-detail-view"
import { AlertMetricDetailView } from "@/features/live-dashboard/components/alert-metric-detail-view"
import { ExceptionDistributionDetailView } from "@/features/live-dashboard/components/exception-distribution-detail-view"
import { parseAlertMetricDetailTitle } from "@/features/live-dashboard/alert-metric-config"
import { StatusMultiSelect } from "@/features/live-dashboard/components/status-multi-select"
import { WaybillDetailSheet } from "@/features/live-dashboard/components/waybill-detail-sheet"

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function exportWaybills(title: string) {
  const header = ["运单编号", "运单状态", "司机", "路区", "超期天数", "异常", "更新时间"]
  const rows = waybillRows.map((row) => [
    row.trackingNumber,
    row.status,
    row.driver,
    row.route,
    row.overdue,
    row.issue,
    formatTime(row.updatedAt),
  ])
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `${title}明细.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success("导出成功")
}

function statusVariant(status: string) {
  if (status === "派送异常") return "destructive" as const
  if (status === "已签收") return "success" as const
  return "secondary" as const
}

export type TaskAssignmentRow = {
  taskId: string
  pushedAt: string
  assignedAt: string | null
  deliveryDate: string
  route: string
  assignedCourier: string | null
  pickupCourier: string | null
  courierRoute: string | null
  pickupStatus: "全部收件" | "部分收件" | "未领件"
  waybillCount: number
  uncollectedCount: number
}

type TaskWaybillPickupStatus = "已领件" | "已分拣未领件" | "未分拣未领件"

type TaskWaybillRow = {
  trackingNumber: string
  pushedAt: string
  deliveryDate: string
  assignedCourier: string | null
  pickupCourier: string | null
  route: string
  postalCode: string
  courierRoute: string | null
  pickupStatus: TaskWaybillPickupStatus
  latestAction: string
  actionAt: string
  operator: string
}

const taskAssignmentRows: TaskAssignmentRow[] = [
  { taskId: "TASK202608210001", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: "2026-08-21T05:36:12-04:00", deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: "Fanlin Wu", pickupCourier: "Fanlin Wu", courierRoute: "ABQ01-003", pickupStatus: "全部收件", waybillCount: 22, uncollectedCount: 0 },
  { taskId: "TASK202608210002", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: "2026-08-21T05:41:20-04:00", deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: "Fanlin Wu", pickupCourier: "Axx", courierRoute: "ABQ01-001-A", pickupStatus: "部分收件", waybillCount: 30, uncollectedCount: 15 },
  { taskId: "TASK202608210003", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: null, deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: null, pickupCourier: null, courierRoute: null, pickupStatus: "未领件", waybillCount: 18, uncollectedCount: 18 },
  { taskId: "TASK202608210004", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: null, deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: null, pickupCourier: null, courierRoute: null, pickupStatus: "未领件", waybillCount: 26, uncollectedCount: 26 },
  { taskId: "TASK202608210005", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: "2026-08-21T05:44:06-04:00", deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: "Maria Garcia", pickupCourier: "Maria Garcia", courierRoute: "ABQ01-004", pickupStatus: "全部收件", waybillCount: 24, uncollectedCount: 0 },
  { taskId: "TASK202608210006", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: null, deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: null, pickupCourier: null, courierRoute: null, pickupStatus: "未领件", waybillCount: 21, uncollectedCount: 21 },
  { taskId: "TASK202608210007", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: "2026-08-21T05:52:18-04:00", deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: "James Wilson", pickupCourier: "James Wilson", courierRoute: "ABQ01-005", pickupStatus: "部分收件", waybillCount: 28, uncollectedCount: 9 },
  { taskId: "TASK202608210008", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: null, deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: null, pickupCourier: null, courierRoute: null, pickupStatus: "未领件", waybillCount: 32, uncollectedCount: 32 },
  { taskId: "TASK202608210009", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: "2026-08-21T05:59:31-04:00", deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: "Vivian Ho", pickupCourier: "Vivian Ho", courierRoute: "ABQ01-006", pickupStatus: "全部收件", waybillCount: 19, uncollectedCount: 0 },
  { taskId: "TASK202608210010", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: null, deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: null, pickupCourier: null, courierRoute: null, pickupStatus: "未领件", waybillCount: 25, uncollectedCount: 25 },
  { taskId: "TASK202608210011", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: "2026-08-21T06:02:09-04:00", deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: "Fanlin Wu", pickupCourier: "Fanlin Wu", courierRoute: "ABQ01-003", pickupStatus: "全部收件", waybillCount: 20, uncollectedCount: 0 },
  { taskId: "TASK202608210012", pushedAt: "2026-08-21T05:30:29-04:00", assignedAt: null, deliveryDate: "2026-08-21", route: "SFO-002-027", assignedCourier: null, pickupCourier: null, courierRoute: null, pickupStatus: "未领件", waybillCount: 27, uncollectedCount: 27 },
]

const courierPhoneNumbers: Record<string, string> = {
  "Fanlin Wu": "+1 (415) 555-0108",
  Axx: "+1 (415) 555-0126",
  "Maria Garcia": "+1 (415) 555-0142",
  "James Wilson": "+1 (415) 555-0175",
  "Vivian Ho": "+1 (415) 555-0193",
}

function getTaskWaybillRows(task: TaskAssignmentRow): TaskWaybillRow[] {
  return Array.from({ length: task.waybillCount }, (_, index) => {
    const collected =
      task.pickupStatus === "全部收件" ||
      (task.pickupStatus === "部分收件" && index < task.waybillCount - task.uncollectedCount)
    const pickupStatus: TaskWaybillPickupStatus = collected
      ? "已领件"
      : index % 2 === 0
        ? "已分拣未领件"
        : "未分拣未领件"

    return {
      trackingNumber: `GL20260821${task.taskId.slice(-4)}${String(index + 1).padStart(4, "0")}`,
      pushedAt: task.pushedAt,
      deliveryDate: task.deliveryDate,
      assignedCourier: task.assignedCourier,
      pickupCourier: collected ? task.pickupCourier : null,
      route: task.route,
      postalCode: "94107",
      courierRoute: task.courierRoute,
      pickupStatus,
      latestAction: "站点签入",
      actionAt: task.pushedAt,
      operator: "系统",
    }
  })
}

type TaskFilters = {
  taskQuery: string
  pickupStatuses: TaskAssignmentRow["pickupStatus"][]
  assignmentStatus: "all" | "assigned" | "unassigned"
}

type UncollectedSortDirection = "asc" | "desc" | null

function createTaskFilters(
  assignmentStatus: TaskFilters["assignmentStatus"] = "all"
): TaskFilters {
  return {
    taskQuery: "",
    pickupStatuses: [],
    assignmentStatus,
  }
}

function DetailHeader({
  title,
  description,
  onBack,
}: {
  title: string
  description?: string
  onBack: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回
        </Button>
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function WaybillDetail({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const filteredRows = useMemo(
    () =>
      waybillRows.filter(
        (row) =>
          (!query || row.trackingNumber.includes(query.trim())) &&
          (status === "all" || row.status === status)
      ),
    [query, status]
  )

  return (
    <section
      className="animate-in fade-in slide-in-from-right-4 flex min-w-0 flex-col gap-4 rounded-xl bg-card p-5 duration-200"
      aria-label={`${title}下钻明细`}
    >
      <DetailHeader title={title} description="当前 DSP 车队今日数据 · 默认按最新操作时间倒序" onBack={onBack} />

      <div className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-5">
        <FieldGroup className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
          <Field>
            <FieldLabel htmlFor="waybill-query">运单编号</FieldLabel>
            <Input
              id="waybill-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="精确查询运单编号"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="waybill-status">派件状态</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="waybill-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="待派件">待派件</SelectItem>
                  <SelectItem value="已签收">已签收</SelectItem>
                  <SelectItem value="派送异常">派送异常</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field className="justify-end">
            <FieldLabel className="sr-only">查询操作</FieldLabel>
            <Button type="button" onClick={() => toast.success(`已查询到 ${filteredRows.length} 条记录`)}>
              <SearchIcon data-icon="inline-start" />
              查询
            </Button>
          </Field>
        </FieldGroup>

        <div className="max-h-[calc(100vh-18rem)] overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>运单编号</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>司机</TableHead>
                <TableHead>路区</TableHead>
                <TableHead>超期天数</TableHead>
                <TableHead>异常</TableHead>
                <TableHead>更新时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.trackingNumber}>
                  <TableCell>
                    <Button variant="link" size="xs" onClick={() => toast.info("运单详情接口待接入")}>
                      {row.trackingNumber}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>{row.driver}</TableCell>
                  <TableCell>{row.route}</TableCell>
                  <TableCell>{row.overdue}</TableCell>
                  <TableCell>{row.issue}</TableCell>
                  <TableCell className="tabular-nums">{formatTime(row.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="self-center text-xs text-muted-foreground">
            共 {filteredRows.length} 条记录
          </span>
          <Button variant="outline" onClick={() => exportWaybills(title)}>
            <DownloadIcon data-icon="inline-start" />
            导出
          </Button>
        </div>
      </div>
    </section>
  )
}

const pickupStatusOptions = ["未领件", "部分收件", "全部收件"] as const

function PickupStatusMultiSelect({
  value,
  onValueChange,
}: {
  value: TaskAssignmentRow["pickupStatus"][]
  onValueChange: (value: TaskAssignmentRow["pickupStatus"][]) => void
}) {
  return (
    <StatusMultiSelect
      id="pickup-status"
      ariaLabel="选择领件状态，可多选"
      options={pickupStatusOptions}
      value={value}
      onValueChange={onValueChange}
    />
  )
}

const taskWaybillStatusOptions = [
  "已领件",
  "已分拣未领件",
  "未分拣未领件",
] as const

function TaskWaybillStatusMultiSelect({
  value,
  onValueChange,
}: {
  value: TaskWaybillPickupStatus[]
  onValueChange: (value: TaskWaybillPickupStatus[]) => void
}) {
  return (
    <StatusMultiSelect
      id="task-waybill-status"
      ariaLabel="选择运单领件状态，可多选"
      options={taskWaybillStatusOptions}
      value={value}
      onValueChange={onValueChange}
    />
  )
}

function TaskWaybillDetail({
  task,
  onBack,
  initialPickupStatuses = [],
}: {
  task: TaskAssignmentRow
  onBack: () => void
  initialPickupStatuses?: TaskWaybillPickupStatus[]
}) {
  const [query, setQuery] = useState("")
  const [selectedWaybill, setSelectedWaybill] = useState<TaskWaybillRow | null>(null)
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [pickupStatuses, setPickupStatuses] = useState<TaskWaybillPickupStatus[]>(
    () => [...initialPickupStatuses]
  )
  const [submittedPickupStatuses, setSubmittedPickupStatuses] = useState<
    TaskWaybillPickupStatus[]
  >(() => [...initialPickupStatuses])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const taskWaybillRows = useMemo(() => getTaskWaybillRows(task), [task])
  const filteredRows = useMemo(
    () =>
      taskWaybillRows.filter(
        (row) =>
          (!submittedQuery || row.trackingNumber.includes(submittedQuery)) &&
          (submittedPickupStatuses.length === 0 ||
            submittedPickupStatuses.includes(row.pickupStatus))
      ),
    [submittedPickupStatuses, submittedQuery, taskWaybillRows]
  )
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const queryWaybills = () => {
    const nextQuery = query.trim()
    setQuery(nextQuery)
    setSubmittedQuery(nextQuery)
    setSubmittedPickupStatuses([...pickupStatuses])
    setPage(1)
    toast.success(`已查询到 ${taskWaybillRows.filter((row) =>
      (!nextQuery || row.trackingNumber.includes(nextQuery)) &&
      (pickupStatuses.length === 0 || pickupStatuses.includes(row.pickupStatus))
    ).length} 条运单`)
  }

  const resetFilters = () => {
    setQuery("")
    setSubmittedQuery("")
    setPickupStatuses([])
    setSubmittedPickupStatuses([])
    setPage(1)
    toast.success("筛选条件已重置")
  }

  return (
    <section
      className="animate-in fade-in slide-in-from-right-4 flex min-w-0 flex-col gap-5 rounded-xl bg-card p-5 duration-200"
      aria-label={`${task.taskId}运单列表`}
    >
      <DetailHeader title={`运单列表 -${task.taskId}`} onBack={onBack} />

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-4">
          <FieldGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field>
              <FieldLabel className="text-xs font-normal" htmlFor="task-waybill-task-id">
                任务编号
              </FieldLabel>
              <Input
                id="task-waybill-task-id"
                value={task.taskId}
                readOnly
                aria-readonly="true"
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs font-normal" htmlFor="task-waybill-query">
                运单编号
              </FieldLabel>
              <Input
                id="task-waybill-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    queryWaybills()
                  }
                }}
                placeholder="请输入运单编号"
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs font-normal" htmlFor="task-waybill-status">
                领件状态
              </FieldLabel>
              <TaskWaybillStatusMultiSelect
                value={pickupStatuses}
                onValueChange={setPickupStatuses}
              />
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" onClick={queryWaybills}>
              <SearchIcon data-icon="inline-start" />
              查询
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters}>
              重置
            </Button>
          </div>
        </div>

        <Table variant="grid" className="table-fixed">
          <colgroup>
            <col className="w-40" />
            <col className="w-36" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-24" />
            <col className="w-36" />
            <col className="w-20" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>运单编号</TableHead>
              <TableHead>任务推送时间</TableHead>
              <TableHead>派件日期</TableHead>
              <TableHead>分配快递员</TableHead>
              <TableHead>取件快递员</TableHead>
              <TableHead>路区</TableHead>
              <TableHead>邮编</TableHead>
              <TableHead>快递员路线</TableHead>
              <TableHead>领件状态</TableHead>
              <TableHead>最新操作</TableHead>
              <TableHead>操作时间</TableHead>
              <TableHead>操作人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.trackingNumber}>
                <TableCell>
                  <Button
                    variant="link"
                    size="xs"
                    className="px-0"
                    onClick={() => setSelectedWaybill(row)}
                  >
                    {row.trackingNumber}
                  </Button>
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(row.pushedAt)} {formatTime(row.pushedAt)}
                </TableCell>
                <TableCell>{formatDate(row.deliveryDate)}</TableCell>
                <TableCell>{row.assignedCourier ?? "—"}</TableCell>
                <TableCell>{row.pickupCourier ?? "—"}</TableCell>
                <TableCell>{row.route}</TableCell>
                <TableCell>{row.postalCode}</TableCell>
                <TableCell>{row.courierRoute ?? "—"}</TableCell>
                <TableCell>{row.pickupStatus}</TableCell>
                <TableCell>{row.latestAction}</TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(row.actionAt)} {formatTime(row.actionAt)}
                </TableCell>
                <TableCell>{row.operator}</TableCell>
              </TableRow>
            ))}
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-28 text-center text-muted-foreground">
                  暂无符合条件的运单
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <DataPagination
          className="border-t-0"
          page={currentPage}
          pageSize={pageSize}
          total={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showJumper={false}
        />
      </div>

      <WaybillDetailSheet
        row={selectedWaybill}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWaybill(null)
          }
        }}
      />
    </section>
  )
}

function TaskAssignmentDetail({
  title,
  onBack,
  selectedTask,
  onSelectTask,
}: {
  title: string
  onBack: () => void
  selectedTask: TaskAssignmentRow | null
  onSelectTask: (task: TaskAssignmentRow | null) => void
}) {
  const initialAssignmentStatus: TaskFilters["assignmentStatus"] =
    title === "已分配件量明细"
      ? "assigned"
      : title === "未分配件量明细"
        ? "unassigned"
        : "all"
  const [filters, setFilters] = useState<TaskFilters>(() =>
    createTaskFilters(initialAssignmentStatus)
  )
  const [submittedFilters, setSubmittedFilters] = useState<TaskFilters>(() =>
    createTaskFilters(initialAssignmentStatus)
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [uncollectedSortDirection, setUncollectedSortDirection] =
    useState<UncollectedSortDirection>(null)
  const [contactTask, setContactTask] = useState<TaskAssignmentRow | null>(null)
  const copyPhoneButtonRef = useRef<HTMLButtonElement>(null)
  const [taskWaybillInitialPickupStatuses, setTaskWaybillInitialPickupStatuses] =
    useState<TaskWaybillPickupStatus[]>([])

  const filteredRows = useMemo(
    () =>
      taskAssignmentRows.filter((row) => {
        const matchesTask =
          !submittedFilters.taskQuery ||
          row.taskId.includes(submittedFilters.taskQuery)
        const matchesPickup =
          submittedFilters.pickupStatuses.length === 0 ||
          submittedFilters.pickupStatuses.includes(row.pickupStatus)
        const matchesAssignment =
          submittedFilters.assignmentStatus === "all" ||
          (submittedFilters.assignmentStatus === "assigned" &&
            Boolean(row.assignedCourier)) ||
          (submittedFilters.assignmentStatus === "unassigned" &&
            !row.assignedCourier)
        return matchesTask && matchesPickup && matchesAssignment
      }),
    [submittedFilters]
  )

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const sortedRows = useMemo(() => {
    if (!uncollectedSortDirection) return filteredRows

    return [...filteredRows].sort((left, right) => {
      const difference = left.uncollectedCount - right.uncollectedCount
      return uncollectedSortDirection === "asc" ? difference : -difference
    })
  }, [filteredRows, uncollectedSortDirection])
  const visibleRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleUncollectedSort = () => {
    setUncollectedSortDirection((current) =>
      current === "asc" ? "desc" : "asc"
    )
    setPage(1)
  }

  const contactDriverName = contactTask?.assignedCourier ?? null
  const contactPhone = contactDriverName
    ? courierPhoneNumbers[contactDriverName]
    : null

  const copyContactPhone = async () => {
    if (!contactPhone) return

    try {
      await navigator.clipboard.writeText(contactPhone)
      toast.success("手机号已复制")
    } catch {
      toast.error("复制失败，请手动复制手机号")
    }
  }

  const queryTasks = () => {
    const nextFilters = {
      ...filters,
      taskQuery: filters.taskQuery.trim(),
      pickupStatuses: [...filters.pickupStatuses],
    }
    setFilters(nextFilters)
    setSubmittedFilters(nextFilters)
    setPage(1)
    const matchedCount = taskAssignmentRows.filter((row) => {
      const matchesTask =
        !nextFilters.taskQuery || row.taskId.includes(nextFilters.taskQuery)
      const matchesPickup =
        nextFilters.pickupStatuses.length === 0 ||
        nextFilters.pickupStatuses.includes(row.pickupStatus)
      const matchesAssignment =
        nextFilters.assignmentStatus === "all" ||
        (nextFilters.assignmentStatus === "assigned" &&
          Boolean(row.assignedCourier)) ||
        (nextFilters.assignmentStatus === "unassigned" && !row.assignedCourier)
      return matchesTask && matchesPickup && matchesAssignment
    }).length
    toast.success(`已查询到 ${matchedCount} 条任务`)
  }

  const resetFilters = () => {
    const nextFilters = createTaskFilters()
    setFilters(nextFilters)
    setSubmittedFilters(nextFilters)
    setPage(1)
    toast.success("筛选条件已重置")
  }

  if (selectedTask) {
    return (
      <TaskWaybillDetail
        task={selectedTask}
        initialPickupStatuses={taskWaybillInitialPickupStatuses}
        onBack={() => {
          setTaskWaybillInitialPickupStatuses([])
          onSelectTask(null)
        }}
      />
    )
  }

  return (
    <section
      className="animate-in fade-in slide-in-from-right-4 flex min-w-0 flex-col gap-5 rounded-xl bg-card p-5 duration-200"
      aria-label={`${title}下钻明细`}
    >
      <DetailHeader
        title="任务分配"
        onBack={onBack}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-4">
            <FieldGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field>
                <FieldLabel className="text-xs font-normal" htmlFor="task-query">
                  任务编号
                </FieldLabel>
                <Input
                  id="task-query"
                  value={filters.taskQuery}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      taskQuery: event.target.value,
                    }))
                  }
                  placeholder="请输入任务编号"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      queryTasks()
                    }
                  }}
                />
              </Field>
              <Field>
                <FieldLabel className="text-xs font-normal" htmlFor="pickup-status">
                  领件状态
                </FieldLabel>
                <PickupStatusMultiSelect
                  value={filters.pickupStatuses}
                  onValueChange={(pickupStatuses) =>
                    setFilters((current) => ({ ...current, pickupStatuses }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel className="text-xs font-normal" htmlFor="assignment-status">
                  是否分配快递员
                </FieldLabel>
                <Select
                  value={filters.assignmentStatus}
                  onValueChange={(assignmentStatus: TaskFilters["assignmentStatus"]) =>
                    setFilters((current) => ({ ...current, assignmentStatus }))
                  }
                >
                  <SelectTrigger id="assignment-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="assigned">已分配</SelectItem>
                      <SelectItem value="unassigned">未分配</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <Button type="button" onClick={queryTasks}>
                  <SearchIcon data-icon="inline-start" />
                  查询
                </Button>
                <Button type="button" variant="outline" onClick={resetFilters}>
                  重置
                </Button>
              </div>
            </div>
        </div>

        <Table variant="grid" className="table-fixed">
        <colgroup>
          <col className="w-32" />
          <col className="w-[7.5rem]" />
          <col className="w-[5.25rem]" />
          <col className="w-[4.75rem]" />
          <col className="w-20" />
          <col className="w-20" />
          <col className="w-[5.5rem]" />
          <col className="w-[4.5rem]" />
          <col className="w-[6.5%]" />
          <col className="w-[7.5%]" />
          <col className="w-[3.75rem]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>任务编号</TableHead>
            <TableHead>任务推送时间</TableHead>
            <TableHead>派件日期</TableHead>
            <TableHead>路区</TableHead>
            <TableHead>分配快递员</TableHead>
            <TableHead>取件快递员</TableHead>
            <TableHead>快递员路线</TableHead>
            <TableHead>领件状态</TableHead>
            <TableHead className="text-end">运单数量</TableHead>
            <TableHead
              className="px-1 text-end"
              aria-sort={
                uncollectedSortDirection === "asc"
                  ? "ascending"
                  : uncollectedSortDirection === "desc"
                    ? "descending"
                    : "none"
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="w-full justify-end gap-0.5 px-0"
                onClick={toggleUncollectedSort}
                aria-label={`未领件量，${
                  uncollectedSortDirection === "asc"
                    ? "当前升序，点击切换为降序"
                    : uncollectedSortDirection === "desc"
                      ? "当前降序，点击切换为升序"
                      : "当前未排序，点击按升序排列"
                }`}
              >
                未领件量
                <span
                  data-icon="inline-end"
                  className="-my-1 flex flex-col"
                  aria-hidden="true"
                >
                  <ChevronUpIcon
                    className={
                      uncollectedSortDirection === "asc"
                        ? "size-3 text-foreground"
                        : "size-3 text-muted-foreground/50"
                    }
                  />
                  <ChevronDownIcon
                    className={
                      uncollectedSortDirection === "desc"
                        ? "-mt-1 size-3 text-foreground"
                        : "-mt-1 size-3 text-muted-foreground/50"
                    }
                  />
                </span>
              </Button>
            </TableHead>
            <TableHead className="text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.taskId}>
              <TableCell>
                <Button
                  variant="link"
                  size="xs"
                  className="px-0"
                  onClick={() => {
                    setTaskWaybillInitialPickupStatuses([])
                    onSelectTask(row)
                  }}
                >
                  {row.taskId}
                </Button>
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(row.pushedAt)} {formatTime(row.pushedAt)}
              </TableCell>
              <TableCell>{formatDate(row.deliveryDate)}</TableCell>
              <TableCell>{row.route}</TableCell>
              <TableCell>{row.assignedCourier ?? "—"}</TableCell>
              <TableCell>{row.pickupCourier ?? "—"}</TableCell>
              <TableCell>{row.courierRoute ?? "—"}</TableCell>
              <TableCell>
                <span>{row.pickupStatus}</span>
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {row.waybillCount}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                <Button
                  variant="link"
                  size="xs"
                  className="px-0 font-medium"
                  aria-label={`查看任务 ${row.taskId} 的未领件运单，共 ${row.uncollectedCount} 件`}
                  onClick={() => {
                    setTaskWaybillInitialPickupStatuses([
                      "已分拣未领件",
                      "未分拣未领件",
                    ])
                    onSelectTask(row)
                  }}
                >
                  {row.uncollectedCount}
                </Button>
              </TableCell>
              <TableCell className="text-center">
                {row.assignedCourier ? (
                  <Button
                    variant="link"
                    size="xs"
                    className="px-0"
                    onClick={() => setContactTask(row)}
                  >
                    联系司机
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
          {visibleRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-28 text-center text-muted-foreground">
                暂无符合条件的任务
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
        </Table>

        <DataPagination
          className="border-t-0"
          page={currentPage}
          pageSize={pageSize}
          total={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showJumper={false}
        />
      </div>

      <Dialog
        open={Boolean(contactTask)}
        onOpenChange={(open) => {
          if (!open) setContactTask(null)
        }}
      >
        <DialogContent
          className="sm:max-w-sm"
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            copyPhoneButtonRef.current?.focus()
          }}
        >
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 border-transparent bg-transparent shadow-none hover:border-transparent"
              aria-label="关闭联系司机弹窗"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </DialogClose>
          <DialogTitle>联系司机</DialogTitle>
          <DialogDescription>
            任务 {contactTask?.taskId} 的分配快递员联系信息
          </DialogDescription>
          {contactDriverName && contactPhone ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {contactDriverName}
                </span>
                <span className="text-base font-medium tabular-nums">
                  {contactPhone}
                </span>
              </div>
              <Button
                ref={copyPhoneButtonRef}
                type="button"
                onClick={copyContactPhone}
              >
                <CopyIcon data-icon="inline-start" />
                复制手机号
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

export function MetricDetailView({
  title,
  onBack,
  onNavigateDetail,
  selectedTask,
  onSelectTask,
}: {
  title: string
  onBack: () => void
  onNavigateDetail: (title: string) => void
  selectedTask: TaskAssignmentRow | null
  onSelectTask: (task: TaskAssignmentRow | null) => void
}) {
  if (title === "领件详情") {
    return <PickupDetailView onBack={onBack} />
  }

  if (title === "应退回") {
    return <ReturnDetailView onBack={onBack} />
  }

  if (parseDeliveryDetailKey(title)) {
    return <DeliveryDetailView key={title} detailKey={title} onBack={onBack} />
  }

  if (parseAlertMetricDetailTitle(title)) {
    return <AlertMetricDetailView title={title} onBack={onBack} onNavigate={onNavigateDetail} />
  }

  if (title === "派送异常分布详情" || title === "派送异常原因分布详情") {
    return <ExceptionDistributionDetailView onBack={onBack} />
  }

  if (
    title === "任务分配" ||
    title === "已分配件量明细" ||
    title === "未分配件量明细"
  ) {
    return (
      <TaskAssignmentDetail
        title={title}
        onBack={onBack}
        selectedTask={selectedTask}
        onSelectTask={onSelectTask}
      />
    )
  }

  return <WaybillDetail title={title} onBack={onBack} />
}
