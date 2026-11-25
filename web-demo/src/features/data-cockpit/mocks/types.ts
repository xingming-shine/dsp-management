export type DspSize = "small" | "medium" | "large" | "peak"

export type PerformanceTier = "high" | "normal" | "risk"

export interface DspScenario {
  id: string
  name: string
  code: string
  size: DspSize
  sizeLabel: string
  operatingMode: string
  driverCount: number
  activeRate: number
  routeCount: number
  postalCount: number
  postalBase: number
  dailyVolumeRange: [number, number]
  performanceMix: Record<PerformanceTier, number>
  riskMultiplier: number
  scoreShift: number
  stationRank: number
  stationDspCount: number
  stationFirstScore: number
  regionRank: number
  regionDspCount: number
  regionFirstScore: number
  stationDriverCount: number
}

export interface MockDriver {
  organizationId: string
  id: string
  name: string
  route: string
  postal: string
  tenure: string
  active: boolean
  attendanceRate: number
  volumeFactor: number
  riskFactor: number
  scoreBias: number
  performanceTier: PerformanceTier
}

export type MockValues = Record<string, number>
