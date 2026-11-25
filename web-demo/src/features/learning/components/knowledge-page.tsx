"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BookOpenIcon, SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataPagination } from "@/components/ui/pagination"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { useTimezone } from "@/features/preferences/timezone-store"
import { learningCategories, learningItems, learningTags, type LearningStatus } from "../data"
import { useLearningState } from "../store"
import { getItemMinutes, getItemStatus, LearningProgress, LearningStatusBadge, LearningThumbnail } from "./learning-shared"
import { LearningContentDetail } from "./learning-content-detail"

const PAGE_SIZE = 12

export function KnowledgePage({ initialItem }: { initialItem?: string }) {
  const { state } = useLearningState()
  const timeZone = useTimezone()
  const [category, setCategory] = useState("全部")
  const [tag, setTag] = useState("全部标签")
  const [status, setStatus] = useState<LearningStatus | "全部">("全部")
  const [requiredOnly, setRequiredOnly] = useState(false)
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [page, setPage] = useState(() => Math.floor(Math.max(0, learningItems.findIndex((item) => item.id === initialItem)) / PAGE_SIZE) + 1)
  const [expandedId, setExpandedId] = useState<string | null>(initialItem ?? null)
  const listViewportRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => learningItems.filter((item) => {
    if (category !== "全部" && item.category !== category) return false
    if (tag !== "全部标签" && !item.tags.includes(tag)) return false
    if (status !== "全部" && getItemStatus(item, state) !== status) return false
    if (requiredOnly && !item.required) return false
    if (search && !item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())) return false
    return true
  }), [category, tag, status, requiredOnly, search, state])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const expandedItem = expandedId ? filtered.find((item) => item.id === expandedId) ?? null : null

  useEffect(() => {
    if (!initialItem) return
    const frame = window.requestAnimationFrame(() => document.getElementById(`knowledge-${initialItem}`)?.scrollIntoView({ block: "start" }))
    return () => window.cancelAnimationFrame(frame)
  }, [initialItem])

  useEffect(() => {
    if (!expandedId) return
    const frame = window.requestAnimationFrame(() => {
      const viewport = listViewportRef.current
      const selectedCard = viewport?.querySelector<HTMLElement>(`[data-knowledge-item="${expandedId}"]`)
      if (!viewport || !selectedCard) return
      const viewportRect = viewport.getBoundingClientRect()
      const cardRect = selectedCard.getBoundingClientRect()
      if (cardRect.top < viewportRect.top) viewport.scrollTop -= viewportRect.top - cardRect.top
      if (cardRect.bottom > viewportRect.bottom) viewport.scrollTop += cardRect.bottom - viewportRect.bottom
    })
    return () => window.cancelAnimationFrame(frame)
  }, [expandedId])

  function updateFilter(action: () => void) {
    action()
    setPage(1)
    setExpandedId(null)
  }

  function collapseExpandedItem() {
    if (expandedItem) setPage(Math.floor(filtered.indexOf(expandedItem) / pageSize) + 1)
    setExpandedId(null)
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Tabs value={category} onValueChange={(value) => updateFilter(() => setCategory(value))} className="min-w-0">
            <div className="w-full overflow-x-auto pb-2">
              <TabsList variant="line" className="min-w-max justify-start">
                {learningCategories.map((value) => <TabsTrigger key={value} value={value}>{value}</TabsTrigger>)}
              </TabsList>
            </div>
          </Tabs>
        </div>
        <LearningProgress state={state} />
      </header>

      <div className="flex flex-col gap-5 rounded-xl border bg-card p-4 md:p-5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1">
            {["全部标签", ...learningTags].map((value) => <Button key={value} type="button" size="sm" variant="outline" aria-pressed={tag === value} className={cn("shrink-0", tag === value && "bg-brand-selected text-brand-ink")} onClick={() => updateFilter(() => setTag(value))}>{value === "全部标签" ? value : `#${value}`}</Button>)}
          </div>
          <form className="w-full shrink-0 lg:w-80" onSubmit={(event) => { event.preventDefault(); updateFilter(() => setSearch(searchDraft.trim())) }} role="search" aria-label="按标题模糊查询">
            <Field>
              <FieldLabel htmlFor="knowledge-title-query" className="sr-only">按标题模糊查询</FieldLabel>
              <Input id="knowledge-title-query" type="search" placeholder="输入标题关键词，按回车查询" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} />
            </Field>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["全部", "待学习", "学习中", "已完成"] as const).map((value) => <Button key={value} type="button" size="sm" variant="outline" aria-pressed={status === value} className={cn(status === value && "bg-brand-selected text-brand-ink")} onClick={() => updateFilter(() => setStatus(value))}>{value}</Button>)}
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="knowledge-required-only" className="font-normal">仅必学</Label>
              <Switch id="knowledge-required-only" checked={requiredOnly} onCheckedChange={(checked) => updateFilter(() => setRequiredOnly(checked))} />
            </div>
          </div>
      </div>
      {visibleItems.length ? expandedItem ? <div className="grid items-stretch gap-4 lg:h-[clamp(36rem,calc(100vh-8rem),48rem)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <nav aria-label="全部知识内容" className="hidden min-h-0 flex-col gap-2 lg:flex">
          <p className="shrink-0 px-1 text-xs text-muted-foreground">全部内容 · {filtered.length}</p>
          <div ref={listViewportRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {filtered.map((item) => {
              const itemIndex = learningItems.indexOf(item)
              const itemStatus = getItemStatus(item, state)
              const selected = item.id === expandedItem.id
              return <article key={item.id} data-knowledge-item={item.id} className={cn("relative shrink-0 overflow-hidden rounded-xl border bg-card", selected && "border-brand/40 bg-brand-selected before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-1 before:bg-brand")}>
                <button type="button" aria-current={selected ? "true" : undefined} className="flex h-[6.5rem] w-full text-left outline-none transition-colors hover:bg-brand-hover focus-visible:ring-1 focus-visible:ring-ring/50" aria-label={`查看 ${item.title}`} onClick={() => setExpandedId(item.id)}>
                  <span className="relative flex w-24 shrink-0 items-center justify-center overflow-hidden bg-muted">
                    <span aria-hidden="true" className="absolute inset-y-0 right-0 w-2/5 bg-foreground/5" />
                    <BookOpenIcon className="relative size-5 text-brand" />
                    <span className="absolute top-2 left-2"><Badge size="sm" variant="overlay">{item.type}</Badge></span>
                    <span aria-hidden="true" className="absolute right-2 bottom-2 text-xl font-medium tabular-nums text-muted-foreground/50">{String(itemIndex + 1).padStart(2, "0")}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5">
                    <span className="flex min-w-0 items-start gap-2">
                      <span className={cn("line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-5", selected && "text-brand")}>{item.title}</span>
                      <LearningStatusBadge status={itemStatus} />
                    </span>
                    <span className="text-xs text-muted-foreground">{item.category} · {itemStatus === "待学习" ? `约 ${item.duration} 分钟` : `累计 ${getItemMinutes(item, state)} 分钟`}</span>
                    <span className="flex flex-wrap gap-1.5">{item.required ? <Badge size="sm" variant="destructiveSolid">必学</Badge> : null}{item.new ? <Badge size="sm" variant="destructiveSolid">NEW</Badge> : null}{item.tags.slice(0, 1).map((value) => <Badge key={value} size="sm" variant="outline">#{value}</Badge>)}</span>
                  </span>
                </button>
              </article>
            })}
          </div>
        </nav>

        <LearningContentDetail id={`knowledge-${expandedItem.id}`} item={expandedItem} onClose={collapseExpandedItem} />
      </div> : <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => {
          const itemIndex = learningItems.indexOf(item)
          const itemStatus = getItemStatus(item, state)
          return <article key={item.id} id={`knowledge-${item.id}`} className="scroll-mt-20 overflow-hidden rounded-xl border bg-card">
            <button type="button" className="block w-full text-left outline-none focus-visible:ring-1 focus-visible:ring-ring/50" aria-label={`查看 ${item.title}`} onClick={() => setExpandedId(item.id)}>
              <div className="relative"><LearningThumbnail item={item} index={itemIndex} /><div className="absolute top-3 left-3"><Badge size="sm" variant="overlay">{item.type}</Badge></div><div className="absolute top-3 right-3"><LearningStatusBadge status={itemStatus} /></div></div>
              <div className="flex flex-col gap-3 p-4"><h2 className="line-clamp-2 min-h-10 text-sm font-medium">{item.title}</h2><div className="flex flex-wrap gap-1.5">{item.required ? <Badge size="sm" variant="destructiveSolid">必学</Badge> : null}{item.new ? <Badge size="sm" variant="destructiveSolid">NEW</Badge> : null}{item.downloadAsset ? <Badge size="sm" variant="outline">可下载</Badge> : null}{item.archived ? <Badge size="sm" variant="outline">已下架</Badge> : null}{item.tags.map((value) => <Badge key={value} size="sm" variant="outline">#{value}</Badge>)}</div><p className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums"><span>{itemStatus === "待学习" ? `约 ${item.duration} 分钟` : `累计 ${getItemMinutes(item, state)} / ${item.duration} 分钟`}</span><span>{item.recentlyViewedAt ? `最近 ${formatDate(item.recentlyViewedAt, { timeZone })}` : formatDate(item.publishedAt, { timeZone })}</span></p></div>
            </button>
          </article>
        })}
      </div> : <Empty className="min-h-64 border bg-card"><EmptyHeader><EmptyMedia variant="icon"><SearchIcon /></EmptyMedia><EmptyTitle>没有匹配的内容</EmptyTitle><EmptyDescription>调整分类、标签或搜索词后再试。</EmptyDescription></EmptyHeader></Empty>}

      {pageCount > 1 && !expandedItem ? <DataPagination
        className="px-0 pb-0"
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        showPageSize={false}
        onPageChange={(value) => { setPage(value); setExpandedId(null) }}
        onPageSizeChange={(value) => { setPageSize(value); setPage(1); setExpandedId(null) }}
      /> : null}
      </div>
    </section>
  )
}
