import { monitorWaybills, type MonitorWaybill } from "./driver-monitor-data"

export type DeliveryAlertMetric = "pod" | "delivery-location"
export const deliveryAlertRows = {
  pod: monitorWaybills.filter((row) => row.status === "delivered" && row.alerts.includes("pod")),
  "delivery-location": monitorWaybills.filter((row) => row.status === "delivered" && row.deviation !== null && row.deviation > 800),
} satisfies Record<DeliveryAlertMetric, MonitorWaybill[]>
