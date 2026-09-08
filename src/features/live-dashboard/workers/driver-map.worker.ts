import type {
  DriverCoordinate,
  DriverMapBounds,
  DriverMapFeature,
  DriverMapSummary,
  DriverMapWorkerRequest,
  DriverMapWorkerResponse,
} from "@/features/live-dashboard/driver-map-types"

const MAX_RENDERED_FEATURES = 300
const CLUSTER_THRESHOLD = 80
const BASE_CELL_SIZE = 56
const MIN_COORDINATE_SPAN = 0.002

let points: DriverCoordinate[] = []

function isValidPoint(point: DriverCoordinate) {
  return Number.isFinite(point.longitude)
    && Number.isFinite(point.latitude)
    && point.longitude >= -180
    && point.longitude <= 180
    && point.latitude >= -90
    && point.latitude <= 90
    && !(point.longitude === 0 && point.latitude === 0)
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((left, right) => left - right)
  const position = Math.min(Math.max(ratio, 0), 1) * (sorted.length - 1)
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  if (lowerIndex === upperIndex) return sorted[lowerIndex]
  const weight = position - lowerIndex
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight
}

function boundsFor(source: DriverCoordinate[]): DriverMapBounds | null {
  if (source.length === 0) return null

  let west = source[0].longitude
  let east = source[0].longitude
  let south = source[0].latitude
  let north = source[0].latitude

  for (const point of source) {
    west = Math.min(west, point.longitude)
    east = Math.max(east, point.longitude)
    south = Math.min(south, point.latitude)
    north = Math.max(north, point.latitude)
  }

  return expandBounds({ west, south, east, north })
}

function expandBounds(bounds: DriverMapBounds, paddingRatio = 0.12): DriverMapBounds {
  const longitudeSpan = Math.max(bounds.east - bounds.west, MIN_COORDINATE_SPAN)
  const latitudeSpan = Math.max(bounds.north - bounds.south, MIN_COORDINATE_SPAN)
  const longitudePadding = longitudeSpan * paddingRatio
  const latitudePadding = latitudeSpan * paddingRatio

  return {
    west: Math.max(-180, bounds.west - longitudePadding),
    south: Math.max(-90, bounds.south - latitudePadding),
    east: Math.min(180, bounds.east + longitudePadding),
    north: Math.min(90, bounds.north + latitudePadding),
  }
}

function calculateSummary(allPoints: DriverCoordinate[]): DriverMapSummary {
  if (allPoints.length === 0) {
    return {
      total: 0,
      validCount: 0,
      mainRangeCount: 0,
      outsideCount: 0,
      mainBounds: null,
      allBounds: null,
    }
  }

  const allBounds = boundsFor(allPoints)
  let mainBounds = allBounds

  if (allPoints.length > 20) {
    const longitudes = allPoints.map((point) => point.longitude)
    const latitudes = allPoints.map((point) => point.latitude)
    const targetCount = Math.round(allPoints.length * 0.8)
    let closestCandidate: { bounds: DriverMapBounds; count: number; area: number } | null = null

    for (let longitudeStep = 14; longitudeStep <= 20; longitudeStep += 1) {
      for (let latitudeStep = 14; latitudeStep <= 20; latitudeStep += 1) {
        const longitudeCoverage = longitudeStep / 20
        const latitudeCoverage = latitudeStep / 20
        const longitudeTail = (1 - longitudeCoverage) / 2
        const latitudeTail = (1 - latitudeCoverage) / 2
        const candidateBounds = {
          west: percentile(longitudes, longitudeTail),
          south: percentile(latitudes, latitudeTail),
          east: percentile(longitudes, 1 - longitudeTail),
          north: percentile(latitudes, 1 - latitudeTail),
        }
        const candidateCount = allPoints.filter((point) => includesPoint(candidateBounds, point)).length
        const area = (candidateBounds.east - candidateBounds.west)
          * (candidateBounds.north - candidateBounds.south)

        if (
          !closestCandidate
          || Math.abs(candidateCount - targetCount) < Math.abs(closestCandidate.count - targetCount)
          || (
            Math.abs(candidateCount - targetCount) === Math.abs(closestCandidate.count - targetCount)
            && area < closestCandidate.area
          )
        ) {
          closestCandidate = { bounds: candidateBounds, count: candidateCount, area }
        }
      }
    }

    mainBounds = closestCandidate?.bounds ?? allBounds
  }

  const mainRangeCount = mainBounds
    ? allPoints.filter((point) => includesPoint(mainBounds, point)).length
    : 0

  return {
    total: allPoints.length,
    validCount: allPoints.length,
    mainRangeCount,
    outsideCount: allPoints.length - mainRangeCount,
    mainBounds,
    allBounds,
  }
}

