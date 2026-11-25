"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { LocateFixedIcon, Maximize2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  DriverMapBounds,
  DriverMapFeature,
  DriverMapSummary,
  DriverMapWorkerRequest,
  DriverMapWorkerResponse,
} from "@/features/live-dashboard/driver-map-types"
import type { DriverSnapshot } from "@/features/live-dashboard/mock-data"

type CanvasSize = { width: number; height: number }
type HitTarget = { feature: DriverMapFeature; x: number; y: number; radius: number }

function parseCoordinate(driver: DriverSnapshot) {
  const [latitude, longitude] = driver.coordinates
    .split(",")
    .map((value) => Number.parseFloat(value.trim()))

  return { id: driver.id, longitude, latitude }
}

function toCanvasPoint(feature: DriverMapFeature, bounds: DriverMapBounds, size: CanvasSize) {
  const longitudeSpan = Math.max(bounds.east - bounds.west, Number.EPSILON)
  const latitudeSpan = Math.max(bounds.north - bounds.south, Number.EPSILON)
  const inset = 14
  const drawableWidth = Math.max(size.width - inset * 2, 1)
  const drawableHeight = Math.max(size.height - inset * 2, 1)
  return {
    x: inset + ((feature.longitude - bounds.west) / longitudeSpan) * drawableWidth,
    y: inset + ((bounds.north - feature.latitude) / latitudeSpan) * drawableHeight,
  }
}

function cssToken(styles: CSSStyleDeclaration, token: string) {
  return styles.getPropertyValue(token).trim()
}

function drawDriverMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colors: { fill: string; foreground: string; border: string },
) {
  context.save()
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fillStyle = colors.fill
  context.fill()
  context.lineWidth = 2.5
  context.strokeStyle = colors.border
  context.stroke()

  context.fillStyle = colors.foreground
  context.beginPath()
  context.arc(x, y - radius * 0.28, radius * 0.24, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.roundRect(
    x - radius * 0.48,
    y + radius * 0.04,
    radius * 0.96,
    radius * 0.5,
    radius * 0.24,
  )
  context.fill()
  context.restore()
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  colors: { background: string; border: string; foreground: string },
) {
  context.save()
  context.font = "600 12px var(--font-sans)"
  const textWidth = Math.min(context.measureText(text).width, maxWidth - 24)
  const width = textWidth + 16
  const height = 24
  const left = Math.min(Math.max(x - width / 2, 8), maxWidth - width - 8)
  const top = Math.max(y - 36, 8)
  context.beginPath()
  context.roundRect(left, top, width, height, 6)
  context.fillStyle = colors.background
  context.fill()
  context.strokeStyle = colors.border
  context.stroke()
  context.fillStyle = colors.foreground
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(text, left + width / 2, top + height / 2, width - 12)
  context.restore()
}

export function DriverMapCanvas({
  drivers,
  selectedDriverId,
  onSelectDriver,
}: {
  drivers: DriverSnapshot[]
  selectedDriverId: string
  onSelectDriver: (driverId: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker>(null)
  const hitTargetsRef = useRef<HitTarget[]>([])
  const coordinates = useMemo(() => drivers.map(parseCoordinate), [drivers])
  const driverNames = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver.name])), [drivers])
  const [summary, setSummary] = useState<DriverMapSummary | null>(null)
  const [bounds, setBounds] = useState<DriverMapBounds | null>(null)
  const [features, setFeatures] = useState<DriverMapFeature[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 })
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null)
  const [viewportMode, setViewportMode] = useState<"main" | "all" | "cluster">("main")
  const hoveredCluster = useMemo(() => {
    if (!bounds || size.width === 0 || size.height === 0) return null
    const feature = features.find((item) => item.id === hoveredFeatureId)
    if (!feature || feature.kind !== "cluster") return null
    const point = toCanvasPoint(feature, bounds, size)
    return {
      count: feature.count,
      left: Math.min(Math.max(point.x, 64), Math.max(size.width - 64, 64)),
      top: Math.max(point.y - 18, 44),
    }
  }, [bounds, features, hoveredFeatureId, size])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width)
      const nextHeight = Math.round(entry.contentRect.height)
      setSize((current) => current.width === nextWidth && current.height === nextHeight
        ? current
        : { width: nextWidth, height: nextHeight })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const worker = new Worker(new URL("../workers/driver-map.worker.ts", import.meta.url), { type: "module" })
    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<DriverMapWorkerResponse>) => {
      const message = event.data
      if (message.type === "INITIALIZED") {
        setSummary(message.summary)
        setBounds(message.summary.mainBounds)
        setViewportMode("main")
        return
      }

      setFeatures(message.features)
      setVisibleCount(message.visibleCount)
    }

    const message: DriverMapWorkerRequest = { type: "INITIALIZE", points: coordinates }
    worker.postMessage(message)
    return () => {
      workerRef.current = null
      worker.terminate()
    }
  }, [coordinates])

  useEffect(() => {
    if (!bounds || size.width === 0 || size.height === 0) return
    const message: DriverMapWorkerRequest = {
      type: "QUERY",
      bounds,
      width: size.width,
      height: size.height,
    }
    workerRef.current?.postMessage(message)
  }, [bounds, size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bounds || size.width === 0 || size.height === 0) return

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(size.width * pixelRatio)
    canvas.height = Math.round(size.height * pixelRatio)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    const context = canvas.getContext("2d")
    if (!context) return

    context.scale(pixelRatio, pixelRatio)
    context.clearRect(0, 0, size.width, size.height)
    const styles = getComputedStyle(canvas)
    const colors = {
      dataAccent: cssToken(styles, "--data-accent"),
      background: cssToken(styles, "--card"),
      border: cssToken(styles, "--border"),
      foreground: cssToken(styles, "--card-foreground"),
      primary: cssToken(styles, "--primary"),
      primaryForeground: cssToken(styles, "--primary-foreground"),
    }
    const nextHitTargets: HitTarget[] = []

    for (const feature of features) {
      const point = toCanvasPoint(feature, bounds, size)
      const isHovered = feature.id === hoveredFeatureId

      if (feature.kind === "cluster") {
        const radius = Math.min(25, 14 + Math.log2(feature.count) * 2)
        context.beginPath()
        context.arc(point.x, point.y, radius + (isHovered ? 2 : 0), 0, Math.PI * 2)
        context.fillStyle = colors.primary
        context.fill()
        context.lineWidth = 3
        context.strokeStyle = colors.background
        context.stroke()
        context.fillStyle = colors.primaryForeground
        context.font = "700 12px var(--font-sans)"
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText(String(feature.count), point.x, point.y)
        nextHitTargets.push({ feature, ...point, radius: radius + 5 })
        continue
      }

      const isSelected = feature.driverId === selectedDriverId
      const radius = isSelected ? 11 : isHovered ? 10.5 : 9.5
      drawDriverMarker(context, point.x, point.y, radius, {
        fill: isSelected ? colors.primary : colors.dataAccent,
        foreground: colors.primaryForeground,
        border: colors.background,
      })
      nextHitTargets.push({ feature, ...point, radius: radius + 5 })

      if (isSelected) {
        drawLabel(
          context,
          driverNames.get(feature.driverId) ?? feature.driverId,
          point.x,
          point.y,
          size.width,
          colors,
        )
      }
    }

    hitTargetsRef.current = nextHitTargets
  }, [bounds, driverNames, features, hoveredFeatureId, selectedDriverId, size])

  function findHitTarget(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvasBounds = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - canvasBounds.left
    const y = event.clientY - canvasBounds.top
    return hitTargetsRef.current.find((target) => Math.hypot(target.x - x, target.y - y) <= target.radius)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const target = findHitTarget(event)
    setHoveredFeatureId(target?.feature.id ?? null)
    event.currentTarget.style.cursor = target ? "pointer" : "default"
  }

  function handleCanvasClick(event: React.PointerEvent<HTMLCanvasElement>) {
    const target = findHitTarget(event)
    if (!target) return

    if (target.feature.kind === "cluster") {
      setBounds(target.feature.bounds)
      setViewportMode("cluster")
      return
    }

    onSelectDriver(target.feature.driverId)
  }

  const accessibleDescription = summary?.validCount
    ? `司机地图，当前显示 ${visibleCount} 名，共 ${summary.validCount} 名有效司机`
    : "司机地图，暂无有效司机定位"

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        role="img"
        aria-label={accessibleDescription}
        onPointerMove={handlePointerMove}
        onPointerLeave={(event) => {
          setHoveredFeatureId(null)
          event.currentTarget.style.cursor = "default"
        }}
        onPointerUp={handleCanvasClick}
      />

      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-background/95 shadow-sm">
          当前显示 {visibleCount} / {summary?.validCount ?? 0}
        </Badge>
        {summary?.validCount ? (
          <Badge variant="outline" className="bg-background/95">
            {summary.validCount > 80 ? `聚合节点 ${features.length}` : `独立点位 ${features.length}`}
          </Badge>
        ) : null}
        {summary?.outsideCount ? (
          <Badge variant="outline" className="bg-background/95">
            主体范围外 {summary.outsideCount}
          </Badge>
        ) : null}
      </div>

      <div className="absolute top-3 right-3 flex gap-2">
        {viewportMode !== "main" && summary?.mainBounds ? (
          <Button variant="outline" size="xs" className="bg-background/95" onClick={() => {
            setBounds(summary.mainBounds)
            setViewportMode("main")
          }}>
            <LocateFixedIcon data-icon="inline-start" />返回主体范围
          </Button>
        ) : null}
        {viewportMode !== "all" && summary?.allBounds ? (
          <Button variant="outline" size="xs" className="bg-background/95" onClick={() => {
            setBounds(summary.allBounds)
            setViewportMode("all")
          }}>
            <Maximize2Icon data-icon="inline-start" />查看全部范围
          </Button>
        ) : null}
      </div>

      {hoveredCluster ? (
        <Badge
          role="tooltip"
          variant="secondary"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full bg-popover text-popover-foreground shadow-md"
          style={{ left: hoveredCluster.left, top: hoveredCluster.top }}
        >
          聚合司机 {hoveredCluster.count} 名
        </Badge>
      ) : null}
    </div>
  )
}
