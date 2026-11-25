export const deliveryResultOrder = ["delivered", "exception", "nonstandard_return", "pending"] as const

export type DeliveryResultStatus = (typeof deliveryResultOrder)[number]

export type DeliveryResultCounts = Record<DeliveryResultStatus, number>

export type DeliveryResultRates = Record<DeliveryResultStatus, number> & {
  adjustedStatus: DeliveryResultStatus | null
}

const percentageScale = 100
const percentageTotal = 100 * percentageScale

function toPercentageUnits(value: number, total: number) {
  return Math.round((value / total) * percentageTotal)
}

export function calculateDeliveryResultRates(counts: DeliveryResultCounts): DeliveryResultRates {
  const normalizedCounts = Object.fromEntries(
    deliveryResultOrder.map((status) => [status, Math.max(0, Number.isFinite(counts[status]) ? counts[status] : 0)])
  ) as DeliveryResultCounts
  const total = deliveryResultOrder.reduce((sum, status) => sum + normalizedCounts[status], 0)
  const units = Object.fromEntries(deliveryResultOrder.map((status) => [status, 0])) as DeliveryResultCounts

  if (total === 0) {
    return { pending: 0, delivered: 0, exception: 0, nonstandard_return: 0, adjustedStatus: null }
  }

  const positiveStatuses = deliveryResultOrder
    .filter((status) => normalizedCounts[status] > 0)
    .sort((left, right) => {
      const difference = normalizedCounts[right] - normalizedCounts[left]
      return difference || deliveryResultOrder.indexOf(left) - deliveryResultOrder.indexOf(right)
    })
  const adjustedStatus = positiveStatuses.at(-1) ?? null

  positiveStatuses.slice(0, -1).forEach((status) => {
    units[status] = toPercentageUnits(normalizedCounts[status], total)
  })

  if (adjustedStatus) {
    units[adjustedStatus] = percentageTotal - positiveStatuses.slice(0, -1).reduce((sum, status) => sum + units[status], 0)
  }

  if (adjustedStatus && units[adjustedStatus] < 0) {
    let deficit = -units[adjustedStatus]
    units[adjustedStatus] = 0
    for (const status of [...positiveStatuses.slice(0, -1)].reverse()) {
      const adjustment = Math.min(units[status], deficit)
      units[status] -= adjustment
      deficit -= adjustment
      if (deficit === 0) break
    }
  }

  return {
    pending: units.pending / percentageScale,
    delivered: units.delivered / percentageScale,
    exception: units.exception / percentageScale,
    nonstandard_return: units.nonstandard_return / percentageScale,
    adjustedStatus,
  }
}

export function calculateClearanceRate(counts: DeliveryResultCounts) {
  const total = deliveryResultOrder.reduce((sum, status) => sum + Math.max(0, counts[status]), 0)
  return total === 0 ? 0 : ((counts.delivered + counts.exception) / total) * 100
}
