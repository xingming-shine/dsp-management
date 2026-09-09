"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataPagination } from "@/components/ui/pagination"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { MonitorWaybillCard, MonitorWaybillOverlay } from "./monitor-waybill-card"
import { PodDetailSheet } from "./pod-detail-sheet"
import { QueryFilterLayout } from "./query-filter-layout"
import { monitorDrivers, type MonitorWaybill } from "../driver-monitor-data"
import { getDemoPodRecord, type PodPhoto } from "../pod-demo-data"

import { deliveryAlertRows, type DeliveryAlertMetric } from "../delivery-alert-data"

const initialFilters = { driver: "all", number: "" }

function PodThumbnail({ photo, onOpen }: { photo: PodPhoto; onOpen: () => void }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading")
  return <button type="button" aria-label={`查看 POD：${photo.label}`} onClick={onOpen} className="relative flex aspect-square w-full min-w-0 items-center justify-center overflow-hidden rounded-md border bg-muted outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring">
    {state === "loading" && <Skeleton className="absolute inset-0" />}
    {state === "failed" ? <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="size-5" />加载失败</span> : <Image src={photo.url} alt={photo.label} unoptimized width={96} height={96} className="size-full object-cover" onLoad={() => setState("ready")} onError={() => setState("failed")} />}
  </button>
}

export function DeliveryAlertList({ metric }: { metric: DeliveryAlertMetric }) {
  const rows = deliveryAlertRows[metric]
  const drivers = monitorDrivers.filter((driver) => rows.some((row) => row.driverId === driver.id))
  const [draft, setDraft] = useState(initialFilters)
  const [query, setQuery] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [addresses, setAddresses] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string[]>([])
  const requests = useRef(new Map<string, AbortController>())
  const top = useRef<HTMLDivElement>(null)
  const [dialog, setDialog] = useState<{ row: MonitorWaybill; type: "details" | "pod"; photoId?: string } | null>(null)
  useEffect(() => { const pending = requests.current; return () => pending.forEach((controller) => controller.abort()) }, [])
  const filtered = rows.filter((row) => (query.driver === "all" || row.driverId === query.driver) && row.id.toLowerCase().includes(query.number.toLowerCase()))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  function changePage(value: number) { setPage(value); top.current?.scrollIntoView({ block: "start" }) }
  async function toggleAddress(id: string) {
    if (addresses[id]) { setAddresses((current) => { const next = { ...current }; delete next[id]; return next }); return }
    if (requests.current.has(id)) return
    const controller = new AbortController()
    requests.current.set(id, controller)
    setBusy((items) => [...items, id])
    try {
      const response = await fetch(`/api/live-dashboard/waybills/${encodeURIComponent(id)}/address`, { signal: controller.signal, cache: "no-store" })
      if (!response.ok) throw new Error("Address unavailable")
      const result = await response.json()
      if (typeof result.address !== "string" || !result.address.trim()) throw new Error("Invalid address")
      if (!controller.signal.aborted) setAddresses((current) => ({ ...current, [id]: result.address }))
    } catch { if (!controller.signal.aborted) toast.error("地址加载失败，请重试") }
    finally { requests.current.delete(id); if (!controller.signal.aborted) setBusy((items) => items.filter((item) => item !== id)) }
  }
  return <div ref={top} className="flex min-w-0 scroll-mt-20 flex-col gap-4">
    <form className="py-4" onSubmit={(event) => { event.preventDefault(); setQuery({ ...draft, number: draft.number.trim() }); setPage(1) }}>
      <QueryFilterLayout
        fieldCount={2}
        fields={<>
          <Field><FieldLabel htmlFor="pod-driver">司机</FieldLabel><Select value={draft.driver} onValueChange={(driver) => setDraft((current) => ({ ...current, driver }))}><SelectTrigger id="pod-driver" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部司机</SelectItem>{drivers.map((driver) => <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="pod-number">运单编号</FieldLabel><Input id="pod-number" placeholder="输入运单编号" maxLength={100} value={draft.number} onChange={(event) => setDraft((current) => ({ ...current, number: event.target.value }))} /></Field>
        </>}
        actions={<><Button type="submit">查询</Button><Button type="button" variant="outline" onClick={() => { setDraft(initialFilters); setQuery(initialFilters); setPage(1) }}>重置</Button></>}
      />
    </form>
    <div className="flex flex-col gap-3" aria-label={metric === "pod" ? "POD 不合规运单列表" : "妥投位置异常运单列表"}>
      {visible.length ? visible.map((row) => <div key={row.id}>
        <MonitorWaybillCard row={row} driver={monitorDrivers.find((driver) => driver.id === row.driverId)!} layout="list" selected={false} address={addresses[row.id]} addressLoading={busy.includes(row.id)} onAddress={() => void toggleAddress(row.id)} onSelect={() => {}} onDetail={() => setDialog({ row, type: "details" })} onPod={() => setDialog({ row, type: "pod" })} media={<div className="grid max-w-full grid-cols-[repeat(5,80px)] gap-2 self-end overflow-x-auto lg:w-[432px] lg:shrink-0 xl:w-[512px] xl:grid-cols-[repeat(5,96px)]" aria-label={`${row.id} POD 图片，最多五张`}>{Array.from({ length: 5 }, (_, index) => {
          const photo = getDemoPodRecord(row).photos[index]
          return photo ? <PodThumbnail key={photo.id} photo={photo} onOpen={() => setDialog({ row, type: "pod", photoId: photo.id })} /> : <div key={`empty-${index}`} className="flex aspect-square min-w-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground" aria-label={`第 ${index + 1} 张暂无照片`}><ImageIcon className="size-4 opacity-40" /></div>
        })}</div>} />
      </div>) : <Empty><EmptyHeader><EmptyTitle>暂无匹配运单</EmptyTitle><EmptyDescription>请调整司机或运单编号后重新查询。</EmptyDescription></EmptyHeader></Empty>}
    </div>
    <DataPagination className="border-t-0 px-0" page={page} pageSize={pageSize} total={filtered.length} onPageChange={changePage} onPageSizeChange={setPageSize} />
    {dialog?.type === "pod" ? <PodDetailSheet key={`${dialog.row.id}-${dialog.photoId ?? "default"}`} row={dialog.row} initialPhotoId={dialog.photoId} address={addresses[dialog.row.id]} onClose={() => setDialog(null)} /> : <MonitorWaybillOverlay row={dialog?.row ?? null} driver={monitorDrivers.find((driver) => driver.id === dialog?.row.driverId)} initialTab="details" onClose={() => setDialog(null)} />}
  </div>
}
