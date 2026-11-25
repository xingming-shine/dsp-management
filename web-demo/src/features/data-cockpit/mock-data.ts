import type {
  DeliveryRow,
  DriverHistoryRow,
  DriverRow,
  EfficiencyRow,
  KpiMetric,
  QualityRow,
  RankingSnapshot,
  RankingDetailRow,
  TimelinessRow,
} from "@/features/data-cockpit/types"

export const metricTooltip = "我是指标说明的占位符。我是字符数的占位符"

export const cockpitTabs = [
  { value: "overview", label: "总览" },
  { value: "ranking", label: "DSP排名" },
  { value: "capacity", label: "产能" },
  { value: "efficiency", label: "人效" },
  { value: "timeliness", label: "时效" },
  { value: "quality", label: "质量" },
  { value: "driver", label: "司机表现" },
] as const

export const overviewMetrics: Record<string, KpiMetric[]> = {
  capacity: [
    {
      label: "领件率",
      value: "99.01%",
      change: "↓0.2% 环比昨日",
      target: "目标 ≥ 98.5%",
      status: "达标",
      assessment: true,
      detailType: "pickup",
    },
    {
      label: "派送总量",
      value: "1,856",
      change: "↑1.2% 环比昨日",
      detailType: "delivery",
    },
    {
      label: "妥投量",
      value: "1,820",
      change: "↑0.8% 环比昨日",
      detailType: "completed",
    },
  ],
  efficiency: [
    {
      label: "PPH",
      value: "28.5",
      change: "↓1.2 环比昨日",
      detailType: "pph",
    },
    {
      label: "派件时长",
      value: "4.2h",
      change: "↓0.1h 环比昨日",
      detailType: "hours",
    },
  ],
  timeliness: [
    {
      label: "2400妥投率",
      value: "97.67%",
      change: "↑1.2% 环比昨日",
      target: "目标 ≥ 96.0%",
      status: "达标",
      assessment: true,
      detailType: "2400",
    },
    {
      label: "4800妥投率",
      value: "99.67%",
      change: "→持平 环比昨日",
      target: "目标 ≥ 98.5%",
      status: "达标",
      assessment: true,
      detailType: "4800",
    },
    {
      label: "72H完结率",
      value: "99.67%",
      change: "→持平 环比昨日",
      target: "目标 ≥ 98.5%",
      status: "达标",
      assessment: true,
      detailType: "7200",
    },
  ],
  quality: [
    {
      label: "虚假签收率",
      value: "0.08%",
      change: "↓0.02% 环比昨日",
      target: "目标 ≤ 0.1%",
      status: "达标",
      assessment: true,
      detailType: "fake-sign",
    },
    {
      label: "DSP断更率",
      value: "0.12%",
      change: "↓0.04% 环比昨日",
      target: "目标 ≤ 0.5%",
      status: "达标",
      assessment: true,
      detailType: "break",
    },
    {
      label: "POD合规率",
      value: "97.5%",
      change: "↑0.8% 环比昨日",
      detailType: "pod",
    },
    {
      label: "POD不合规量",
      value: "42",
      change: "↑3 环比昨日",
      detailType: "pod-noncompliance",
    },
    {
      label: "DSP疑似断更率",
      value: "0.08%",
      change: "↓0.02% 环比昨日",
      detailType: "suspected-break",
    },
    {
      label: "DNR率",
      value: "1.2%",
      change: "↓0.3% 环比昨日",
      detailType: "dnr",
    },
    {
      label: "客诉率",
      value: "0.66%",
      change: "↓0.12% 环比昨日",
      detailType: "complaint-rate",
    },
    {
      label: "有效客诉率",
      value: "0.27%",
      change: "↓0.05% 环比昨日",
      detailType: "valid-complaint-rate",
    },
  ],
  driver: [
    { label: "派件司机人数", value: "45", change: "↑2 环比上月" },
    { label: "活跃司机人数", value: "38", change: "↓1 环比上月" },
    { label: "派件司机平均星级", value: "4.2★", change: "↑0.3 环比上月" },
    { label: "派件司机平均分数", value: "88.5", change: "↑1.2 环比上月" },
  ],
}

