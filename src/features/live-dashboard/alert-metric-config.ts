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
  value: number
  nested?: boolean
}

export const alertMetricGroups: Array<{ title: string; items: AlertMetricItem[] }> = [
  {
    title: "妥投异常",
    items: [
      { key: "pod", label: "POD 不合规", value: 7 },
      { key: "delivery-location", label: "妥投位置异常", value: 7 },
    ],
  },
  {
    title: "问题件",
    items: [
      { key: "pending", label: "待处理", value: 7 },
      { key: "suspected-lost", label: "疑似丢失", value: 3, nested: true },
      { key: "in-progress", label: "进行中", value: 7 },
      { key: "fake-delivery", label: "虚假签收", value: 7 },
      { key: "dsp-tracking", label: "DSP 轨迹断更", value: 7 },
    ],
  },
]

export const alertMetricItems = alertMetricGroups.flatMap((group) => group.items)

export function createAlertMetricDetailTitle(key: AlertMetricKey) {
  const item = alertMetricItems.find((metric) => metric.key === key)
  return item ? `${item.label}明细` : ""
}

export function parseAlertMetricDetailTitle(title: string) {
  return alertMetricItems.find((item) => `${item.label}明细` === title) ?? null
}

export function parseAlertMetricKey(value: string | null) {
  return alertMetricItems.find((item) => item.key === value) ?? null
}
