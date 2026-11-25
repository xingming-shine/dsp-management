export type DriverCoordinate = {
  id: string
  longitude: number
  latitude: number
}

export type DriverMapBounds = {
  west: number
  south: number
  east: number
  north: number
}

export type DriverMapFeature =
  | {
      kind: "driver"
      id: string
      driverId: string
      longitude: number
      latitude: number
    }
  | {
      kind: "cluster"
      id: string
      count: number
      longitude: number
      latitude: number
      bounds: DriverMapBounds
    }

export type DriverMapSummary = {
  total: number
  validCount: number
  mainRangeCount: number
  outsideCount: number
  mainBounds: DriverMapBounds | null
  allBounds: DriverMapBounds | null
}

export type DriverMapWorkerRequest =
  | { type: "INITIALIZE"; points: DriverCoordinate[] }
  | { type: "QUERY"; bounds: DriverMapBounds; width: number; height: number }

export type DriverMapWorkerResponse =
  | { type: "INITIALIZED"; summary: DriverMapSummary }
  | {
      type: "RESULT"
      bounds: DriverMapBounds
      visibleCount: number
      features: DriverMapFeature[]
    }