export const rankingSnapshots: Record<"week" | "month", RankingSnapshot> = {
  week: {
    dspName: "FTM01",
    stationRank: 7,
    stationTotal: 87,
    stationChange: "→ 持平",
    regionRank: 5,
    regionTotal: 163,
    regionChange: "↓ 1",
    totalScore: 133,
    totalScoreChange: "-7",
    difficulty: "中 1.100",
    dimensions: [
      { name: "时效", value: 85, previous: 84, stationFirst: 92, regionFirst: 95 },
      { name: "质量", value: 81, previous: 85, stationFirst: 90, regionFirst: 93 },
      { name: "客诉", value: 69, previous: 75, stationFirst: 82, regionFirst: 90 },
      { name: "团队表现", value: 79, previous: 85, stationFirst: 88, regionFirst: 94 },
    ],
  },
  month: {
    dspName: "FTM01",
    stationRank: 7,
    stationTotal: 87,
    stationChange: "↓ 2",
    regionRank: 5,
    regionTotal: 163,
    regionChange: "↓ 1",
    totalScore: 133,
    totalScoreChange: "-7",
    difficulty: "中 1.100",
    dimensions: [
      { name: "时效", value: 85, previous: 84, stationFirst: 93, regionFirst: 95 },
      { name: "质量", value: 81, previous: 85, stationFirst: 92, regionFirst: 93 },
      { name: "客诉", value: 69, previous: 75, stationFirst: 84, regionFirst: 90 },
      { name: "团队表现", value: 79, previous: 85, stationFirst: 90, regionFirst: 94 },
    ],
  },
}

export const trendLabels = [
  "W13",
  "W14",
  "W15",
  "W16",
  "W17",
  "W18",
  "W19",
  "W20",
  "W21",
  "W22",
  "W23",
  "W24",
]

export const monthlyLabels = [
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
]

export const deliveryRows: DeliveryRow[] = [
  { route: "路区 A-1", expected: 412, picked: 409, pickupRate: "99.27%", finalPicked: 411, finalPickupRate: "99.76%", delivered: 398, completed: 391, exception: 7 },
  { route: "路区 A-2", expected: 388, picked: 384, pickupRate: "98.97%", finalPicked: 387, finalPickupRate: "99.74%", delivered: 375, completed: 369, exception: 6 },
  { route: "路区 B-1", expected: 356, picked: 354, pickupRate: "99.44%", finalPicked: 356, finalPickupRate: "100.00%", delivered: 348, completed: 342, exception: 6 },
  { route: "路区 B-2", expected: 365, picked: 360, pickupRate: "98.63%", finalPicked: 364, finalPickupRate: "99.73%", delivered: 358, completed: 351, exception: 7 },
  { route: "路区 C-1", expected: 382, picked: 380, pickupRate: "99.48%", finalPicked: 381, finalPickupRate: "99.74%", delivered: 377, completed: 367, exception: 10 },
]

export const efficiencyRows: EfficiencyRow[] = [
  { route: "路区 A-1", delivery: 398, pph: 30.6, sortingHours: 17.2, firstStopHours: 20.8, deliveryHours: 77.5, workingHours: 115.5 },
  { route: "路区 A-2", delivery: 375, pph: 29.4, sortingHours: 16.8, firstStopHours: 21.2, deliveryHours: 76.1, workingHours: 114.1 },
  { route: "路区 B-1", delivery: 348, pph: 28.7, sortingHours: 15.9, firstStopHours: 19.8, deliveryHours: 72.3, workingHours: 108.0 },
  { route: "路区 B-2", delivery: 358, pph: 27.9, sortingHours: 16.4, firstStopHours: 20.5, deliveryHours: 74.8, workingHours: 111.7 },
  { route: "路区 C-1", delivery: 377, pph: 26.8, sortingHours: 14.7, firstStopHours: 16.7, deliveryHours: 77.9, workingHours: 109.3 },
]

