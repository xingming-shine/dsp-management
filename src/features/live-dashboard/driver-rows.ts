import { drivers, type DriverSnapshot } from "@/features/live-dashboard/mock-data"

export type RouteDifficulty = "S" | "A" | "B" | "C" | "D"
export type DriverRouteAssignment = { name: string; difficulty?: RouteDifficulty }
export type DashboardDriverSnapshot = DriverSnapshot & { routeAssignments: DriverRouteAssignment[] }

export const driverRows: DashboardDriverSnapshot[] = [
  {
    ...drivers[0], id: "DRV-VIVIAN-01", name: "Vivian Ho", route: "SLE-VE-01",
    routeAssignments: [{ name: "SLE-VE-01", difficulty: "S" }],
    status: "未开始派送", delivered: 0, pending: 131, exception: 0, total: 131,
    locationIssues: 0, podIssues: 0, fakeIssues: 0,
    efficiency: "0 件/h", activeHours: "0h", position: { left: "46%", top: "66%" },
  },
  {
    ...drivers[1], id: "DRV-VIVIAN-02", name: "Vivian Ho1", route: "SLE-VE-02",
    routeAssignments: [{ name: "SLE-VE-02", difficulty: "A" }],
    status: "1h 未派送", delivered: 118, pending: 49, exception: 0, total: 167,
    efficiency: "11.5 件/h", activeHours: "5h", position: { left: "59%", top: "37%" },
  },
  {
    ...drivers[2], id: "DRV-VIVIAN-03", name: "Vivian Ho2", route: "SLE-VE-03",
    routeAssignments: [
      { name: "SLE-VE-03", difficulty: "B" },
      { name: "SLE-VE-04", difficulty: "C" },
    ],
    status: "2h 未派送", delivered: 180, pending: 0, exception: 20, total: 200,
    efficiency: "16 件/h", activeHours: "8h", position: { left: "72%", top: "29%" },
  },
  {
    ...drivers[0], id: "DRV-VIVIAN-04", name: "Vivian Ho3", route: "SLE-VE-05",
    routeAssignments: [{ name: "SLE-VE-05", difficulty: "D" }],
    status: "1h 未派送", delivered: 142, pending: 38, exception: 7, total: 187,
    efficiency: "13.2 件/h", activeHours: "6h", position: { left: "48%", top: "48%" }, coordinates: "40.70980, -74.00210",
  },
  {
    ...drivers[1], id: "DRV-VIVIAN-05", name: "Fanlin Wu", route: "SLE-WU-03",
    routeAssignments: [{ name: "SLE-WU-03", difficulty: "C" }],
    status: "派送正常", delivered: 156, pending: 22, exception: 4, total: 182,
    efficiency: "15.8 件/h", activeHours: "6.5h", position: { left: "50%", top: "18%" }, coordinates: "40.72150, -74.00400",
  },
  {
    ...drivers[2], id: "DRV-VIVIAN-06", name: "Fanlin Wu3", route: "SLE-WU-04",
    routeAssignments: [
      { name: "SLE-WU-04" },
      { name: "SLE-WU-05" },
      { name: "SLE-WU-06" },
      { name: "SLE-WU-07" },
      { name: "SLE-WU-08" },
    ],
    status: "30min 未派送", delivered: 133, pending: 31, exception: 9, total: 173,
    efficiency: "14.7 件/h", activeHours: "5.8h", position: { left: "70%", top: "45%" }, coordinates: "40.71600, -73.99350",
  },
  {
    ...drivers[0], id: "DRV-ALICE-01", name: "Alice Chen", route: "SLE-CH-01",
    routeAssignments: [{ name: "SLE-CH-01", difficulty: "B" }],
    status: "30min 未派送", delivered: 150, pending: 30, exception: 10, total: 190,
    locationIssues: 2, podIssues: 2, fakeIssues: 1,
    efficiency: "15.2 件/h", activeHours: "6.2h", position: { left: "41%", top: "24%" }, coordinates: "40.72610, -74.01020",
  },
  {
    ...drivers[1], id: "DRV-MIKE-01", name: "Mike Liu", route: "SLE-LI-02",
    routeAssignments: [{ name: "SLE-LI-02", difficulty: "D" }],
    status: "1h 未派送", delivered: 120, pending: 35, exception: 5, total: 160,
    locationIssues: 1, podIssues: 0, fakeIssues: 0,
    efficiency: "13.8 件/h", activeHours: "5.4h", position: { left: "62%", top: "54%" }, coordinates: "40.70320, -73.99740",
  },
  {
    ...drivers[2], id: "DRV-SOPHIA-01", name: "Sophia Zhang", route: "SLE-ZH-03",
    routeAssignments: [
      { name: "SLE-ZH-03", difficulty: "A" },
      { name: "SLE-ZH-04", difficulty: "B" },
    ],
    status: "2h 未派送", delivered: 190, pending: 10, exception: 10, total: 210,
    locationIssues: 0, podIssues: 2, fakeIssues: 0,
    efficiency: "16.4 件/h", activeHours: "7.5h", position: { left: "78%", top: "35%" }, coordinates: "40.71880, -73.98620",
  },
  {
    ...drivers[0], id: "DRV-LEO-01", name: "Leo Wang", route: "SLE-WA-01",
    routeAssignments: [
      { name: "SLE-WA-01" },
      { name: "SLE-WA-02" },
      { name: "SLE-WA-03" },
      { name: "SLE-WA-04" },
    ],
    status: "30min 未派送", delivered: 140, pending: 27, exception: 8, total: 175,
    locationIssues: 0, podIssues: 0, fakeIssues: 2,
    efficiency: "14.1 件/h", activeHours: "5.9h", position: { left: "33%", top: "43%" }, coordinates: "40.71120, -74.01710",
  },
]
