"use client"

import { useMemo, useState } from "react"
import { ChevronRightIcon, RefreshCwIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { DmsOrgNode, DmsOrgSnapshot } from "./dms-org-tree-demo"
import { invalidDspIds } from "./dms-org-tree-demo"

type Props = {
  snapshot: DmsOrgSnapshot | null
  selected: string[]
  onChange: (ids: string[]) => void
  onSync: () => void
  syncing: boolean
  syncError: boolean
}

const depthPadding = ["pl-2", "pl-6", "pl-10", "pl-14"]
const emptyNodes: DmsOrgNode[] = []

export function DmsOrgTreeView({ snapshot, selected }: Pick<Props, "snapshot" | "selected">) {
  const [collapsedIds, setCollapsedIds] = useState<string[]>([])
  const nodes = snapshot?.nodes ?? emptyNodes
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const includedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const id of selected) {
      let current = nodeMap.get(id)
      while (current && !ids.has(current.id)) {
        ids.add(current.id)
        current = current.parentId ? nodeMap.get(current.parentId) : undefined
      }
    }
    return ids
  }, [nodeMap, selected])
  const children = useMemo(() => {
    const map = new Map<string | null, DmsOrgNode[]>()
    for (const node of nodes) {
      if (includedIds.has(node.id)) map.set(node.parentId, [...(map.get(node.parentId) ?? []), node])
    }
    return map
  }, [nodes, includedIds])
  const invalid = snapshot ? invalidDspIds(selected, snapshot) : []

  function selectedCount(node: DmsOrgNode): number {
    if (node.type === "dsp") return selectedSet.has(node.id) ? 1 : 0
    return (children.get(node.id) ?? []).reduce((count, child) => count + selectedCount(child), 0)
  }
  function renderNode(node: DmsOrgNode, depth: number): React.ReactNode {
    const leaf = node.type === "dsp"
    const open = !collapsedIds.includes(node.id)
    const row = <div className={cn("flex min-h-9 items-center gap-2 border-b border-border/60 pr-2 text-sm", depthPadding[Math.min(depth, 3)])}>
      {leaf ? <span className="size-7 shrink-0" aria-hidden="true" /> : <CollapsibleTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`${open ? "收起" : "展开"}${node.name}`}><ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} /></Button></CollapsibleTrigger>}
      <span className="min-w-0 flex-1 truncate" title={node.name}>{node.name}</span>
      {invalid.includes(node.id) && <Badge variant="destructive" size="sm">已失效</Badge>}
      {!leaf && <span className="text-xs text-muted-foreground">{selectedCount(node)} 个 DSP</span>}
    </div>
    if (leaf) return <div key={node.id}>{row}</div>
    return <Collapsible key={node.id} open={open} onOpenChange={(next) => setCollapsedIds((ids) => next ? ids.filter((id) => id !== node.id) : [...new Set([...ids, node.id])])}>{row}<CollapsibleContent>{(children.get(node.id) ?? []).map((child) => renderNode(child, depth + 1))}</CollapsibleContent></Collapsible>
  }

  return <div role="region" aria-label="已选灰度 DSP 组织树" tabIndex={0} className="h-64 overflow-y-auto overscroll-contain rounded-lg border">
    {selected.length ? <>{(children.get(null) ?? []).map((node) => renderNode(node, 0))}{selected.filter((id) => !nodeMap.has(id)).map((id) => <div key={id} className="flex min-h-9 items-center justify-between border-b border-border/60 px-3 text-sm"><span>{id}</span>{snapshot ? <Badge variant="destructive" size="sm">已失效</Badge> : <Badge variant="secondary" size="sm">组织树未加载</Badge>}</div>)}</> : <Empty className="min-h-28"><EmptyHeader><EmptyTitle>暂无灰度 DSP</EmptyTitle></EmptyHeader></Empty>}
  </div>
}

