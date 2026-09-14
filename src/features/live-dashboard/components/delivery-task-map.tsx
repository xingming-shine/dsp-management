"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import type { Map as MapLibreMap } from "maplibre-gl"
import { MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { driverCoordinate, waybillCoordinate, type Coordinate, type MonitorDriver, type MonitorWaybill, statusLabels } from "@/features/live-dashboard/driver-monitor-data"
import { DriverLocationBubble, DriverMapMarker } from "./driver-map-marker"

type MapModule = typeof import("maplibre-gl")
type MapRuntime = { map: MapLibreMap; library: MapModule }

function replayWaybillSelection(button: HTMLButtonElement) {
  // CSS owns the motion and reduced-motion preference. Replay only the short
  // selection accent on repeated clicks; leave the steady halo uninterrupted.
  for (const animation of button.getAnimations()) {
    if (animation instanceof CSSAnimation && animation.animationName === "delivery-waybill-select") {
      animation.currentTime = 0
      animation.play()
    }
  }
}

function MapMarker({ runtime, coordinate, children, selected }: { runtime: MapRuntime; coordinate: Coordinate; children: ReactNode; selected?: boolean }) {
  const [element] = useState(() => document.createElement("div"))
  const [longitude, latitude] = coordinate
  useEffect(() => {
    const marker = new runtime.library.Marker({ element, anchor: "bottom" }).setLngLat([longitude, latitude]).addTo(runtime.map)
    return () => { marker.remove() }
  }, [element, runtime, longitude, latitude])
  useEffect(() => { element.setAttribute("data-raised", String(Boolean(selected))) }, [element, selected])
  return createPortal(children, element)
}

function DriverPopup({ runtime, driver }: { runtime: MapRuntime; driver: MonitorDriver }) {
  const [element] = useState(() => document.createElement("div"))
  useEffect(() => {
    const point = driverCoordinate(driver)
    if (!point) return
    const popup = new runtime.library.Popup({
      closeButton: false, closeOnClick: false, focusAfterOpen: false,
      offset: { center: [0, 0], top: [0, 8], bottom: [0, -64], left: [24, -28], right: [-24, -28], "top-left": [0, 8], "top-right": [0, 8], "bottom-left": [0, -64], "bottom-right": [0, -64] },
      maxWidth: "256px", className: "delivery-driver-popup",
    })
      .setLngLat(point).setDOMContent(element).addTo(runtime.map)

    // MapLibre chooses the arrow's anchor; pan only if the bubble is still clipped.
    function keepPopupVisible() {
      if (runtime.map.isMoving()) return
      const bounds = runtime.map.getContainer().getBoundingClientRect()
      const bubble = element.getBoundingClientRect()
      const left = Math.max(bounds.left, 0) + 16
      const right = Math.min(bounds.right, window.innerWidth) - 16
      // Reserve space for the floating map toolbar and legend/attribution.
      const top = Math.max(bounds.top + 64, 0) + 16
      const bottom = Math.min(bounds.bottom - 80, window.innerHeight) - 16
      if (right - left < bubble.width || bottom - top < bubble.height) return
      const dx = bubble.left < left ? bubble.left - left : bubble.right > right ? bubble.right - right : 0
      const dy = bubble.top < top ? bubble.top - top : bubble.bottom > bottom ? bubble.bottom - bottom : 0
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) runtime.map.panBy([dx, dy], { duration: 200 })
    }
    const timer = window.setTimeout(keepPopupVisible, 0)
    runtime.map.on("moveend", keepPopupVisible)
    runtime.map.on("resize", keepPopupVisible)
    return () => {
      window.clearTimeout(timer)
      runtime.map.off("moveend", keepPopupVisible)
      runtime.map.off("resize", keepPopupVisible)
      popup.remove()
    }
  }, [runtime, driver, element])
  return createPortal(<DriverLocationBubble driver={driver} />, element)
}

