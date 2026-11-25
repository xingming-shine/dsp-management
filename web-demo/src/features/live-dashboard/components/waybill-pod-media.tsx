"use client"

import Image from "next/image"
import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getDemoPodRecord, type PodPhoto } from "../pod-demo-data"
import type { MonitorWaybill } from "../driver-monitor-data"

function PodThumbnail({ photo, onOpen }: { photo: PodPhoto; onOpen: () => void }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading")
  return <button type="button" aria-label={`查看 POD：${photo.label}`} onClick={onOpen} className="relative flex aspect-square w-full min-w-0 items-center justify-center overflow-hidden rounded-md border bg-muted outline-none hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring">
    {state === "loading" && <Skeleton className="absolute inset-0" />}
    {state === "failed" ? <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="size-5" />加载失败</span> : <Image src={photo.url} alt={photo.label} unoptimized width={96} height={96} className="size-full object-cover" onLoad={() => setState("ready")} onError={() => setState("failed")} />}
  </button>
}


export function WaybillPodMedia({ row, onOpen }: { row: MonitorWaybill; onOpen: (photoId: string) => void }) {
  if (row.status !== "delivered") return null
  const photos = getDemoPodRecord(row).photos
  if (!photos.length) return <div className="flex h-20 items-center gap-2 text-xs text-muted-foreground" aria-label={`${row.id} 暂无 POD`}><ImageIcon className="size-4" />暂无 POD</div>
  return <div className="grid w-full min-w-0 max-w-lg shrink-0 grid-cols-5 gap-2 self-start @min-[600px]:w-[45%] @min-[600px]:self-center" aria-label={`${row.id} POD 图片，最多五张`}>
    {Array.from({ length: 5 }, (_, index) => {
      const photo = photos[index]
      return photo ? <PodThumbnail key={photo.id} photo={photo} onOpen={() => onOpen(photo.id)} /> : <div key={`empty-${index}`} className="flex aspect-square min-w-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground" aria-label={`第 ${index + 1} 张暂无照片`}><ImageIcon className="size-4 opacity-40" /></div>
    })}
  </div>
}
