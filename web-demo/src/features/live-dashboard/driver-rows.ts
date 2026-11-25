import { drivers, type DriverSnapshot } from "@/features/live-dashboard/mock-data"

export type RouteDifficulty = "S" | "A" | "B" | "C" | "D"
export type DriverRouteAssignment = {
  name: string
  difficulty?: RouteDifficulty
  safety: "安全"
  deliveryExceptionRate: string
  dnrRate: string
  deliveryPph: string
}
export type DashboardDriverSnapshot = DriverSnapshot & {
  routeAssignments: DriverRouteAssignment[]
  latestAction: string
  latestActionAt: string
}

const routePerformanceByDifficulty: Record<RouteDifficulty | "default", Omit<DriverRouteAssignment, "name" | "difficulty">> = {
  S: { safety: "安全", deliveryExceptionRate: "1.72%", dnrRate: "0.38%", deliveryPph: "19.8 件/h" },
  A: { safety: "安全", deliveryExceptionRate: "1.03%", dnrRate: "0.23%", deliveryPph: "23.5 件/h" },
  B: { safety: "安全", deliveryExceptionRate: "0.86%", dnrRate: "0.18%", deliveryPph: "26.1 件/h" },
  C: { safety: "安全", deliveryExceptionRate: "0.62%", dnrRate: "0.12%", deliveryPph: "28.4 件/h" },
  D: { safety: "安全", deliveryExceptionRate: "0.41%", dnrRate: "0.08%", deliveryPph: "30.2 件/h" },
  default: { safety: "安全", deliveryExceptionRate: "0.75%", dnrRate: "0.15%", deliveryPph: "27.0 件/h" },
}

function driverRoute(name: string, difficulty?: RouteDifficulty): DriverRouteAssignment {
  return { name, difficulty, ...routePerformanceByDifficulty[difficulty ?? "default"] }
}

