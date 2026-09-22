import { getDspScenario } from "./dsp-scenarios"
import { mockHash } from "./driver-generator"
import type { MockDriver, MockValues } from "./types"

function event(seed: number, probability: number) {
  return (seed % 10000) / 10000 < probability ? 1 : 0
}

export function generateDailyValues(date: string, driver: MockDriver): MockValues {
  const scenario = getDspScenario(driver.organizationId)
  const seed = mockHash(`${scenario.id}/${date}/${driver.id}`)
  const activeCount = Math.max(1, Math.round(scenario.driverCount * scenario.activeRate))
  const averageVolume = (scenario.dailyVolumeRange[0] + scenario.dailyVolumeRange[1]) / 2 / activeCount
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  const weekdayFactor = day === 0 || day === 6 ? 0.88 : 1
  const dailyFactor = 0.88 + (seed % 25) / 100
  const expected = Math.max(20, Math.round(averageVolume * driver.volumeFactor * weekdayFactor * dailyFactor))
  const pickupGap = Math.min(expected, seed % (driver.performanceTier === "risk" ? 7 : 4))
  const picked = expected - pickupGap
  const finalPicked = Math.min(expected, picked + (seed % 3))
  const should = finalPicked
  const unfinished = Math.min(should, Math.round((seed % 3) * driver.riskFactor))
  const completed72 = should - unfinished
  const final = Math.min(should, completed72 + (seed % 2))
  const exceptionWithinFinal = Math.min(final, Math.max(1, Math.round((1 + seed % 3) * driver.riskFactor)))
  const delivered = Math.max(0, final - exceptionWithinFinal)
  const exception = should - delivered
  const vol4800 = Math.max(0, delivered - Math.round((seed % 3) * driver.riskFactor))
  const vol2400 = Math.max(0, vol4800 - Math.round((seed % 7) * driver.riskFactor))
  const excluded = Math.min(3, seed % 3)
  const excludedDelivered = Math.min(excluded, vol2400)
  const sortMinutes = Math.round((62 + seed % 30) * (driver.performanceTier === "risk" ? 1.12 : 1))
  const firstMinutes = Math.round((82 + seed % 38) * (driver.performanceTier === "risk" ? 1.15 : 1))
  const deliveryMinutes = Math.round((220 + seed % 110) / Math.max(0.75, driver.volumeFactor))
  const podChecked = should
  const podBad = Math.min(podChecked, event(seed >>> 2, 0.7) + event(seed >>> 5, 0.22 * driver.riskFactor))
  const fake = event(seed >>> 3, 0.006 * driver.riskFactor)
  const suspected = event(seed >>> 4, 0.018 * driver.riskFactor)
  const broken = event(seed >>> 5, 0.01 * driver.riskFactor)
  const dnr = event(seed >>> 6, 0.012 * driver.riskFactor)
  const complaint = event(seed >>> 7, 0.022 * driver.riskFactor)
  const validComplaint = complaint ? event(seed >>> 8, 0.48) : 0
  const values: MockValues = {
    expected,
    picked,
    finalPicked,
    should,
    delivered,
    exception,
    vol2400,
    vol4800,
    completed72,
    unfinished,
    final,
    excluded,
    excludedDelivered,
    sortMinutes,
    firstMinutes,
    deliveryMinutes,
    workMinutes: sortMinutes + firstMinutes + deliveryMinutes,
    podChecked,
    podBad,
    podGood: podChecked - podBad,
    fake,
    suspected,
    broken,
    dnr,
    complaint,
    validComplaint,
    driverDays: 1,
    bucket0: vol2400,
    bucket1: vol4800 - vol2400,
    bucket2: Math.max(0, delivered - vol4800 - 1),
    bucket3: delivered > vol4800 ? 1 : 0,
    bucket4: 0,
  }
  values.bucket4 = Math.max(0, delivered - values.bucket0 - values.bucket1 - values.bucket2 - values.bucket3)
  for (let index = 0; index < 4; index++) {
    values[`complaint${index}`] = index === seed % 4 ? complaint : 0
    values[`validComplaint${index}`] = index === seed % 4 ? validComplaint : 0
  }
  return values
}
