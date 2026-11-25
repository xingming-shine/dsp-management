import { monitorDrivers, monitorWaybills, type MonitorWaybill } from "./driver-monitor-data"

// Shared demo dictionaries; replace with the problem-task service dictionaries together.
export const problemInstructions = ["重派", "退回站点", "重拍", "核实地址", "联系收件人", "查找包裹"] as const
export const problemTypes = ["商业地址关门", "地址错误/不详", "无法投递", "收件人拒收", "无法进入", "疑似丢失", "疑似虚假签收"] as const
export type ProblemTask = {
  id: string
  waybill: MonitorWaybill
  reportedAt: string
  trackingUpdatedAt: string
  type: typeof problemTypes[number]
  status: "待处理" | "处理中" | "已完结"
  endedAt: string | null
  result: string | null
  fake: boolean
  instruction: typeof problemInstructions[number]
  deadline: string
  responsibleOrg: string
  currentOrg: string
  driver: string
  route: string
  latestAction: string
  actionAt: string
  operator: string
}
export const problemSnapshotAt = "2026-08-21T20:00:00-04:00"
const snapshot = Date.parse(problemSnapshotAt)
const candidates = monitorDrivers.flatMap((driver) => monitorWaybills.filter((row) => row.driverId === driver.id && row.status === "exception").slice(0, 4))
function createProblemTask(waybill: MonitorWaybill, index: number, status: ProblemTask["status"]): ProblemTask {
  const driver = monitorDrivers.find((item) => item.id === waybill.driverId)!
  const type = index < 3 ? "疑似丢失" : problemTypes[index % 5]
  const reportedAt = new Date(snapshot - (120 + index * 3) * 60_000).toISOString()
  return {
    id: `problem-${waybill.id}`,
    waybill,
    reportedAt,
    trackingUpdatedAt: new Date(snapshot - (index < 3 ? [12, 36, 60][index] : 6 + index) * 3_600_000).toISOString(),
    type,
    status,
    endedAt: null,
    result: null,
    fake: waybill.alerts.includes("fake"),
    instruction: type === "疑似丢失" ? "查找包裹" : problemInstructions[index % problemInstructions.length],
    deadline: new Date(snapshot + (index === 0 ? -12 : 18 + index * 17) * 60_000).toISOString(),
    responsibleOrg: "LAV-FUS",
    currentOrg: "LAV-FUS",
    driver: driver.name,
    route: waybill.route ?? "—",
    latestAction: status === "处理中" ? "已接收处理指令" : index % 2 ? "下发处理指令" : "转交 DSP 处理",
    actionAt: new Date(Date.parse(reportedAt) + 5 * 60_000).toISOString(),
    operator: status === "处理中" ? driver.name : index % 2 ? "站点客服" : "系统",
  }
}
export const pendingProblemTasks = candidates.slice(0, 23).map((waybill, index) => createProblemTask(waybill, index, "待处理"))
export const suspectedLostProblemTasks = pendingProblemTasks.filter((task) => task.type === "疑似丢失")
export const trackingGapOptions = ["1天内（0-24h）", "1-2天（24-48h）", "2天以上（48h以上）"] as const
export type TrackingGapRange = typeof trackingGapOptions[number]
export function matchesTrackingGap(updatedAt: string, ranges: TrackingGapRange[], now: number) {
  if (!ranges.length) return true
  const hours = Math.max(0, (now - Date.parse(updatedAt)) / 3_600_000)
  // Half-open intervals ensure that 24h and 48h each belong to exactly one range.
  const range = hours < 24 ? trackingGapOptions[0] : hours < 48 ? trackingGapOptions[1] : trackingGapOptions[2]
  return Number.isFinite(hours) && ranges.includes(range)
}
const pendingWaybillIds = new Set(pendingProblemTasks.map((task) => task.waybill.id))
export const inProgressProblemTasks = monitorWaybills
  .filter((waybill) => waybill.status === "exception" && !pendingWaybillIds.has(waybill.id))
  .slice(0, 7)
  .map((waybill, index) => createProblemTask(waybill, index + pendingProblemTasks.length, "处理中"))
export const fakeDeliveryProblemTasks: ProblemTask[] = monitorDrivers
  .flatMap((driver) => monitorWaybills.filter((waybill) => waybill.driverId === driver.id && waybill.status === "delivered").slice(0, 1))
  .slice(0, 7)
  .map((waybill, index) => {
    const endedAt = new Date(snapshot - (30 + index * 10) * 60_000).toISOString()
    return {
      ...createProblemTask(waybill, index, "已完结"),
      type: "疑似虚假签收",
      endedAt,
      result: "确认虚假签收",
      latestAction: "确认虚假签收并完结",
      actionAt: endedAt,
      operator: "站点客服",
    }
  })
const activeProblemWaybillIds = new Set([...pendingProblemTasks, ...inProgressProblemTasks].map((task) => task.waybill.id))
export const trackingProblemTasks: ProblemTask[] = monitorDrivers
  .flatMap((driver) => monitorWaybills.filter((waybill) => waybill.driverId === driver.id && waybill.status === "exception" && !activeProblemWaybillIds.has(waybill.id)).slice(0, 2))
  .slice(0, 7)
  .map((waybill, index) => {
    const endedAt = new Date(snapshot - (20 + index * 10) * 60_000).toISOString()
    return {
      ...createProblemTask(waybill, index, "已完结"),
      type: "疑似丢失",
      endedAt,
      result: "轨迹断更",
      latestAction: "确认轨迹断更并完结",
      actionAt: endedAt,
      operator: "站点客服",
    }
  })
export type ProblemFilters = { driver: string; number: string; instruction: string; type: string; fake: string }
export const emptyProblemFilters: ProblemFilters = { driver: "all", number: "", instruction: "all", type: "all", fake: "all" }
export function filterProblemTasks(rows: ProblemTask[], filters: ProblemFilters) {
  return rows.filter((row) => (filters.driver === "all" || row.waybill.driverId === filters.driver)
    && (!filters.number.trim() || row.waybill.id === filters.number.trim())
    && (filters.instruction === "all" || row.instruction === filters.instruction)
    && (filters.type === "all" || row.type === filters.type)
    && (filters.fake === "all" || row.fake === (filters.fake === "yes")))
}
export function remainingProblemTime(deadline: string, now: number) {
  const hours = Math.ceil((Date.parse(deadline) - now) / 3_600_000)
  if (hours <= 0) return "已超时"
  return hours < 24 ? `${hours}h` : `${hours}h (${Math.floor(hours / 24)}d${hours % 24}h)`
}
