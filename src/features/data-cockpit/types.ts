export type CockpitView =
  | "overview"
  | "ranking"
  | "capacity"
  | "efficiency"
  | "timeliness"
  | "quality"
  | "driver"

export type PeriodMode = "day" | "week" | "month"
export type RankMode = "week" | "month"
export type Perspective = "driver" | "route" | "postal"

export interface KpiMetric {
  label: string
  value: string
  tooltip?: string
  change?: string
  target?: string
  status?: "达标" | "未达标" | "更新中"
  assessment?: boolean
  detailType?: string
}

export interface RankingDetailRow {
  period: string
  difficulty: number
  pod2400: number
  pod2400Score: number
  pod4800: number
  pod4800Score: number
  breakRate: number
  breakRateScore: number
  fakeSignRate: number
  fakeSignScore: number
  complaintRate: number
  complaintScore: number
  starDriverPct: number
  starDriverPctScore: number
  starDriverAttendance: number
  starDriverAttendanceScore: number
  scoreAdjust: number
  total: number
  stationRank: number
  regionRank: number
}

export interface RankingSnapshot {
  dspName: string
  stationRank: number
  stationTotal: number
  stationChange: string
  regionRank: number
  regionTotal: number
  regionChange: string
  totalScore: number
  totalScoreChange: string
  difficulty: string
  dimensions: Array<{
    name: string
    value: number
    previous: number
    stationFirst: number
    regionFirst: number
  }>
}

export interface DeliveryRow {
  route: string
  expected: number
  picked: number
  pickupRate: string
  finalPicked: number
  finalPickupRate: string
  delivered: number
  completed: number
  exception: number
}

export interface EfficiencyRow {
  route: string
  delivery: number
  pph: number
  sortingHours: number
  firstStopHours: number
  deliveryHours: number
  workingHours: number
}

export interface TimelinessRow {
  route: string
  pod2400: string
  pod4800: string
  pod72h: string
  undelivered: number
}

export interface QualityRow {
  route: string
  fakeSignRate: string
  podComplianceRate: string
  breakRate: string
  dnrRate: string
  complaintRate: string
  validComplaintRate: string
}

export interface DriverRow {
  id: string
  name: string
  route: string
  active: boolean
  star: number
  score: number
  service: number
  quality: number
  efficiency: number
  redline: number
  dspRank: number
  stationRank: number
}

export interface DriverHistoryRow {
  month: string
  score: number
  service: number
  quality: number
  efficiency: number
  star: number
}
