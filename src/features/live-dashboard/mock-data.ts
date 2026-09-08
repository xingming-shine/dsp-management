export type WorkMode = "same-day" | "next-day"
export type MonitorView = "delivery" | "current-pickup" | "next-pickup"

export const realtimeOverview = {
  allocation: {
    expected: 1937,
    tasks: 31,
    assigned: 957,
    unassigned: 980,
    completionRate: 49.41,
  },
  handoff: {
    actualPickup: 1657,
    currentPickup: 1637,
    nonCurrentPickup: 20,
    uncollected: 300,
    unsortedUncollected: 102,
    sortedUncollected: 198,
    failedDeliveryReturn: 30,
    failedDeliveryReturned: 25,
    failedDeliveryPending: 5,
    noScanReturn: 20,
    noScanReturned: 15,
    noScanPending: 5,
    returned: 25,
    pendingReturn: 10,
  },
  delivery: {
    total: 1781,
    clearanceRate: 82.65,
    pending: 301,
    pendingRate: 17.35,
    delivered: 1378,
    deliveredRate: 76.92,
    exception: 102,
    exceptionRate: 5.73,
    currentSource: 1657,
    historySource: 124,
    normalIssues: 78,
    fakeIssues: 24,
  },
  nextAllocation: {
    generated: false,
    status: "暂未生成",
    pushAtByMode: {
      "same-day": "2026-08-21T13:00:00-04:00",
      "next-day": "2026-08-22T08:00:00-04:00",
    },
  },
} as const

export interface LifecycleStage {
  id: string
  step: string
  title: string
  description: string
  total: string
  totalLabel: string
  progress: number
  progressLabel: string
  stats: Array<{ label: string; value: string; urgent?: boolean }>
}

export interface DriverSnapshot {
  id: string
  name: string
  rating: number
  route: string
  phone: string
  status: string
  statusLevel: "normal" | "warning" | "danger"
  delivered: number
  pending: number
  exception: number
  total: number
  efficiency: string
  activeHours: string
  podIssues: number
  locationIssues: number
  fakeIssues: number
  position: { left: string; top: string }
  updatedAt: string
  coordinates: string
}

export interface WaybillRow {
  trackingNumber: string
  status: string
  driver: string
  route: string
  overdue: string
  issue: string
  updatedAt: string
}

export const headlineMetrics = [
  { label: "待派件", value: "216", note: "其中超期 47 件", urgent: true },
  { label: "已签收", value: "1,184", note: "妥投率 80.43%" },
  { label: "派送异常", value: "72", note: "虚假问题件 9 件", urgent: true },
  { label: "日清率", value: "84.10%", note: "距离 95% 还差 161 件" },
]

const currentAllocation: LifecycleStage = {
  id: "current-allocation",
  step: "01",
  title: "当期领件任务分配",
  description: "站点今日推送的车队任务",
  total: "1937",
  totalLabel: "应领件",
  progress: 49.41,
  progressLabel: "任务分配进度",
  stats: [
    { label: "包含任务", value: "31" },
    { label: "未分配", value: "980", urgent: true },
    { label: "已分配", value: "957" },
  ],
}

const stationHandoff: LifecycleStage = {
  id: "station-handoff",
  step: "02",
  title: "站点交取件",
  description: "领件出库与退件入库进度",
  total: "1,209",
  totalLabel: "已领件",
  progress: 94,
  progressLabel: "领件完成率",
  stats: [
    { label: "未分拣", value: "46", urgent: true },
    { label: "已分拣未领", value: "31", urgent: true },
    { label: "待退回", value: "18", urgent: true },
  ],
}

const deliveryOperation: LifecycleStage = {
  id: "delivery-operation",
  step: "03",
  title: "派件作业",
  description: "司机离站后的实时派件进度",
  total: "1,472",
  totalLabel: "应派件",
  progress: 84.1,
  progressLabel: "日清率",
  stats: [
    { label: "待派件", value: "216", urgent: true },
    { label: "已签收", value: "1,184" },
    { label: "派送异常", value: "72", urgent: true },
  ],
}

const nextAllocation: LifecycleStage = {
  id: "next-allocation",
  step: "04",
  title: "下期领件任务分配",
  description: "提前规划下一派件周期运力",
  total: "612",
  totalLabel: "应派件（次日）",
  progress: 64.4,
  progressLabel: "任务分配进度",
  stats: [
    { label: "预计任务", value: "9" },
    { label: "未分配", value: "218", urgent: true },
    { label: "已分配", value: "394" },
  ],
}

export const lifecycleByMode: Record<WorkMode, LifecycleStage[]> = {
  "same-day": [
    currentAllocation,
    stationHandoff,
    deliveryOperation,
    nextAllocation,
  ],
  "next-day": [
    { ...stationHandoff, step: "01", title: "站点领件（当期任务）" },
    { ...deliveryOperation, step: "02" },
    { ...nextAllocation, step: "03" },
    { ...stationHandoff, id: "next-handoff", step: "04", title: "站点交取件（下期任务）" },
  ],
}

