import { driverRows } from "@/features/live-dashboard/driver-rows"
import type { DashboardDriverSnapshot } from "@/features/live-dashboard/driver-rows"
import type { DriverSnapshot } from "@/features/live-dashboard/mock-data"

export type DeliveryStatus = "pending" | "delivered" | "exception"
export type WaybillAlert = "pod" | "location" | "fake"
export type Coordinate = [longitude: number, latitude: number]
export type MonitorDriver = DashboardDriverSnapshot & { expectedPickup: number; expectedReturn: number }
export type MonitorWaybill = {
  id: string
  driverId: string
  sequence: number
  stop: string
  deliveryNumber: string
  type: string
  postalCode: string
  maskedAddress: string
  status: DeliveryStatus
  alerts: WaybillAlert[]
  overdueDays: number
  latestAction: string
  actionAt: string
  signedAt: string | null
  transferred: boolean
  attempts: number
  returned: boolean
  issueType: string | null
  deviation: number | null
  destination: Coordinate | null
  collectedPosition: Coordinate | null
  podImages: { url: string; label: string }[]
}

export const statusLabels: Record<DeliveryStatus, string> = { pending: "待派件", delivered: "已签收", exception: "派送异常" }
export const alertLabels: Record<WaybillAlert, string> = { pod: "POD 不合规", location: "妥投位置异常", fake: "虚假问题件" }
export function parseWaybillAlert(value: string | null): WaybillAlert | null {
  return value === "pod" || value === "location" || value === "fake" ? value : null
}
export const monitorDrivers: MonitorDriver[] = driverRows.map((driver) => ({ ...driver, expectedPickup: driver.total, expectedReturn: driver.exception }))
  .filter((driver) => driver.expectedPickup > 0 || driver.total > 0 || driver.expectedReturn > 0)

export function validCoordinate(value: Coordinate | null): value is Coordinate {
  return Boolean(value && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90 && (value[0] !== 0 || value[1] !== 0))
}

export function driverCoordinate(driver: DriverSnapshot): Coordinate | null {
  const [latitude, longitude] = driver.coordinates.split(",").map(Number)
  const point: Coordinate = [longitude, latitude]
  return validCoordinate(point) ? point : null
}

export function waybillCoordinate(row: MonitorWaybill): Coordinate | null {
  if (row.status !== "pending" && validCoordinate(row.collectedPosition)) return row.collectedPosition
  return validCoordinate(row.destination) ? row.destination : null
}

// Demo-only, seeded best-candidate sampling: no rows/columns and no movement on
// re-render. Spacing is measured in local ground distance, not screen pixels;
// the map always anchors each pin at its actual fixture coordinate.
function mockDeliveryCoordinates(origin: Coordinate, count: number, seed: number): Coordinate[] {
  let state = seed
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const points: [number, number][] = []
  for (let index = 0; index < count; index++) {
    let best: [number, number] = [0, 0]
    let bestDistance = -1
    for (let candidate = 0; candidate < 32; candidate++) {
      const angle = random() * Math.PI * 2
      const radius = Math.sqrt(random())
      const point: [number, number] = [Math.cos(angle) * radius, Math.sin(angle) * radius]
      const distance = points.reduce((nearest, existing) => Math.min(nearest, (point[0] - existing[0]) ** 2 + (point[1] - existing[1]) ** 2), Infinity)
      if (distance > bestDistance) {
        best = point
        bestDistance = distance
      }
    }
    points.push(best)
  }
  return points.map(([x, y]) => [origin[0] + x * 0.012, origin[1] + y * 0.009])
}