export function DeliveryTaskMap({ drivers, waybills, showWaybills, onShowWaybills, selectedId, focusRequest, onSelect }: {
  drivers: MonitorDriver[]
  waybills: MonitorWaybill[]
  showWaybills: boolean
  onShowWaybills: (show: boolean) => void
  selectedId: string | null
  focusRequest: { id: string; revision: number } | null
  onSelect: (id: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const [runtime, setRuntime] = useState<MapRuntime | null>(null)
  const [mapError, setMapError] = useState("")
  const [retry, setRetry] = useState(0)
  const [popupDriverId, setPopupDriverId] = useState<string | null>(null)
  const [showDrivers, setShowDrivers] = useState(true)
  const singleDriver = drivers.length === 1
  const popupDriver = drivers.find((driver) => driver.id === popupDriverId)
  const visiblePoints = useMemo(() => [
    ...(showDrivers ? drivers.map(driverCoordinate) : []),
    ...(showWaybills && singleDriver ? waybills.map(waybillCoordinate) : []),
  ].filter((point): point is Coordinate => point !== null), [showDrivers, drivers, showWaybills, singleDriver, waybills])

  const fitVisibleMarkers = useCallback(() => {
    if (!runtime || !visiblePoints.length) return
    const bounds = new runtime.library.LngLatBounds(visiblePoints[0], visiblePoints[0])
    visiblePoints.forEach((point) => bounds.extend(point))
    runtime.map.fitBounds(bounds, { padding: { top: 90, bottom: 110, left: 50, right: 50 }, maxZoom: 14.5, duration: 500 })
  }, [runtime, visiblePoints])

  useEffect(() => {
    let disposed = false
    let map: MapLibreMap | undefined
    let observer: ResizeObserver | undefined
    import("maplibre-gl").then((library) => {
      if (disposed || !container.current) return
      library.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs")
      map = new library.Map({
        container: container.current, center: [-74.003, 40.717], zoom: 12.5, maxZoom: 19, minZoom: 2,
        attributionControl: { compact: true },
        // Low-contrast streets and sparse labels keep delivery markers in focus.
        // The style supplies the OpenFreeMap / OpenMapTiles / OSM attribution.
        style: "https://tiles.openfreemap.org/styles/positron",
      })
      map.once("style.load", () => {
        if (disposed || !map || !container.current) return
        const tokens = getComputedStyle(container.current)
        const palette = [
          ["background", "background-color", "land"],
          ["landuse_residential", "fill-color", "land"],
          ["park", "fill-color", "park"],
          ["landcover_wood", "fill-color", "park"],
          ["water", "fill-color", "water"],
          ["waterway", "line-color", "water"],
          ["building", "fill-color", "building"],
          ["building", "fill-outline-color", "outline"],
          ["road_area_pier", "fill-color", "land"],
          ["road_pier", "line-color", "land"],
        ] as const
        for (const [layer, property, token] of palette) {
          if (map.getLayer(layer)) map.setPaintProperty(layer, property, tokens.getPropertyValue(`--monitor-map-${token}`).trim())
        }
      })
      setRuntime({ map, library })
      setMapError("")
      map.on("error", () => { if (!disposed) setMapError("底图加载失败，请检查网络后重试。坐标标记仍可查看。") })
      map.on("idle", () => { if (!disposed && map?.isStyleLoaded() && map.areTilesLoaded()) setMapError("") })
      observer = new ResizeObserver(() => map?.resize())
      observer.observe(container.current)
    }).catch(() => { if (!disposed) setMapError("地图无法初始化，请重试或使用支持 WebGL 的浏览器。") })
    return () => { disposed = true; observer?.disconnect(); map?.remove() }
  }, [retry])

  const fittedScope = useRef<{ map: MapLibreMap; key: string } | null>(null)
  useEffect(() => {
    if (!runtime) return
    const key = JSON.stringify([drivers.map((driver) => driver.id), showDrivers, showWaybills])
    // Query results update markers without resetting the user's map viewport.
    if (fittedScope.current?.map === runtime.map && fittedScope.current.key === key) return
    fitVisibleMarkers()
    fittedScope.current = { map: runtime.map, key }
  }, [runtime, drivers, showDrivers, showWaybills, fitVisibleMarkers])

  useEffect(() => {
    if (!runtime || !showWaybills || !singleDriver || !focusRequest) return
    const row = waybills.find((item) => item.id === focusRequest.id)
    const point = row && waybillCoordinate(row)
    if (point) runtime.map.flyTo({ center: point, zoom: 16, duration: 600 })
  }, [runtime, focusRequest, showWaybills, singleDriver, waybills])

  function toggleDrivers(show: boolean) {
    setShowDrivers(show)
    if (!show) setPopupDriverId(null)
  }

  return <section className="relative isolate h-full min-h-80 overflow-hidden rounded-lg border bg-muted" aria-label="派送任务地图">
      <div ref={container} style={{ position: "absolute", inset: 0 }} aria-label="可拖动缩放的派送地图" />
      {!runtime && !mapError && <Skeleton className="absolute inset-0 rounded-none" />}
      <FieldGroup className="pointer-events-none absolute top-3 right-3 left-3 z-20 w-auto flex-row flex-wrap items-start justify-between gap-2" aria-label="地图操作">
        <Field orientation="horizontal" className="delivery-map-layer-control pointer-events-auto w-auto px-3 py-2">
          <FieldLabel className="text-xs font-normal" htmlFor="monitor-show-drivers">司机最新位置</FieldLabel>
          <Switch id="monitor-show-drivers" checked={showDrivers} onCheckedChange={toggleDrivers} />
        </Field>
        <Field orientation="horizontal" className="delivery-map-layer-control pointer-events-auto w-auto px-3 py-2">
          <FieldLabel className="text-xs font-normal" htmlFor="monitor-show-waybills">显示运单</FieldLabel>
          <Switch id="monitor-show-waybills" checked={showWaybills && singleDriver} onCheckedChange={onShowWaybills} />
        </Field>
      </FieldGroup>
      {mapError && <Alert className="absolute top-16 right-3 left-3 z-20 w-auto"><AlertDescription className="flex items-center justify-between gap-2">{mapError}<Button variant="outline" size="xs" onClick={() => { setRuntime(null); setRetry((value) => value + 1) }}>重试</Button></AlertDescription></Alert>}
      {runtime && showDrivers && drivers.map((driver) => {
        const point = driverCoordinate(driver)
        const selected = popupDriverId === driver.id
        return point ? <MapMarker key={driver.id} runtime={runtime} coordinate={point} selected={selected}>
          <DriverMapMarker driver={driver} selected={selected} onSelect={() => {
            setPopupDriverId(selected ? null : driver.id)
            if (!selected) runtime.map.flyTo({ center: point, zoom: Math.max(runtime.map.getZoom(), 14), duration: 500 })
          }} />
        </MapMarker> : null
      })}
      {runtime && singleDriver && showWaybills && waybills.map((row) => {
        const point = waybillCoordinate(row)
        const number = row.deliveryNumber.replace(/^B/, "")
        return point ? <MapMarker key={row.id} runtime={runtime} coordinate={point} selected={row.id === selectedId}><button type="button" className="delivery-waybill-marker" data-status={row.status} data-selected={row.id === selectedId} aria-label={`编号 ${number} ${statusLabels[row.status]} ${row.id}${row.status === "nonstandard_return" ? "，标记位置为收件地址" : ""}`} aria-pressed={row.id === selectedId} title={`${row.id} · ${statusLabels[row.status]}${row.status === "nonstandard_return" || (!row.collectedPosition && row.status !== "pending") ? " · 标记位置：收件地址" : ""}`} onClick={(event) => { replayWaybillSelection(event.currentTarget); onSelect(row.id) }}>
          <span>{number}</span>
          <span className="delivery-waybill-ground-shadow" aria-hidden="true" />
          <svg className="delivery-waybill-pin" viewBox="0 0 32 44" aria-hidden="true">
            <path d="M16 1a15 15 0 0 0-15 15c0 5.4 2.8 9.4 6.3 13.6C11 34 14 38.2 16 43c2-4.8 5-9 8.7-13.4C28.2 25.4 31 21.4 31 16A15 15 0 0 0 16 1Z" />
          </svg>
          {row.alerts.length > 0 && <span className="delivery-marker-alert" aria-label="有异常警报">!</span>}
        </button></MapMarker> : null
      })}
      {runtime && showDrivers && popupDriver && <DriverPopup runtime={runtime} driver={popupDriver} />}
      <div className="absolute right-3 bottom-16 z-20 flex flex-col gap-1 sm:bottom-10">
        <Button variant="outline" size="icon-sm" aria-label="地图放大" disabled={!runtime} onClick={() => runtime?.map.zoomIn()}><PlusIcon /></Button>
        <Button variant="outline" size="icon-sm" aria-label="地图缩小" disabled={!runtime} onClick={() => runtime?.map.zoomOut()}><MinusIcon /></Button>
        <Button variant="outline" size="icon-sm" aria-label="地图复位" disabled={!runtime || !visiblePoints.length} onClick={fitVisibleMarkers}><RotateCcwIcon /></Button>
      </div>
      <div className="pointer-events-none absolute bottom-14 left-3 z-20 flex max-w-[calc(100%-4.5rem)] flex-col gap-1.5 rounded-lg bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-sm sm:bottom-8" aria-label="地图图例">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {Object.entries(statusLabels).map(([status, label]) => <span key={status} className="flex items-center gap-1.5"><i className="delivery-status-dot" data-status={status} />{label}</span>)}
        </div>
      </div>
  </section>
}