export const exceptionReasons = [
  { reason: "收件人拒收", normal: 12, fake: 2 },
  { reason: "无法投递", normal: 10, fake: 3 },
  { reason: "地址错误/不详", normal: 9, fake: 1 },
  { reason: "无法进入", normal: 8, fake: 2 },
  { reason: "商业地址关门", normal: 6, fake: 1 },
]

export const alertGroups = [
  { label: "待我处理", value: 23, note: "最短剩余 18 分钟", level: "danger" as const },
  { label: "处理中", value: 11, note: "其中疑似丢失 4 件", level: "warning" as const },
  { label: "POD 不合规", value: 16, note: "涉及 8 名司机", level: "danger" as const },
  { label: "妥投位置异常", value: 7, note: "偏离超过 300m", level: "danger" as const },
]

export const drivers: DriverSnapshot[] = [
  {
    id: "DRV-1048",
    name: "Alex Chen",
    rating: 4,
    route: "A-12",
    phone: "+1 917 555 0128",
    status: "2h 未派送",
    statusLevel: "danger",
    delivered: 72,
    pending: 18,
    exception: 4,
    total: 94,
    efficiency: "18.4 PPH",
    activeHours: "5h 06m",
    podIssues: 2,
    locationIssues: 1,
    fakeIssues: 1,
    position: { left: "22%", top: "32%" },
    updatedAt: "2026-08-21T16:42:18-04:00",
    coordinates: "40.71242, -74.00618",
  },
  {
    id: "DRV-2093",
    name: "Maria Garcia",
    rating: 5,
    route: "B-07",
    phone: "+1 718 555 0196",
    status: "派送正常",
    statusLevel: "normal",
    delivered: 91,
    pending: 7,
    exception: 2,
    total: 100,
    efficiency: "22.1 PPH",
    activeHours: "4h 31m",
    podIssues: 0,
    locationIssues: 0,
    fakeIssues: 0,
    position: { left: "61%", top: "48%" },
    updatedAt: "2026-08-21T16:43:02-04:00",
    coordinates: "40.71886, -73.99932",
  },
  {
    id: "DRV-3517",
    name: "James Wilson",
    rating: 4,
    route: "C-03",
    phone: "+1 347 555 0164",
    status: "30min 未派送",
    statusLevel: "warning",
    delivered: 63,
    pending: 25,
    exception: 6,
    total: 94,
    efficiency: "15.9 PPH",
    activeHours: "5h 54m",
    podIssues: 3,
    locationIssues: 2,
    fakeIssues: 1,
    position: { left: "44%", top: "68%" },
    updatedAt: "2026-08-21T16:39:44-04:00",
    coordinates: "40.70621, -74.01288",
  },
]

export const waybillRows: WaybillRow[] = [
  { trackingNumber: "GFUS01031967891968", status: "待派件", driver: "Alex Chen", route: "A-12", overdue: "超 2 天", issue: "—", updatedAt: "2026-08-21T16:36:12-04:00" },
  { trackingNumber: "GFUS01031967892105", status: "派送异常", driver: "James Wilson", route: "C-03", overdue: "超 1 天", issue: "无法进入", updatedAt: "2026-08-21T16:31:45-04:00" },
  { trackingNumber: "GFUS01031967892774", status: "已签收", driver: "Maria Garcia", route: "B-07", overdue: "未超期", issue: "POD 不合规", updatedAt: "2026-08-21T16:28:09-04:00" },
  { trackingNumber: "GFUS01031967893316", status: "待派件", driver: "James Wilson", route: "C-03", overdue: "超 3 天", issue: "疑似丢失", updatedAt: "2026-08-21T16:21:33-04:00" },
  { trackingNumber: "GFUS01031967894182", status: "派送异常", driver: "Alex Chen", route: "A-12", overdue: "未超期", issue: "虚假问题件", updatedAt: "2026-08-21T16:17:54-04:00" },
]

export const assessmentMetrics = [
  { label: "领件率", value: 98.84, target: 98, pendingLabel: "当日未领件", pending: 15, status: "success" as const, message: "顺利达成目标。" },
  { label: "2400 妥投率", value: 94.72, target: 96, pendingLabel: "当日待派件", pending: 78, status: "danger" as const, message: "距离达标还差 19 个包裹。" },
  { label: "4800 妥投率", value: 98.31, target: 98.5, pendingLabel: "昨日待派件", pending: 12, status: "danger" as const, message: "距离达标还差 3 个包裹。" },
  { label: "7200 完结率", value: 99.06, target: 98.5, pendingLabel: "前日待退回", pending: 4, status: "success" as const, message: "顺利达成目标。" },
]