function includesPoint(bounds: DriverMapBounds, point: DriverCoordinate) {
  return point.longitude >= bounds.west
    && point.longitude <= bounds.east
    && point.latitude >= bounds.south
    && point.latitude <= bounds.north
}

function clusterVisiblePoints(
  visiblePoints: DriverCoordinate[],
  bounds: DriverMapBounds,
  width: number,
  height: number,
) {
  if (points.length <= CLUSTER_THRESHOLD || visiblePoints.length <= CLUSTER_THRESHOLD) {
    return visiblePoints.map<DriverMapFeature>((point) => ({
      kind: "driver",
      id: `driver-${point.id}`,
      driverId: point.id,
      longitude: point.longitude,
      latitude: point.latitude,
    }))
  }

  const longitudeSpan = Math.max(bounds.east - bounds.west, Number.EPSILON)
  const latitudeSpan = Math.max(bounds.north - bounds.south, Number.EPSILON)
  let cellSize = BASE_CELL_SIZE
  let features: DriverMapFeature[] = []

  do {
    const cells = new Map<string, DriverCoordinate[]>()
    for (const point of visiblePoints) {
      const x = ((point.longitude - bounds.west) / longitudeSpan) * width
      const y = ((bounds.north - point.latitude) / latitudeSpan) * height
      const key = `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`
      const cell = cells.get(key)
      if (cell) cell.push(point)
      else cells.set(key, [point])
    }

    features = [...cells.entries()].map<DriverMapFeature>(([key, cellPoints]) => {
      if (cellPoints.length === 1) {
        const point = cellPoints[0]
        return {
          kind: "driver",
          id: `driver-${point.id}`,
          driverId: point.id,
          longitude: point.longitude,
          latitude: point.latitude,
        }
      }

      const longitude = cellPoints.reduce((sum, point) => sum + point.longitude, 0) / cellPoints.length
      const latitude = cellPoints.reduce((sum, point) => sum + point.latitude, 0) / cellPoints.length
      return {
        kind: "cluster",
        id: `cluster-${key}-${cellPoints.length}`,
        count: cellPoints.length,
        longitude,
        latitude,
        bounds: boundsFor(cellPoints) ?? bounds,
      }
    })
    cellSize += 16
  } while (features.length > MAX_RENDERED_FEATURES)

  return features
}

function send(message: DriverMapWorkerResponse) {
  self.postMessage(message)
}

self.onmessage = (event: MessageEvent<DriverMapWorkerRequest>) => {
  const message = event.data

  if (message.type === "INITIALIZE") {
    points = message.points.filter(isValidPoint)
    send({ type: "INITIALIZED", summary: calculateSummary(points) })
    return
  }

  const visiblePoints = points.filter((point) => includesPoint(message.bounds, point))
  send({
    type: "RESULT",
    bounds: message.bounds,
    visibleCount: visiblePoints.length,
    features: clusterVisiblePoints(
      visiblePoints,
      message.bounds,
      Math.max(message.width, 1),
      Math.max(message.height, 1),
    ),
  })
}

export {}
