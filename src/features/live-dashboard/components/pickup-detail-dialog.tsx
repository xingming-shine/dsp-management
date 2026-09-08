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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusMultiSelect } from "@/features/live-dashboard/components/status-multi-select"
import { WaybillDetailSheet } from "@/features/live-dashboard/components/waybill-detail-sheet"
import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/date-time"

type PickupDriverRow = {
  driverId: string
  driver: string
  phone: string | null
  route: string
  signedInAt: string | null
  signedOutAt: string | null
  expected: number
  unsortedUncollected: number
  sortedUncollected: number
  currentPickup: number
  nonCurrentPickup: number
}

type PickupSortKey =
  | "expected"
  | "unsortedUncollected"
  | "sortedUncollected"
  | "currentPickup"
  | "nonCurrentPickup"
  | "totalPickup"

type PickupWaybillSortKey = "pushedAt" | "pickupAt"

type SortDirection = "asc" | "desc"

type PickupWaybillStatus = "未分拣未领件" | "已分拣未领件" | "已领件"

type PickupWaybillRow = {
  trackingNumber: string
  waybillStatus: "待领件" | "已领件"
  pushedAt: string
  pickupAt: string | null
  assignedCourier: string | null
  pickupCourier: string | null
  driverId: string
  driver: string
  route: string
  postalCode: string
  courierRoute: string | null
  pickupStatus: PickupWaybillStatus
  isTodayDeliveryTask: boolean
  latestAction: string
  actionAt: string
  operator: string
}

const pickupDriverRows: PickupDriverRow[] = [
  {
    driverId: "unassigned",
    driver: "未分配",
    phone: null,
    route: "—",
    signedInAt: null,
    signedOutAt: null,
    expected: 280,
    unsortedUncollected: 102,
    sortedUncollected: 178,
    currentPickup: 0,
    nonCurrentPickup: 0,
  },
  {
    driverId: "DRV-FANLIN-WU",
    driver: "Fanlin Wu",
    phone: "+1 (415) 555-0126",
    route: "ABQ01-003",
    signedInAt: "2026-08-21T05:30:29-04:00",
    signedOutAt: "2026-08-21T08:18:12-04:00",
    expected: 260,
    unsortedUncollected: 0,
    sortedUncollected: 20,
    currentPickup: 240,
    nonCurrentPickup: 5,
  },
  {
    driverId: "DRV-MARIA-GARCIA",
    driver: "Maria Garcia",
    phone: "+1 (415) 555-0148",
    route: "ABQ01-004",
    signedInAt: "2026-08-21T05:34:06-04:00",
    signedOutAt: "2026-08-21T08:24:51-04:00",
    expected: 245,
    unsortedUncollected: 0,
    sortedUncollected: 0,
    currentPickup: 245,
    nonCurrentPickup: 4,
  },
  {
    driverId: "DRV-JAMES-WILSON",
    driver: "James Wilson",
    phone: "+1 (415) 555-0182",
    route: "ABQ01-005",
    signedInAt: "2026-08-21T05:38:44-04:00",
    signedOutAt: null,
    expected: 230,
    unsortedUncollected: 0,
    sortedUncollected: 0,
    currentPickup: 230,
    nonCurrentPickup: 3,
  },
  {
    driverId: "DRV-VIVIAN-HO",
    driver: "Vivian Ho",
    phone: "+1 (415) 555-0165",
    route: "ABQ01-006",
    signedInAt: "2026-08-21T05:42:19-04:00",
    signedOutAt: "2026-08-21T08:31:09-04:00",
    expected: 225,
    unsortedUncollected: 0,
    sortedUncollected: 0,
    currentPickup: 225,
    nonCurrentPickup: 3,
  },
  {
    driverId: "DRV-AXX",
    driver: "Axx",
    phone: "+1 (415) 555-0171",
    route: "ABQ01-001-A",
    signedInAt: "2026-08-21T05:46:37-04:00",
    signedOutAt: null,
    expected: 205,
    unsortedUncollected: 0,
    sortedUncollected: 0,
    currentPickup: 205,
    nonCurrentPickup: 2,
  },
  {
    driverId: "DRV-ALICE-CHEN",
    driver: "Alice Chen",
    phone: "+1 (415) 555-0134",
    route: "SLE-CH-01",
    signedInAt: "2026-08-21T05:51:03-04:00",
    signedOutAt: "2026-08-21T08:37:25-04:00",
    expected: 190,
    unsortedUncollected: 0,
    sortedUncollected: 0,
    currentPickup: 190,
    nonCurrentPickup: 1,
  },
  {
    driverId: "DRV-MIKE-LIU",
    driver: "Mike Liu",
    phone: "+1 (415) 555-0193",
    route: "SLE-LI-02",
    signedInAt: "2026-08-21T05:55:18-04:00",
    signedOutAt: null,
    expected: 178,
    unsortedUncollected: 0,
    sortedUncollected: 0,
    currentPickup: 178,
    nonCurrentPickup: 1,
  },
  {
    driverId: "DRV-SOPHIA-ZHANG",
    driver: "Sophia Zhang",
    phone: "+1 (415) 555-0119",
    route: "SLE-ZH-03",
    signedInAt: null,
    signedOutAt: null,
    expected: 124,
    unsortedUncollected: 0,
    sortedUncollected: 0,
    currentPickup: 124,
    nonCurrentPickup: 1,
  },
]