// Deterministic demo fixtures. Counts reconcile exactly to the shared driver snapshots.
// Plain-text addresses are intentionally resolved by the server-side demo adapter only.
export const monitorWaybills: MonitorWaybill[] = monitorDrivers.flatMap((driver, driverIndex) => {
  const origin = driverCoordinate(driver) ?? [-74.004, 40.72]
  const destinations = mockDeliveryCoordinates(origin, driver.total, driverIndex + 1)
  // Alice's first stops demonstrate combined/single alerts, fake issues and overdue transfers.
  // Keep IDs, status totals and the sequence unique; swap two stops to surface an exception early.
  const isLabelDemo = driver.id === "DRV-ALICE-01"
  return Array.from({ length: driver.total }, (_, index): MonitorWaybill => {
    const status: DeliveryStatus = index < driver.delivered ? "delivered" : index < driver.delivered + driver.exception ? "exception" : "pending"
    const exceptionIndex = index - driver.delivered
    const alerts: WaybillAlert[] = []
    if (status === "delivered" && (isLabelDemo ? [0, 113].includes(index) : index < driver.podIssues)) alerts.push("pod")
    const hasLocationAlert = status === "delivered" && (isLabelDemo ? [0, 36].includes(index) : index >= driver.podIssues && index < driver.podIssues + driver.locationIssues)
    const deviation = hasLocationAlert ? 820 + ((index + driverIndex) % 10) * 40 : null
    if (deviation !== null && deviation > 800) alerts.push("location")
    if (status === "exception" && exceptionIndex < driver.fakeIssues) alerts.push("fake")
    const sequenceIndex = isLabelDemo && index === 149 ? 150 : isLabelDemo && index === 150 ? 149 : index
    const sequence = ((sequenceIndex * 37) % driver.total) + 1
    const destination = destinations[sequence - 1]
    const actionAt = new Date(Date.parse("2026-08-21T12:00:00-04:00") + sequence * 90_000).toISOString()
    return {
      id: `GFUS${String(driverIndex + 1).padStart(3, "0")}${String(index + 1).padStart(9, "0")}`,
      driverId: driver.id, sequence, stop: `STOP-${5700 + sequence}`, deliveryNumber: `B${sequence}`,
      type: ["普通件", "PUDO", "货代", "Locker"][index % 4], postalCode: String(10001 + (sequence % 9)),
      maskedAddress: "*** ******** Ave, New York", status, alerts,
      overdueDays: status === "pending" ? isLabelDemo && index === 180 ? 3 : index % 6 : 0,
      latestAction: status === "delivered" ? "签收" : status === "exception" ? "派送异常采集" : index % 3 === 0 ? "今日转派" : "快递员收件",
      actionAt, signedAt: status === "delivered" ? actionAt : null,
      transferred: status === "pending" && index % 3 === 0, attempts: status === "pending" ? index % 3 : 1,
      returned: status === "exception" && exceptionIndex % 2 === 0,
      issueType: status === "exception" ? ["收件人拒收", "无法投递", "地址错误/不详", "无法进入"][index % 4] : null,
      deviation,
      destination, collectedPosition: status === "pending" || (index % 5 === 0 && deviation === null) ? null : [destination[0] + (alerts.includes("location") ? 0.004 : 0.0001), destination[1]],
      podImages: [],
    }
  }).sort((a, b) => a.sequence - b.sequence)
})

export function summarizeWaybills(rows: MonitorWaybill[]) {
  const total = rows.length
  const delivered = rows.filter((row) => row.status === "delivered").length
  const exception = rows.filter((row) => row.status === "exception").length
  return {
    total, delivered, exception, pending: total - delivered - exception,
    deliveredRate: total ? delivered / total * 100 : 0,
    clearanceRate: total ? (delivered + exception) / total * 100 : 0,
    pod: rows.filter((row) => row.alerts.includes("pod")).length,
    location: rows.filter((row) => row.alerts.includes("location")).length,
    fake: rows.filter((row) => row.alerts.includes("fake")).length,
  }
}

export type MonitorQuery = { field: "id" | "postalCode" | "address"; keyword: string; status: string; alerts: WaybillAlert[] }
export type MonitorSort = "sequence" | "overdue-desc" | "overdue-asc" | "signed-asc" | "signed-desc"
export const emptyMonitorQuery: MonitorQuery = { field: "id", keyword: "", status: "all", alerts: [] }

export function filterMonitorWaybills(rows: MonitorWaybill[], query: MonitorQuery, addressMatches: string[] | null, sort: MonitorSort) {
  const keyword = query.keyword.trim().toLowerCase()
  const addressIds = new Set(addressMatches ?? [])
  return rows.filter((row) => {
    const matchesKeyword = !keyword || (query.field === "address" ? addressIds.has(row.id) : row[query.field].toLowerCase() === keyword)
    const matchesAlert = query.alerts.length === 0 || query.alerts.some((alert) => row.alerts.includes(alert))
    return matchesKeyword && (query.status === "all" || row.status === query.status) && matchesAlert
  }).sort((a, b) => {
    if (sort.startsWith("overdue")) return (a.overdueDays - b.overdueDays) * (sort.endsWith("desc") ? -1 : 1) || a.sequence - b.sequence
    if (sort.startsWith("signed")) {
      if (!a.signedAt && !b.signedAt) return a.sequence - b.sequence
      if (!a.signedAt) return 1
      if (!b.signedAt) return -1
      return (Date.parse(a.signedAt) - Date.parse(b.signedAt)) * (sort.endsWith("desc") ? -1 : 1) || a.sequence - b.sequence
    }
    return a.driverId.localeCompare(b.driverId) || a.sequence - b.sequence
  })
}
