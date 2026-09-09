import { fakeDeliveryProblemTasks, inProgressProblemTasks, pendingProblemTasks, suspectedLostProblemTasks, trackingProblemTasks } from "./problem-task-data"
import { deliveryAlertRows } from "./delivery-alert-data"

export type AlertMetricKey =
  | "pod"
  | "delivery-location"
  | "pending"
  | "suspected-lost"
  | "in-progress"
  | "fake-delivery"
  | "dsp-tracking"

export type AlertMetricItem = {
  key: AlertMetricKey
  label: string
  detailTitle?: string
  value: number
  nested?: boolean
}

export const alertMetricGroups: Array<{ title: string; items: AlertMetricItem[] }> = [
  {
    title: "妥投异常",
    items: [
      { key: "pod", label: "POD 不合规", value: deliveryAlertRows.pod.length },
      { key: "delivery-location", label: "妥投位置异常", value: deliveryAlertRows["delivery-location"].length },
    ],
  },
  {
    title: "问题件",
    items: [
      { key: "pending", label: "待处理", detailTitle: "待处理问题件", value: pendingProblemTasks.length },
      { key: "suspected-lost", label: "疑似丢失", value: suspectedLostProblemTasks.length, nested: true },
      { key: "in-progress", label: "进行中", detailTitle: "进行中问题件", value: inProgressProblemTasks.length },
      { key: "fake-delivery", label: "虚假签收", value: fakeDeliveryProblemTasks.length },
      { key: "dsp-tracking", label: "DSP 轨迹断更", value: trackingProblemTasks.length },
    ],
  },
]

export const alertMetricItems = alertMetricGroups.flatMap((group) => group.items)

export function createAlertMetricDetailTitle(key: AlertMetricKey) {
  const item = alertMetricItems.find((metric) => metric.key === key)
  return item ? item.detailTitle ?? `${item.label}明细` : ""
}

export function parseAlertMetricDetailTitle(title: string) {
  return alertMetricItems.find((item) => (item.detailTitle ?? `${item.label}明细`) === title || `${item.label}明细` === title) ?? null
}

export function parseAlertMetricKey(value: string | null) {
  return alertMetricItems.find((item) => item.key === value) ?? null
}