function getTotalPickup(row: PickupDriverRow) {
  return row.currentPickup + row.nonCurrentPickup
}

function formatDateTime(value: string | null, emptyLabel: string) {
  return value ? `${formatDate(value)} ${formatTime(value)}` : emptyLabel
}

function createPickupWaybillRows() {
  const rows: PickupWaybillRow[] = []
  let sequence = 100000

  pickupDriverRows.forEach((driverRow) => {
    const statuses: Array<[
      PickupWaybillStatus | "当期任务领件" | "非当期任务领件",
      number,
    ]> = [
      ["未分拣未领件", driverRow.unsortedUncollected],
      ["已分拣未领件", driverRow.sortedUncollected],
      ["当期任务领件", driverRow.currentPickup],
      ["非当期任务领件", driverRow.nonCurrentPickup],
    ]

    statuses.forEach(([pickupStatus, count]) => {
      for (let index = 0; index < count; index += 1) {
        sequence += 1
        const isCurrentPickup = pickupStatus === "当期任务领件"
        const isNonCurrentPickup = pickupStatus === "非当期任务领件"
        const normalizedPickupStatus: PickupWaybillStatus =
          isCurrentPickup || isNonCurrentPickup ? "已领件" : pickupStatus
        const isPickedUp = normalizedPickupStatus === "已领件"
        const isSorted = normalizedPickupStatus !== "未分拣未领件"
        const isTodayDeliveryTask = !isNonCurrentPickup
        const pushedAt = "2026-08-21T05:30:29-04:00"
        const pickupAt = isPickedUp ? "2026-08-21T07:35:42-04:00" : null
        rows.push({
          trackingNumber: `GL20260821${String(sequence).padStart(8, "0")}`,
          waybillStatus: isPickedUp ? "已领件" : "待领件",
          pushedAt,
          pickupAt,
          assignedCourier: driverRow.driver === "未分配" ? null : driverRow.driver,
          pickupCourier: isPickedUp && driverRow.driver !== "未分配" ? driverRow.driver : null,
          driverId: driverRow.driverId,
          driver: driverRow.driver,
          route: driverRow.route,
          postalCode: String(94101 + (sequence % 8)),
          courierRoute: driverRow.driver === "未分配" ? null : driverRow.route,
          pickupStatus: normalizedPickupStatus,
          isTodayDeliveryTask,
          latestAction: isPickedUp ? "快递员取件" : isSorted ? "扫描分拣" : "任务推送",
          actionAt: pickupAt ?? (isSorted ? "2026-08-21T06:12:25-04:00" : pushedAt),
          operator: isPickedUp ? driverRow.driver : isSorted ? "站点操作员" : "系统",
        })
      }
    })
  })

  return rows
}

