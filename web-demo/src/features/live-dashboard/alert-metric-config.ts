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
  description: string
  detailTitle?: string
  value: number
  nested?: boolean
}

export const alertMetricGroups: Array<{ title: string; items: AlertMetricItem[] }> = [
  {
    title: "妥投异常",
    items: [
      { key: "pod", label: "POD 不合规", description: "24h内签收的运单，POD签收证明被判定为不合规", value: deliveryAlertRows.pod.length },
      { key: "delivery-location", label: "妥投位置异常", description: "24h内签收的运单，实际妥投位置与收件人位置偏差大于800m", value: deliveryAlertRows["delivery-location"].length },
    ],
  },
  {
    title: "问题件",
    items: [
      { key: "pending", label: "待处理", description: "问题件工作台中待我处理的运单", detailTitle: "待处理问题件", value: pendingProblemTasks.length },
      { key: "suspected-lost", label: "疑似丢失", description: "问题件工作台中待我处理的运单中，问题件类型是疑似断更的运单", value: suspectedLostProblemTasks.length, nested: true },
      { key: "in-progress", label: "进行中", description: "问题件工作台中处理中的运单", detailTitle: "进行中问题件", value: inProgressProblemTasks.length },
      { key: "fake-delivery", label: "虚假签收", description: "今日被判定为虚假签收的运单", value: fakeDeliveryProblemTasks.length },
      { key: "dsp-tracking", label: "DSP 轨迹断更", description: "今日被判定为DSP轨迹断更的运单", value: trackingProblemTasks.length },
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