export const timelinessRows: TimelinessRow[] = [
  { route: "路区 A-1", pod2400: "98.1%", pod4800: "99.8%", pod72h: "100.0%", undelivered: 1 },
  { route: "路区 A-2", pod2400: "97.5%", pod4800: "99.5%", pod72h: "99.8%", undelivered: 3 },
  { route: "路区 B-1", pod2400: "96.8%", pod4800: "99.2%", pod72h: "99.7%", undelivered: 3 },
  { route: "路区 B-2", pod2400: "95.8%", pod4800: "98.9%", pod72h: "99.5%", undelivered: 4 },
  { route: "路区 C-1", pod2400: "96.4%", pod4800: "99.1%", pod72h: "99.6%", undelivered: 3 },
]

export const qualityRows: QualityRow[] = [
  { route: "路区 A-1", fakeSignRate: "0.05%", podComplianceRate: "98.2%", breakRate: "0.08%", dnrRate: "0.9%", complaintRate: "0.51%", validComplaintRate: "0.20%" },
  { route: "路区 A-2", fakeSignRate: "0.08%", podComplianceRate: "97.8%", breakRate: "0.10%", dnrRate: "1.0%", complaintRate: "0.59%", validComplaintRate: "0.24%" },
  { route: "路区 B-1", fakeSignRate: "0.06%", podComplianceRate: "97.6%", breakRate: "0.12%", dnrRate: "1.1%", complaintRate: "0.61%", validComplaintRate: "0.25%" },
  { route: "路区 B-2", fakeSignRate: "0.11%", podComplianceRate: "96.8%", breakRate: "0.18%", dnrRate: "1.5%", complaintRate: "0.82%", validComplaintRate: "0.35%" },
  { route: "路区 C-1", fakeSignRate: "0.09%", podComplianceRate: "97.1%", breakRate: "0.14%", dnrRate: "1.4%", complaintRate: "0.77%", validComplaintRate: "0.31%" },
]

export const drivers: DriverRow[] = [
  { id: "DRV-001", name: "Alex Chen", route: "路区 A-1", active: true, star: 5, score: 98.2, service: 29.5, quality: 29.8, efficiency: 38.9, redline: 0, dspRank: 1, stationRank: 3 },
  { id: "DRV-002", name: "Maria Garcia", route: "路区 A-2", active: true, star: 5, score: 96.8, service: 28.9, quality: 29.2, efficiency: 38.7, redline: 0, dspRank: 2, stationRank: 7 },
  { id: "DRV-003", name: "James Wilson", route: "路区 B-1", active: true, star: 4, score: 94.6, service: 28.5, quality: 28.1, efficiency: 38.0, redline: 0, dspRank: 3, stationRank: 12 },
  { id: "DRV-004", name: "Linda Brown", route: "路区 B-2", active: true, star: 4, score: 92.4, service: 27.8, quality: 27.6, efficiency: 37.0, redline: 0, dspRank: 4, stationRank: 18 },
  { id: "DRV-005", name: "Robert Davis", route: "路区 C-1", active: true, star: 4, score: 90.7, service: 27.2, quality: 26.8, efficiency: 36.7, redline: 1, dspRank: 5, stationRank: 24 },
  { id: "DRV-006", name: "Sophia Martinez", route: "路区 A-1", active: true, star: 3, score: 88.5, service: 26.9, quality: 26.2, efficiency: 35.4, redline: 0, dspRank: 6, stationRank: 31 },
  { id: "DRV-007", name: "Michael Miller", route: "路区 A-2", active: false, star: 3, score: 84.1, service: 25.8, quality: 24.9, efficiency: 33.4, redline: 1, dspRank: 7, stationRank: 46 },
  { id: "DRV-008", name: "Emma Taylor", route: "路区 B-1", active: true, star: 2, score: 79.6, service: 24.5, quality: 23.1, efficiency: 32.0, redline: 2, dspRank: 8, stationRank: 65 },
]