const pickupWaybillRows = createPickupWaybillRows()

const pickupStatusOptions: PickupWaybillStatus[] = [
  "未分拣未领件",
  "已分拣未领件",
  "已领件",
]

function PickupStatusMultiSelect({
  value,
  onValueChange,
}: {
  value: PickupWaybillStatus[]
  onValueChange: (value: PickupWaybillStatus[]) => void
}) {
  return (
    <StatusMultiSelect
      id="pickup-waybill-status-filter"
      ariaLabel="选择领件状态，可多选"
      options={pickupStatusOptions}
      value={value}
      onValueChange={onValueChange}
    />
  )
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function exportPickupWaybills(rows: PickupWaybillRow[]) {
  const header = [
    "运单编号",
    "运单状态",
    "任务推送时间",
    "领件时间",
    "分配快递员",
    "取件快递员",
    "路区",
    "邮编",
    "快递员路线",
    "领件状态",
    "今日派件任务",
    "最新操作",
    "操作时间",
    "操作人",
  ]
  const csvRows = rows.map((row) => [
    row.trackingNumber,
    row.waybillStatus,
    formatDateTime(row.pushedAt, "—"),
    formatDateTime(row.pickupAt, "—"),
    row.assignedCourier ?? "—",
    row.pickupCourier ?? "—",
    row.route,
    row.postalCode,
    row.courierRoute ?? "—",
    row.pickupStatus,
    row.isTodayDeliveryTask ? "是" : "否",
    row.latestAction,
    formatDateTime(row.actionAt, "—"),
    row.operator,
  ])
  const csv = [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = "领件运单明细.csv"
  link.click()
  URL.revokeObjectURL(url)
  toast.success("导出成功")
}

function SortableHead<TSortKey extends string>({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  align = "end",
}: {
  label: string
  sortKey: TSortKey
  activeSortKey: TSortKey | null
  direction: SortDirection
  onSort: (key: TSortKey) => void
  align?: "start" | "end"
}) {
  const isActive = activeSortKey === sortKey

  return (
    <TableHead className={cn(align === "end" && "text-end")}>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={cn("px-1 text-xs font-medium", align === "end" && "ms-auto")}
        aria-label={`${label}，${isActive ? `当前${direction === "asc" ? "升序" : "降序"}` : "未排序"}，点击排序`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <span data-icon="inline-end" className="flex flex-col">
          <ChevronUpIcon className={cn("size-3", isActive && direction === "asc" ? "text-brand" : "text-muted-foreground/40")} />
          <ChevronDownIcon className={cn("-mt-1 size-3", isActive && direction === "desc" ? "text-brand" : "text-muted-foreground/40")} />
        </span>
      </Button>
    </TableHead>
  )
}

function ContactDriverDialog({
  driver,
  onOpenChange,
}: {
  driver: PickupDriverRow | null
  onOpenChange: (open: boolean) => void
}) {
  const copyButtonRef = useRef<HTMLButtonElement>(null)

  const copyPhone = async () => {
    if (!driver?.phone) return
    try {
      await navigator.clipboard.writeText(driver.phone)
      toast.success("手机号已复制")
    } catch {
      toast.error("复制失败，请手动复制手机号")
    }
  }

  return (
    <Dialog open={Boolean(driver)} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          copyButtonRef.current?.focus()
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
        <DialogDescription>{driver?.driver} 的联系信息</DialogDescription>
        {driver?.phone ? (
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-muted-foreground">{driver.driver}</span>
              <span className="text-base font-medium tabular-nums">{driver.phone}</span>
            </div>
            <Button ref={copyButtonRef} type="button" onClick={copyPhone}>
              <CopyIcon data-icon="inline-start" />
              复制手机号
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function PickupDetailView({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState("driver")
  const [driverFilter, setDriverFilter] = useState("all")
  const [signInFilter, setSignInFilter] = useState("all")
  const [signOutFilter, setSignOutFilter] = useState("all")
  const [submittedDriverFilter, setSubmittedDriverFilter] = useState("all")
  const [submittedSignInFilter, setSubmittedSignInFilter] = useState("all")
  const [submittedSignOutFilter, setSubmittedSignOutFilter] = useState("all")
  const [waybillDriverFilter, setWaybillDriverFilter] = useState("all")
  const [waybillQuery, setWaybillQuery] = useState("")
  const [waybillPickupStatuses, setWaybillPickupStatuses] = useState<PickupWaybillStatus[]>([])
  const [todayTaskFilter, setTodayTaskFilter] = useState("all")
  const [submittedWaybillDriverFilter, setSubmittedWaybillDriverFilter] = useState("all")
  const [submittedWaybillQuery, setSubmittedWaybillQuery] = useState("")
  const [submittedWaybillPickupStatuses, setSubmittedWaybillPickupStatuses] = useState<PickupWaybillStatus[]>([])
  const [submittedTodayTaskFilter, setSubmittedTodayTaskFilter] = useState("all")
  const [driverPage, setDriverPage] = useState(1)
  const [driverPageSize, setDriverPageSize] = useState(10)
  const [waybillPage, setWaybillPage] = useState(1)
  const [waybillPageSize, setWaybillPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<PickupSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [waybillSortKey, setWaybillSortKey] = useState<PickupWaybillSortKey | null>(null)
  const [waybillSortDirection, setWaybillSortDirection] = useState<SortDirection>("asc")
  const [selectedWaybill, setSelectedWaybill] = useState<PickupWaybillRow | null>(null)
  const [contactDriver, setContactDriver] = useState<PickupDriverRow | null>(null)

  const filteredDriverRows = useMemo(() => {
    const rows = pickupDriverRows.filter((row) => {
      const matchesDriver = submittedDriverFilter === "all" || row.driverId === submittedDriverFilter
      const matchesSignIn =
        submittedSignInFilter === "all" ||
        (submittedSignInFilter === "signed-in" ? Boolean(row.signedInAt) : !row.signedInAt)
      const matchesSignOut =
        submittedSignOutFilter === "all" ||
        (submittedSignOutFilter === "signed-out" ? Boolean(row.signedOutAt) : !row.signedOutAt)
      return matchesDriver && matchesSignIn && matchesSignOut
    })

    if (!sortKey) return rows
    return [...rows].sort((left, right) => {
      const leftValue = sortKey === "totalPickup" ? getTotalPickup(left) : left[sortKey]
      const rightValue = sortKey === "totalPickup" ? getTotalPickup(right) : right[sortKey]
      return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue
    })
  }, [sortDirection, sortKey, submittedDriverFilter, submittedSignInFilter, submittedSignOutFilter])

  const filteredWaybillRows = useMemo(() => {
    const rows = pickupWaybillRows.filter((row) => {
      const matchesDriver = submittedWaybillDriverFilter === "all" || row.driverId === submittedWaybillDriverFilter
      const matchesWaybill = !submittedWaybillQuery || row.trackingNumber === submittedWaybillQuery
      const matchesPickupStatus =
        submittedWaybillPickupStatuses.length === 0 ||
        submittedWaybillPickupStatuses.includes(row.pickupStatus)
      const matchesTodayTask =
        submittedTodayTaskFilter === "all" ||
        (submittedTodayTaskFilter === "yes" ? row.isTodayDeliveryTask : !row.isTodayDeliveryTask)
      return matchesDriver && matchesWaybill && matchesPickupStatus && matchesTodayTask
    })

    if (!waybillSortKey) return rows
    return [...rows].sort((left, right) => {
      const leftValue = left[waybillSortKey]
      const rightValue = right[waybillSortKey]
      if (leftValue === rightValue) return 0
      if (!leftValue) return 1
      if (!rightValue) return -1
      const comparison = Date.parse(leftValue) - Date.parse(rightValue)
      return waybillSortDirection === "asc" ? comparison : -comparison
    })
  }, [
    submittedTodayTaskFilter,
    submittedWaybillDriverFilter,
    submittedWaybillPickupStatuses,
    submittedWaybillQuery,
    waybillSortDirection,
    waybillSortKey,
  ])

  const driverPageCount = Math.max(1, Math.ceil(filteredDriverRows.length / driverPageSize))
  const currentDriverPage = Math.min(driverPage, driverPageCount)
  const visibleDriverRows = filteredDriverRows.slice(
    (currentDriverPage - 1) * driverPageSize,
    currentDriverPage * driverPageSize
  )
  const waybillPageCount = Math.max(1, Math.ceil(filteredWaybillRows.length / waybillPageSize))
  const currentWaybillPage = Math.min(waybillPage, waybillPageCount)
  const visibleWaybillRows = filteredWaybillRows.slice(
    (currentWaybillPage - 1) * waybillPageSize,
    currentWaybillPage * waybillPageSize
  )

  const queryDrivers = () => {
    setSubmittedDriverFilter(driverFilter)
    setSubmittedSignInFilter(signInFilter)
    setSubmittedSignOutFilter(signOutFilter)
    setDriverPage(1)
    setWaybillPage(1)
    toast.success("查询条件已应用")
  }

  const resetDriverFilters = () => {
    setDriverFilter("all")
    setSignInFilter("all")
    setSignOutFilter("all")
    setSubmittedDriverFilter("all")
    setSubmittedSignInFilter("all")
    setSubmittedSignOutFilter("all")
    setDriverPage(1)
    setWaybillPage(1)
    toast.success("筛选条件已重置")
  }

  const queryWaybills = () => {
    const nextQuery = waybillQuery.trim()
    setWaybillQuery(nextQuery)
    setSubmittedWaybillDriverFilter(waybillDriverFilter)
    setSubmittedWaybillQuery(nextQuery)
    setSubmittedWaybillPickupStatuses([...waybillPickupStatuses])
    setSubmittedTodayTaskFilter(todayTaskFilter)
    setWaybillPage(1)
    toast.success("查询条件已应用")
  }

  const resetWaybillFilters = () => {
    setWaybillDriverFilter("all")
    setWaybillQuery("")
    setWaybillPickupStatuses([])
    setTodayTaskFilter("all")
    setSubmittedWaybillDriverFilter("all")
    setSubmittedWaybillQuery("")
    setSubmittedWaybillPickupStatuses([])
    setSubmittedTodayTaskFilter("all")
    setWaybillPage(1)
    toast.success("筛选条件已重置")
  }

  const handleSort = (nextSortKey: PickupSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc")
    } else {
      setSortKey(nextSortKey)
      setSortDirection("asc")
    }
    setDriverPage(1)
  }

  const handleWaybillSort = (nextSortKey: PickupWaybillSortKey) => {
    if (waybillSortKey === nextSortKey) {
      setWaybillSortDirection((current) => current === "asc" ? "desc" : "asc")
    } else {
      setWaybillSortKey(nextSortKey)
      setWaybillSortDirection("asc")
    }
    setWaybillPage(1)
  }

  const drillIntoDriverWaybills = (
    row: PickupDriverRow,
    pickupStatuses: PickupWaybillStatus[] = [],
    nextTodayTaskFilter: "all" | "yes" | "no" = "all",
  ) => {
    if (row.driverId === "unassigned") return

    setWaybillDriverFilter(row.driverId)
    setSubmittedWaybillDriverFilter(row.driverId)
    setWaybillQuery("")
    setSubmittedWaybillQuery("")
    setWaybillPickupStatuses(pickupStatuses)
    setSubmittedWaybillPickupStatuses(pickupStatuses)
    setTodayTaskFilter(nextTodayTaskFilter)
    setSubmittedTodayTaskFilter(nextTodayTaskFilter)
    setWaybillPage(1)
    setView("waybill")
  }

  const driverFilters = (
    <div className="flex flex-col gap-4">
      <FieldGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="pickup-driver-filter" className="text-xs font-normal">司机</FieldLabel>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger id="pickup-driver-filter" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">全部</SelectItem>
                {pickupDriverRows.map((row) => (
                  <SelectItem key={row.driverId} value={row.driverId}>{row.driver}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="pickup-sign-in-filter" className="text-xs font-normal">签到状态</FieldLabel>
          <Select value={signInFilter} onValueChange={setSignInFilter}>
            <SelectTrigger id="pickup-sign-in-filter" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="signed-in">已签到</SelectItem>
                <SelectItem value="not-signed-in">未签到</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="pickup-sign-out-filter" className="text-xs font-normal">签退状态</FieldLabel>
          <Select value={signOutFilter} onValueChange={setSignOutFilter}>
            <SelectTrigger id="pickup-sign-out-filter" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="signed-out">已签退</SelectItem>
                <SelectItem value="not-signed-out">未签退</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={queryDrivers}>
          <SearchIcon data-icon="inline-start" />
          查询
        </Button>
        <Button type="button" variant="outline" onClick={resetDriverFilters}>重置</Button>
      </div>
    </div>
  )

  const waybillFilters = (
    <div className="flex flex-col gap-4">
      <FieldGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="pickup-waybill-driver-filter" className="text-xs font-normal">司机</FieldLabel>
          <Select value={waybillDriverFilter} onValueChange={setWaybillDriverFilter}>
            <SelectTrigger id="pickup-waybill-driver-filter" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">全部</SelectItem>
                {pickupDriverRows.map((row) => (
                  <SelectItem key={row.driverId} value={row.driverId}>{row.driver}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="pickup-waybill-query" className="text-xs font-normal">运单编号</FieldLabel>
          <Input
            id="pickup-waybill-query"
            value={waybillQuery}
            onChange={(event) => setWaybillQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") queryWaybills()
            }}
            placeholder="请输入完整运单编号"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pickup-waybill-status-filter" className="text-xs font-normal">领件状态</FieldLabel>
          <PickupStatusMultiSelect value={waybillPickupStatuses} onValueChange={setWaybillPickupStatuses} />
        </Field>
        <Field>
          <FieldLabel htmlFor="pickup-today-task-filter" className="text-xs font-normal">是否今日派件任务</FieldLabel>
          <Select value={todayTaskFilter} onValueChange={setTodayTaskFilter}>
            <SelectTrigger id="pickup-today-task-filter" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="yes">是</SelectItem>
                <SelectItem value="no">否</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => exportPickupWaybills(filteredWaybillRows)}>
          <DownloadIcon data-icon="inline-start" />
          导出
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={queryWaybills}>
            <SearchIcon data-icon="inline-start" />
            查询
          </Button>
          <Button type="button" variant="outline" onClick={resetWaybillFilters}>重置</Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <section
        className="animate-in fade-in slide-in-from-right-4 flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5 duration-200"
        aria-label="领件详情下钻"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              返回
            </Button>
            <div className="min-w-0">
              <h2 className="font-heading text-xl font-semibold text-foreground">领件详情</h2>
            </div>
          </div>
        </div>

          <Tabs value={view} onValueChange={setView} className="min-w-0 gap-3">
            <TabsList variant="line" className="shrink-0">
              <TabsTrigger value="driver">司机视图</TabsTrigger>
              <TabsTrigger value="waybill">运单视图</TabsTrigger>
            </TabsList>

            <TabsContent value="driver" className="flex min-h-0 flex-1 flex-col gap-4">
              {driverFilters}
              <Table
                variant="grid"
                className="min-w-[76rem] table-fixed"
              >
                <colgroup>
                  <col className="w-28" />
                  <col className="w-40" />
                  <col className="w-40" />
                  <col className="w-24" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-32" />
                  <col className="w-32" />
                  <col className="w-24" />
                  <col className="w-24" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>司机</TableHead>
                    <TableHead>签到时间</TableHead>
                    <TableHead>签退时间</TableHead>
                    <SortableHead label="应领件" sortKey="expected" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="未分拣未领件" sortKey="unsortedUncollected" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="已分拣未领件" sortKey="sortedUncollected" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="当期任务领件" sortKey="currentPickup" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="非当期任务领件" sortKey="nonCurrentPickup" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="领件总量" sortKey="totalPickup" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDriverRows.map((row) => (
                    <TableRow key={row.driver}>
                      <TableCell>{row.driver}</TableCell>
                      <TableCell className="tabular-nums">{formatDateTime(row.signedInAt, row.driver === "未分配" ? "/" : "未签到")}</TableCell>
                      <TableCell className="tabular-nums">{formatDateTime(row.signedOutAt, row.driver === "未分配" ? "/" : "未签退")}</TableCell>
                      <TableCell className="text-end font-medium tabular-nums">
                        {row.driverId === "unassigned" ? (
                          row.expected
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            className="ms-auto px-0 tabular-nums"
                            aria-label={`查看 ${row.driver} 的应领件运单，共 ${row.expected} 件`}
                            onClick={() => drillIntoDriverWaybills(row)}
                          >
                            {row.expected}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums">
                        {row.driverId === "unassigned" ? (
                          row.unsortedUncollected
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            className="ms-auto px-0 tabular-nums"
                            aria-label={`查看 ${row.driver} 的未分拣未领件运单，共 ${row.unsortedUncollected} 件`}
                            onClick={() => drillIntoDriverWaybills(row, ["未分拣未领件"])}
                          >
                            {row.unsortedUncollected}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums">
                        {row.driverId === "unassigned" ? (
                          row.sortedUncollected
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            className="ms-auto px-0 tabular-nums"
                            aria-label={`查看 ${row.driver} 的已分拣未领件运单，共 ${row.sortedUncollected} 件`}
                            onClick={() => drillIntoDriverWaybills(row, ["已分拣未领件"])}
                          >
                            {row.sortedUncollected}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums">
                        {row.driverId === "unassigned" ? (
                          row.currentPickup
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            className="ms-auto px-0 tabular-nums"
                            aria-label={`查看 ${row.driver} 的当期任务领件运单，共 ${row.currentPickup} 件`}
                            onClick={() => drillIntoDriverWaybills(row, ["已领件"], "yes")}
                          >
                            {row.currentPickup}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums">
                        {row.driverId === "unassigned" ? (
                          row.nonCurrentPickup
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            className="ms-auto px-0 tabular-nums"
                            aria-label={`查看 ${row.driver} 的非当期任务领件运单，共 ${row.nonCurrentPickup} 件`}
                            onClick={() => drillIntoDriverWaybills(row, ["已领件"], "no")}
                          >
                            {row.nonCurrentPickup}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums">
                        {row.driverId === "unassigned" ? (
                          getTotalPickup(row)
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            className="ms-auto px-0 tabular-nums"
                            aria-label={`查看 ${row.driver} 的领件总量运单，共 ${getTotalPickup(row)} 件`}
                            onClick={() => drillIntoDriverWaybills(row, ["已领件"])}
                          >
                            {getTotalPickup(row)}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.phone ? (
                          <Button variant="link" size="xs" className="px-0" onClick={() => setContactDriver(row)}>
                            联系司机
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleDriverRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-28 text-center text-muted-foreground">
                        暂无符合条件的司机
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <DataPagination
                className="border-t-0"
                page={currentDriverPage}
                pageSize={driverPageSize}
                total={filteredDriverRows.length}
                onPageChange={setDriverPage}
                onPageSizeChange={setDriverPageSize}
                showJumper={false}
              />
            </TabsContent>

            <TabsContent value="waybill" className="flex min-h-0 flex-1 flex-col gap-4">
              {waybillFilters}
              <Table
                variant="grid"
                className="min-w-[128rem] table-fixed"
              >
                <colgroup>
                  <col className="w-44" />
                  <col className="w-24" />
                  <col className="w-40" />
                  <col className="w-40" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-28" />
                  <col className="w-32" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-40" />
                  <col className="w-28" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>运单编号</TableHead>
                    <TableHead>运单状态</TableHead>
                    <SortableHead label="任务推送时间" sortKey="pushedAt" activeSortKey={waybillSortKey} direction={waybillSortDirection} onSort={handleWaybillSort} align="start" />
                    <SortableHead label="领件时间" sortKey="pickupAt" activeSortKey={waybillSortKey} direction={waybillSortDirection} onSort={handleWaybillSort} align="start" />
                    <TableHead>分配快递员</TableHead>
                    <TableHead>取件快递员</TableHead>
                    <TableHead>路区</TableHead>
                    <TableHead>邮编</TableHead>
                    <TableHead>快递员路线</TableHead>
                    <TableHead>领件状态</TableHead>
                    <TableHead>今日派件任务</TableHead>
                    <TableHead>最新操作</TableHead>
                    <TableHead>操作时间</TableHead>
                    <TableHead>操作人</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleWaybillRows.map((row) => (
                    <TableRow key={row.trackingNumber}>
                      <TableCell>
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          className="px-0"
                          onClick={() => setSelectedWaybill(row)}
                        >
                          {row.trackingNumber}
                        </Button>
                      </TableCell>
                      <TableCell>{row.waybillStatus}</TableCell>
                      <TableCell className="tabular-nums">{formatDateTime(row.pushedAt, "—")}</TableCell>
                      <TableCell className="tabular-nums">{formatDateTime(row.pickupAt, "—")}</TableCell>
                      <TableCell>{row.assignedCourier ?? "—"}</TableCell>
                      <TableCell>{row.pickupCourier ?? "—"}</TableCell>
                      <TableCell>{row.route}</TableCell>
                      <TableCell>{row.postalCode}</TableCell>
                      <TableCell>{row.courierRoute ?? "—"}</TableCell>
                      <TableCell>{row.pickupStatus}</TableCell>
                      <TableCell>{row.isTodayDeliveryTask ? "是" : "否"}</TableCell>
                      <TableCell>{row.latestAction}</TableCell>
                      <TableCell className="tabular-nums">{formatDateTime(row.actionAt, "—")}</TableCell>
                      <TableCell>{row.operator}</TableCell>
                    </TableRow>
                  ))}
                  {visibleWaybillRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="h-28 text-center text-muted-foreground">
                        暂无符合条件的运单
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <DataPagination
                className="border-t-0"
                page={currentWaybillPage}
                pageSize={waybillPageSize}
                total={filteredWaybillRows.length}
                onPageChange={setWaybillPage}
                onPageSizeChange={setWaybillPageSize}
                showJumper={false}
              />
            </TabsContent>
          </Tabs>
      </section>

      <ContactDriverDialog
        driver={contactDriver}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setContactDriver(null)
        }}
      />
      <WaybillDetailSheet
        row={selectedWaybill}
        onOpenChange={(open) => {
          if (!open) setSelectedWaybill(null)
        }}
      />
    </>
  )
}
