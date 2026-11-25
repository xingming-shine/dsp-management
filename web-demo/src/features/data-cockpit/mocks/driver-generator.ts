import { getDspScenario } from "./dsp-scenarios"
import type { MockDriver, PerformanceTier } from "./types"

const firstNames = [
  "John", "Mike", "Lisa", "David", "Sarah", "Anna", "Tom", "Jim", "Eva", "Ray",
  "Daniel", "Maria", "Kevin", "Olivia", "Jason", "Emma", "Leo", "Grace", "Eric", "Nina",
]
const lastNames = [
  "Smith", "Torres", "Kim", "Lee", "Wang", "Chen", "Yang", "Brown", "Wilson", "Zhang",
  "Davis", "Martin", "Garcia", "Clark", "Lewis", "Hall", "Allen", "Young", "King", "Scott",
]

export function mockHash(value: string) {
  let result = Array.from(value).reduce(
    (current, character) => Math.imul(current ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261
  )
  result = Math.imul(result ^ (result >>> 16), 2246822507)
  result = Math.imul(result ^ (result >>> 13), 3266489909)
  return (result ^ (result >>> 16)) >>> 0
}

function driverName(index: number) {
  const first = firstNames[index % firstNames.length]
  const last = lastNames[(index * 7 + Math.floor(index / firstNames.length)) % lastNames.length]
  return `${first} ${last}`
}

function performanceTier(organizationId: string, index: number): PerformanceTier {
  const scenario = getDspScenario(organizationId)
  const value = (mockHash(`${organizationId}/tier/${index}`) % 1000) / 1000
  if (value < scenario.performanceMix.high) return "high"
  if (value < scenario.performanceMix.high + scenario.performanceMix.normal) return "normal"
  return "risk"
}

const driverCache = new Map<string, MockDriver[]>()

export function getMockDrivers(organizationId?: string): MockDriver[] {
  const scenario = getDspScenario(organizationId)
  const cached = driverCache.get(scenario.id)
  if (cached) return cached

  const activeCount = Math.round(scenario.driverCount * scenario.activeRate)
  const drivers = Array.from({ length: scenario.driverCount }, (_, index): MockDriver => {
    const tier = performanceTier(scenario.id, index)
    const seed = mockHash(`${scenario.id}/driver/${index}`)
    const active = index < activeCount
    const attendanceBase = active ? 0.8 : 0.06
    const attendanceRange = active ? 0.18 : 0.18
    const tierAttendance = tier === "high" ? 0.03 : tier === "risk" ? -0.09 : 0
    const volumeBase = tier === "high" ? 1.14 : tier === "risk" ? 0.72 : 0.92
    const volumeRange = tier === "high" ? 0.16 : tier === "risk" ? 0.22 : 0.24

    return {
      organizationId: scenario.id,
      id: `DRV-${String(1001 + index).padStart(4, "0")}`,
      name: driverName(index),
      route: `R-${String((index % scenario.routeCount) + 1).padStart(2, "0")}`,
      postal: String(scenario.postalBase + (index % scenario.postalCount)).padStart(5, "0"),
      tenure: `${Math.floor((seed % 72) / 12)}年${seed % 12}月`,
      active,
      attendanceRate: Math.max(0.02, Math.min(0.99, attendanceBase + (seed % 100) / 100 * attendanceRange + tierAttendance)),
      volumeFactor: volumeBase + ((seed >>> 7) % 100) / 100 * volumeRange,
      riskFactor: (tier === "high" ? 0.45 : tier === "risk" ? 1.8 : 0.9) * scenario.riskMultiplier,
      scoreBias: tier === "high" ? 7 : tier === "risk" ? -11 : 0,
      performanceTier: tier,
    }
  })

  driverCache.set(scenario.id, drivers)
  return drivers
}

export function worksOnDate(date: string, driver: MockDriver) {
  return (mockHash(`${driver.organizationId}/${date}/${driver.id}/attendance`) % 10000) / 10000 < driver.attendanceRate
}
