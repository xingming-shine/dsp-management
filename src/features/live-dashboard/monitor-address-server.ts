import "server-only"
import { monitorWaybills } from "@/features/live-dashboard/driver-monitor-data"

// Demo adapter: replace with the authorized waybill address service in production.
const demoAddresses = new Map(monitorWaybills.map((row) => [row.id,
  `${110 + row.sequence} ${["Madison Avenue", "Broadway", "Park Avenue", "Church Street"][row.sequence % 4]}, New York, NY ${row.postalCode}`,
]))

export function resolveDemoMonitorAddress(id: string) {
  return demoAddresses.get(id) ?? null
}

export function searchDemoMonitorAddresses(keyword: string) {
  const term = keyword.trim().toLowerCase()
  return [...demoAddresses].filter(([, address]) => address.toLowerCase().includes(term)).map(([id]) => id)
}