export function DmsOrgTreePicker({ snapshot, selected, onChange, onSync, syncing, syncError }: Props) {
  const [query, setQuery] = useState("")
  const [openIds, setOpenIds] = useState<string[]>(["hq-gofo", "region-east", "region-west"])
  const nodes = snapshot?.nodes ?? emptyNodes
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const children = useMemo(() => {
    const map = new Map<string | null, DmsOrgNode[]>()
    for (const node of nodes) map.set(node.parentId, [...(map.get(node.parentId) ?? []), node])
    return map
  }, [nodes])
  const invalid = invalidDspIds(selected, snapshot)
  const validSelected = selected.length - invalid.length
  const allActive = nodes.filter((node) => node.type === "dsp" && !invalidDspIds([node.id], snapshot).length).length
  const normalizedQuery = query.trim().toLowerCase()
  const editingDisabled = syncing || syncError || !snapshot

  function descendants(node: DmsOrgNode): DmsOrgNode[] {
    if (node.type === "dsp") return invalidDspIds([node.id], snapshot).length ? [] : [node]
    return (children.get(node.id) ?? []).flatMap(descendants)
  }
  function matches(node: DmsOrgNode): boolean {
    if (!normalizedQuery || node.name.toLowerCase().includes(normalizedQuery)) return true
    return (children.get(node.id) ?? []).some(matches)
  }
  function toggleBranch(node: DmsOrgNode, checked: boolean) {
    const ids = descendants(node).map((entry) => entry.id)
    onChange(checked ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id)))
  }
  function toggleLeaf(id: string, checked: boolean) {
    onChange(checked ? [...new Set([...selected, id])] : selected.filter((entry) => entry !== id))
  }
  function renderNode(node: DmsOrgNode, depth: number, ancestorMatched = false): React.ReactNode {
    const directMatch = Boolean(normalizedQuery) && node.name.toLowerCase().includes(normalizedQuery)
    if (!ancestorMatched && !matches(node)) return null
    const childNodes = children.get(node.id) ?? []
    const leaf = node.type === "dsp"
    const eligible = descendants(node)
    const checkedCount = eligible.filter((entry) => selected.includes(entry.id)).length
    const checked = leaf ? selected.includes(node.id) : eligible.length && checkedCount === eligible.length ? true : checkedCount ? "indeterminate" : false
    const inactive = node.status !== "active" || (leaf && !eligible.length)
    const row = <div className={cn("flex min-h-9 items-center gap-2 border-b border-border/60 pr-2 text-sm last:border-b-0", depthPadding[Math.min(depth, 3)])}>
      {leaf ? <span className="size-7 shrink-0" aria-hidden="true" /> : <CollapsibleTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`${openIds.includes(node.id) || normalizedQuery ? "收起" : "展开"}${node.name}`}><ChevronRightIcon className={cn("transition-transform", (openIds.includes(node.id) || normalizedQuery) && "rotate-90")} /></Button></CollapsibleTrigger>}
      <Checkbox checked={checked} disabled={editingDisabled || (leaf ? inactive && !selected.includes(node.id) : !eligible.length)} onCheckedChange={(value) => leaf ? toggleLeaf(node.id, value === true) : toggleBranch(node, value === true)} aria-label={leaf ? `选择 DSP ${node.name}` : `选择${node.name}下全部有效 DSP`} />
      <span className={cn("min-w-0 flex-1 truncate", inactive && "text-muted-foreground")} title={`${node.name} · ${node.id}`}>{node.name}</span>
      {inactive && <Badge variant="secondary" size="sm">已停用</Badge>}
      {leaf ? <span className="text-xs text-muted-foreground">{node.id}</span> : <span className="text-xs text-muted-foreground">{checkedCount}/{eligible.length}</span>}
    </div>
    if (leaf) return <div key={node.id}>{row}</div>
    const open = Boolean(normalizedQuery) || openIds.includes(node.id)
    return <Collapsible key={node.id} open={open} onOpenChange={(next) => setOpenIds((ids) => next ? [...new Set([...ids, node.id])] : ids.filter((id) => id !== node.id))}>{row}<CollapsibleContent>{childNodes.map((child) => renderNode(child, depth + 1, ancestorMatched || directMatch))}</CollapsibleContent></Collapsible>
  }

  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>已选有效 DSP {validSelected}/{allActive}</span><Button variant="outline" size="sm" onClick={onSync} disabled={syncing}><RefreshCwIcon data-icon="inline-start" />{syncing ? "同步中" : "重新同步"}</Button></div>
    {syncError && <Alert variant="destructive"><AlertTitle>组织树同步失败</AlertTitle><AlertDescription>当前名单仅供查看。请重新同步后再发布或保存灰度配置。</AlertDescription></Alert>}
    {!snapshot ? <Empty className="min-h-28"><EmptyHeader><EmptyTitle>{syncing ? "正在加载组织树" : "组织树不可用"}</EmptyTitle></EmptyHeader></Empty> : <><Input aria-label="搜索组织或 DSP 名称" placeholder="搜索总部、大区、站点或 DSP 名称" value={query} onChange={(event) => setQuery(event.target.value)} /><div role="region" aria-label="DMS 组织树" tabIndex={0} className="h-64 shrink-0 overflow-y-auto overscroll-contain rounded-lg border">{(children.get(null) ?? []).map((node) => renderNode(node, 0))}{normalizedQuery && !(children.get(null) ?? []).some(matches) && <Empty className="min-h-28"><EmptyHeader><EmptyTitle>没有匹配的组织</EmptyTitle></EmptyHeader></Empty>}</div></>}
    {invalid.length > 0 && <Alert variant="destructive"><AlertTitle>{invalid.length} 个已选 DSP 已失效</AlertTitle><AlertDescription>请移除停用或已从 DMS 删除的 DSP，再保存灰度配置。</AlertDescription><div className="mt-2 flex flex-wrap gap-2">{invalid.map((id) => <Button key={id} size="xs" variant="outline" disabled={editingDisabled} onClick={() => toggleLeaf(id, false)}>移除 {nodeMap.get(id)?.name ?? id}</Button>)}</div></Alert>}
    <p className="text-xs text-muted-foreground">上级节点会选择该分支全部有效 DSP，包括搜索时未显示的成员。新增 DSP 不会自动加入已保存的灰度名单。</p>
  </div>
}