export const driverHistory: DriverHistoryRow[] = monthlyLabels.map((month, index) => ({
  month,
  score: Number((83.4 + index * 1.35).toFixed(1)),
  service: Number((25.2 + index * 0.39).toFixed(1)),
  quality: Number((24.8 + index * 0.45).toFixed(1)),
  efficiency: Number((33.4 + index * 0.61).toFixed(1)),
  star: index < 3 ? 3 : index < 8 ? 4 : 5,
}))

export const complaintDistribution = [
  { name: "未收到包裹", value: 4 },
  { name: "投递位置不符", value: 3 },
  { name: "包裹破损", value: 2 },
  { name: "服务态度", value: 2 },
  { name: "其他", value: 1 },
]

export const deliveryTimeDistribution = [
  { name: "2400内妥投", value: 1680 },
  { name: "2400-4800", value: 180 },
  { name: "4800-72H", value: 40 },
]

const rankingDetailSeed = [
  [1.1, .9903, 33.1, .9937, 12.5, .0001, 19.4, .0003, 17.7, .0007, 12.8, .823, 20, .724, 17.4, 2, 133, 7, 8],
  [1.113, .9898, 33.3, .9935, 12.6, .0001, 19.2, .0003, 18.7, .0005, 14.8, .844, 20, .765, 21.5, 0, 140, 4, 7],
  [1.085, .9918, 33, .9955, 12.5, .0001, 19.7, .0002, 19.3, .0006, 14.2, .844, 20, .756, 20.6, 0, 139, 5, 4],
  [1.07, .9859, 31, .9913, 11.9, .0003, 17.1, .0004, 16.1, .001, 9.9, .684, 6.8, .735, 18.5, 0, 111, 8, 5],
  [1.139, .9662, 27.4, .985, 12, .0006, 12.4, .0006, 13.8, .0014, 6, .744, 13.4, .679, 12.9, 0, 98, 11, 8],
  [1.079, .994, 33.5, .9968, 12.6, .0001, 19, .0001, 20.8, .0005, 15, .887, 20, .909, 30, 0, 151, 1, 2],
  [1.028, .9714, 26.1, .9851, 10.8, .0006, 12.6, .0006, 13.8, .0009, 10.6, .63, 6.3, .562, 1.2, 0, 81.3, 12, 1],
  [1.09, .9808, 30.2, .9916, 12.2, .0003, 16.5, .0003, 18, .0005, 14.5, .659, 6.6, .589, 3.9, 0, 102, 10, 12],
  [1.024, .9359, 16.9, .9687, 9.1, .0001, 19, .0003, 18.3, .0006, 14.4, .749, 14.9, .652, 10.2, 0, 103, 9, 10],
  [1.119, .9906, 33.7, .9956, 12.9, .00004, 20.4, .0003, 18.2, .0006, 13.7, .877, 20, .794, 24.4, 0, 143, 2, 3],
  [1.086, .9909, 32.8, .9948, 12.5, .0001, 19.3, .0003, 18.4, .0007, 13.5, .842, 20, .775, 22.5, 0, 139, 6, 2],
  [1.063, .9898, 31.8, .995, 12.2, .0001, 19.3, .0003, 18.5, .0005, 15.1, .825, 20, .788, 23.8, 0, 141, 3, 6],
] as const

export function getRankingDetailRows(mode: "week" | "month"): RankingDetailRow[] {
  return rankingDetailSeed.map((values, index) => ({
    period: mode === "week" ? `W${24 - index}` : monthlyLabels[monthlyLabels.length - 1 - index],
    difficulty: values[0], pod2400: values[1], pod2400Score: values[2],
    pod4800: values[3], pod4800Score: values[4], breakRate: values[5],
    breakRateScore: values[6], fakeSignRate: values[7], fakeSignScore: values[8],
    complaintRate: values[9], complaintScore: values[10], starDriverPct: values[11],
    starDriverPctScore: values[12], starDriverAttendance: values[13],
    starDriverAttendanceScore: values[14], scoreAdjust: values[15], total: values[16],
    stationRank: values[17], regionRank: values[18],
  }))
}