export const driverRows: DashboardDriverSnapshot[] = [
  {
    ...drivers[0], id: "DRV-VIVIAN-01", name: "Vivian Ho", route: "SLE-VE-01",
    routeAssignments: [driverRoute("SLE-VE-01", "S")],
    status: "未开始派送", delivered: 0, pending: 131, exception: 0, nonStandardReturn: 0, total: 131,
    latestAction: "快递员收件", latestActionAt: "2026-08-21T08:02:18-04:00",
    locationIssues: 0, podIssues: 0, fakeIssues: 0,
    efficiency: "0 件/h", activeHours: "0h", position: { left: "46%", top: "66%" },
  },
  {
    ...drivers[1], id: "DRV-VIVIAN-02", name: "Vivian Ho1", route: "SLE-VE-02",
    routeAssignments: [driverRoute("SLE-VE-02", "A")],
    status: "1h 未派送", delivered: 140, pending: 15, exception: 10, nonStandardReturn: 2, total: 167,
    latestAction: "今日转派", latestActionAt: "2026-08-21T15:18:42-04:00",
    efficiency: "11.5 件/h", activeHours: "5h", position: { left: "59%", top: "37%" },
  },
  {
    ...drivers[2], id: "DRV-VIVIAN-03", name: "Vivian Ho2", route: "SLE-VE-03",
    routeAssignments: [
      driverRoute("SLE-VE-03", "B"),
      driverRoute("SLE-VE-04", "C"),
    ],
    status: "2h 未派送", delivered: 170, pending: 15, exception: 13, nonStandardReturn: 2, total: 200,
    latestAction: "派送异常采集", latestActionAt: "2026-08-21T14:06:35-04:00",
    efficiency: "16 件/h", activeHours: "8h", position: { left: "72%", top: "29%" },
  },
  {
    ...drivers[0], id: "DRV-VIVIAN-04", name: "Vivian Ho3", route: "SLE-VE-05",
    routeAssignments: [driverRoute("SLE-VE-05", "D")],
    status: "1h 未派送", delivered: 158, pending: 15, exception: 12, nonStandardReturn: 2, total: 187,
    latestAction: "快递员收件", latestActionAt: "2026-08-21T15:12:09-04:00",
    efficiency: "13.2 件/h", activeHours: "6h", position: { left: "48%", top: "48%" }, coordinates: "40.70980, -74.00210",
  },
  {
    ...drivers[1], id: "DRV-VIVIAN-05", name: "Fanlin Wu", route: "SLE-WU-03",
    routeAssignments: [driverRoute("SLE-WU-03", "C")],
    status: "派送正常", delivered: 155, pending: 14, exception: 11, nonStandardReturn: 2, total: 182,
    latestAction: "签收", latestActionAt: "2026-08-21T16:32:14-04:00",
    efficiency: "15.8 件/h", activeHours: "6.5h", position: { left: "50%", top: "18%" }, coordinates: "40.72150, -74.00400",
  },
  {
    ...drivers[2], id: "DRV-VIVIAN-06", name: "Fanlin Wu3", route: "SLE-WU-04",
    routeAssignments: [
      driverRoute("SLE-WU-04"),
      driverRoute("SLE-WU-05"),
      driverRoute("SLE-WU-06"),
      driverRoute("SLE-WU-07"),
      driverRoute("SLE-WU-08"),
    ],
    status: "30min 未派送", delivered: 145, pending: 15, exception: 11, nonStandardReturn: 2, total: 173,
    latestAction: "今日转派", latestActionAt: "2026-08-21T15:44:28-04:00",
    efficiency: "14.7 件/h", activeHours: "5.8h", position: { left: "70%", top: "45%" }, coordinates: "40.71600, -73.99350",
  },
  {
    ...drivers[0], id: "DRV-ALICE-01", name: "Alice Chen", route: "SLE-CH-01",
    routeAssignments: [driverRoute("SLE-CH-01", "B")],
    status: "30min 未派送", delivered: 158, pending: 16, exception: 14, nonStandardReturn: 2, total: 190,
    latestAction: "派送异常采集", latestActionAt: "2026-08-21T15:51:07-04:00",
    locationIssues: 2, podIssues: 2, fakeIssues: 1,
    efficiency: "15.2 件/h", activeHours: "6.2h", position: { left: "41%", top: "24%" }, coordinates: "40.72610, -74.01020",
  },
  {
    ...drivers[1], id: "DRV-MIKE-01", name: "Mike Liu", route: "SLE-LI-02",
    routeAssignments: [driverRoute("SLE-LI-02", "D")],
    status: "1h 未派送", delivered: 135, pending: 13, exception: 10, nonStandardReturn: 2, total: 160,
    latestAction: "快递员收件", latestActionAt: "2026-08-21T15:03:56-04:00",
    locationIssues: 1, podIssues: 0, fakeIssues: 0,
    efficiency: "13.8 件/h", activeHours: "5.4h", position: { left: "62%", top: "54%" }, coordinates: "40.70320, -73.99740",
  },
  {
    ...drivers[2], id: "DRV-SOPHIA-01", name: "Sophia Zhang", route: "SLE-ZH-03",
    routeAssignments: [
      driverRoute("SLE-ZH-03", "A"),
      driverRoute("SLE-ZH-04", "B"),
    ],
    status: "2h 未派送", delivered: 175, pending: 18, exception: 14, nonStandardReturn: 3, total: 210,
    latestAction: "今日转派", latestActionAt: "2026-08-21T14:27:31-04:00",
    locationIssues: 0, podIssues: 2, fakeIssues: 0,
    efficiency: "16.4 件/h", activeHours: "7.5h", position: { left: "78%", top: "35%" }, coordinates: "40.71880, -73.98620",
  },
  {
    ...drivers[0], id: "DRV-LEO-01", name: "Leo Wang", route: "SLE-WA-01",
    routeAssignments: [
      driverRoute("SLE-WA-01"),
      driverRoute("SLE-WA-02"),
      driverRoute("SLE-WA-03"),
      driverRoute("SLE-WA-04"),
    ],
    status: "30min 未派送", delivered: 142, pending: 29, exception: 7, nonStandardReturn: 3, total: 181,
    latestAction: "派送异常采集", latestActionAt: "2026-08-21T15:37:44-04:00",
    locationIssues: 0, podIssues: 0, fakeIssues: 2,
    efficiency: "14.1 件/h", activeHours: "5.9h", position: { left: "33%", top: "43%" }, coordinates: "40.71120, -74.01710",
  },
]
