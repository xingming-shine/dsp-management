"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent as ReactFocusEvent, type PointerEvent as ReactPointerEvent } from "react"
import { LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { DriverSnapshot } from "@/features/live-dashboard/mock-data"
import { DriverLocationBubble, DriverMapMarker } from "./driver-map-marker"
import { cn } from "@/lib/utils"

type MapPoint = {
  driver: DriverSnapshot
  x: number
  y: number
}

type MapView = {
  zoom: number
  x: number
  y: number
}

const MIN_ZOOM = 1
const MAX_ZOOM = 2
const ZOOM_STEP = 0.25

function clampView(view: MapView, width: number, height: number): MapView {
  return {
    zoom: view.zoom,
    x: Math.min(width / 2, Math.max(width * (0.5 - view.zoom), view.x)),
    y: Math.min(height / 2, Math.max(height * (0.5 - view.zoom), view.y)),
  }
}

function parseCoordinate(driver: DriverSnapshot) {
  const [latitude, longitude] = driver.coordinates
    .split(",")
    .map((value) => Number.parseFloat(value.trim()))

  return { latitude, longitude }
}

function createMapPoints(drivers: DriverSnapshot[]) {
  const coordinates = drivers.map((driver) => ({ driver, ...parseCoordinate(driver) }))
  const valid = coordinates.filter(({ latitude, longitude }) => Number.isFinite(latitude) && Number.isFinite(longitude))
  if (valid.length === 0) return []

  const latitudes = valid.map(({ latitude }) => latitude)
  const longitudes = valid.map(({ longitude }) => longitude)
  const north = Math.max(...latitudes)
  const south = Math.min(...latitudes)
  const east = Math.max(...longitudes)
  const west = Math.min(...longitudes)
  const latitudeSpan = Math.max(north - south, 0.008)
  const longitudeSpan = Math.max(east - west, 0.01)

  return valid.map(({ driver, latitude, longitude }): MapPoint => ({
    driver,
    x: 8 + ((longitude - west) / longitudeSpan) * 84,
    y: 8 + ((north - latitude) / latitudeSpan) * 84,
  }))
}

export function DriverLiveMap({
  drivers,
  selectedDriverId,
  onSelectDriver,
}: {
  drivers: DriverSnapshot[]
  selectedDriverId: string | null
  onSelectDriver: (driverId: string | null) => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const suppressDriverClickRef = useRef(false)
  const [view, setView] = useState<MapView>({ zoom: MIN_ZOOM, x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isMapActive, setIsMapActive] = useState(false)
  const points = useMemo(() => createMapPoints(drivers), [drivers])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !selectedDriverId) return

    function keepPopupVisible() {
      const popup = popupRef.current
      if (!viewport || !popup || dragRef.current) return
      const bounds = viewport.getBoundingClientRect()
      const bubble = popup.getBoundingClientRect()
      const margin = 16
      const left = Math.max(bounds.left, 0) + margin
      const right = Math.min(bounds.right, window.innerWidth) - margin
      let visibleTop = Math.max(bounds.top, 0)
      // Account for the sticky app header and pinned dashboard metrics.
      for (let pass = 0; pass < 4; pass++) {
        let element = document.elementFromPoint((left + right) / 2, visibleTop + 1)
        let nextTop = visibleTop
        while (element && !element.contains(viewport)) {
          const position = window.getComputedStyle(element).position
          if (position === "fixed" || position === "sticky") {
            const rect = element.getBoundingClientRect()
            if (rect.top <= visibleTop + 1) nextTop = Math.max(nextTop, rect.bottom)
          }
          element = element.parentElement
        }
        if (nextTop === visibleTop) break
        visibleTop = nextTop
      }
      const top = visibleTop + margin
      const bottom = Math.min(bounds.bottom, window.innerHeight) - margin
      if (right <= left || bottom <= top) return
      const dx = bubble.left < left ? left - bubble.left : bubble.right > right ? right - bubble.right : 0
      const dy = bubble.top < top ? top - bubble.top : bubble.bottom > bottom ? bottom - bubble.bottom : 0
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      setView((current) => clampView({ ...current, x: current.x + dx, y: current.y + dy }, bounds.width, bounds.height))
    }

    // Measure after marker movement finishes so the correction uses its final position.
    const timer = window.setTimeout(keepPopupVisible, 350)
    const observer = new ResizeObserver(keepPopupVisible)
    observer.observe(viewport)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [selectedDriverId, points])

  useEffect(() => {
    if (!isMapActive) return

    function handleOutsidePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !viewportRef.current?.contains(event.target)) {
        setIsMapActive(false)
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown)
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown)
  }, [isMapActive])

  const updateZoom = useCallback((zoomDelta: number, clientX?: number, clientY?: number) => {
    const viewport = viewportRef.current
    if (!viewport) return

    const bounds = viewport.getBoundingClientRect()
    const focalX = clientX === undefined ? bounds.width / 2 : clientX - bounds.left
    const focalY = clientY === undefined ? bounds.height / 2 : clientY - bounds.top

    setView((current) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom + zoomDelta))
      if (zoom === current.zoom) return current

      const ratio = zoom / current.zoom
      return clampView(
        {
          zoom,
          x: focalX - (focalX - current.x) * ratio,
          y: focalY - (focalY - current.y) * ratio,
        },
        bounds.width,
        bounds.height,
      )
    })
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !isMapActive) return

    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      updateZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, event.clientX, event.clientY)
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", handleWheel)
  }, [isMapActive, updateZoom])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest("[data-map-controls]")) return

    setIsMapActive(true)
    event.currentTarget.focus({ preventScroll: true })

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false,
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const viewport = viewportRef.current
    if (!drag || drag.pointerId !== event.pointerId || !viewport) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 4) return

    if (!drag.moved) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    drag.moved = true
    setIsDragging(true)
    const bounds = viewport.getBoundingClientRect()
    setView((current) => clampView({ ...current, x: drag.originX + deltaX, y: drag.originY + deltaY }, bounds.width, bounds.height))
  }

  function finishPointerInteraction(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.moved) {
      suppressDriverClickRef.current = true
      window.setTimeout(() => {
        suppressDriverClickRef.current = false
      }, 0)
    }
    dragRef.current = null
    setIsDragging(false)
  }

  function resetView() {
    setView({ zoom: MIN_ZOOM, x: 0, y: 0 })
  }

  function handleBlur(event: ReactFocusEvent<HTMLDivElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    setIsMapActive(false)
  }

  return (
    <div
      ref={viewportRef}
      tabIndex={0}
      className={cn(
        "absolute inset-0 touch-none select-none overflow-hidden bg-muted/30 outline-none transition-shadow",
        isMapActive && "touch-none ring-1 ring-inset ring-ring",
        isMapActive ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
      )}
      aria-label={`司机实时位置地图，共 ${drivers.length} 名司机`}
      aria-description="点击激活地图后，可使用鼠标滚轮缩放并拖动画布"
      onFocus={() => setIsMapActive(true)}
      onBlur={handleBlur}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerInteraction}
      onPointerCancel={finishPointerInteraction}
    >
      <div
        className={cn("pointer-events-none absolute inset-0", !isDragging && "transition-[background-position,background-size] duration-200")}
        style={{
          backgroundImage: "url('/assets/live-dashboard/driver-map-background.png')",
          backgroundSize: `${view.zoom * 100}% ${view.zoom * 100}%`,
          backgroundPosition: `${view.x}px ${view.y}px`,
          backgroundRepeat: "repeat",
        }}
      />

      {points.map(({ driver, x, y }) => {
        const selected = driver.id === selectedDriverId
        return (
          <div
            key={driver.id}
            className={cn("absolute z-10 -translate-x-1/2 -translate-y-1/2", !isDragging && "transition-[left,top] duration-200", selected && "z-20")}
            style={{
              left: `calc(${x * view.zoom}% + ${view.x}px)`,
              top: `calc(${y * view.zoom}% + ${view.y}px)`,
            }}
          >
            {selected ? (
              <DriverLocationBubble driver={driver} ref={popupRef} className={cn("pointer-events-none absolute left-1/2 -translate-x-1/2", y < 38 ? "top-[calc(100%+0.5rem)]" : "bottom-[calc(100%+0.5rem)]")}>
                <span className={cn("absolute left-1/2 size-3 -translate-x-1/2 rotate-45 bg-popover", y < 38 ? "bottom-full translate-y-1/2" : "top-full -translate-y-1/2")} />
              </DriverLocationBubble>
            ) : null}
            <DriverMapMarker
              driver={driver}
              selected={selected}
              onSelect={() => {
                if (suppressDriverClickRef.current) return
                onSelectDriver(selected ? null : driver.id)
              }}
            />
          </div>
        )
      })}

      <div data-map-controls className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-card/95 p-1 shadow-sm">
        <Button variant="ghost" size="icon-sm" aria-label="缩小地图" disabled={view.zoom <= MIN_ZOOM} onClick={() => updateZoom(-ZOOM_STEP)}><MinusIcon /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="放大地图" disabled={view.zoom >= MAX_ZOOM} onClick={() => updateZoom(ZOOM_STEP)}><PlusIcon /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="恢复地图初始视野" disabled={view.zoom === MIN_ZOOM && view.x === 0 && view.y === 0} onClick={resetView}><LocateFixedIcon /></Button>
      </div>

      {points.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">暂无有效司机定位</div>
      ) : null}
    </div>
  )
}
