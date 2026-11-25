"use client"

import { useState } from "react"
import { ChevronRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { permissionMatrix } from "@/features/system-management/permission-matrix"

export type PermissionPlatform = "web" | "app"
type PermissionKind = "页面" | "操作" | "隐私字段" | "导出"
export type PermissionNode = {
  id: string
  label: string
  code?: string
  kind?: PermissionKind
  note?: string
  disabled?: boolean
  children?: PermissionNode[]
}

function buildCatalog(platform: PermissionPlatform): PermissionNode[] {
  const roots: PermissionNode[] = []
  for (const row of permissionMatrix[platform]) {
    let siblings = roots
    row.path.forEach((label, depth) => {
      const id = `${platform}:${row.path.slice(0, depth + 1).join("/")}`
      let node = siblings.find((item) => item.id === id)
      if (!node) {
        node = { id, label, children: [] }
        siblings.push(node)
      }
      if (depth === row.path.length - 1) {
        node.code = row.code
        node.kind = row.kind
      }
      siblings = node.children ?? []
    })
  }
  return roots
}

export const permissionCatalog: Record<PermissionPlatform, PermissionNode[]> = {
  web: buildCatalog("web"),
  app: buildCatalog("app"),
}

// The supplied workbook does not specify permission dependencies.
const dependencies: Record<string, string[]> = {}

export function selectableCodes(nodes: PermissionNode[]): string[] {
  return nodes.flatMap((node) => node.disabled ? [] : [...(node.code ? [node.code] : []), ...selectableCodes(node.children ?? [])])
}

export function effectivePermissionCodes(platform: PermissionPlatform, login: boolean, grants: string[]): string[] {
  if (!login) return []
  const catalogOrder = selectableCodes(permissionCatalog[platform])
  const active = new Set(grants.filter((code) => catalogOrder.includes(code)))
  let changed = true
  while (changed) {
    changed = false
    for (const code of active) {
      if ((dependencies[code] ?? []).some((dependency) => !active.has(dependency))) {
        active.delete(code)
        changed = true
      }
    }
  }
  return catalogOrder.filter((code) => active.has(code))
}

function grantedNodes(nodes: PermissionNode[], codes: Set<string>): PermissionNode[] {
  return nodes.flatMap((node) => {
    if (node.disabled) return []
    const children = grantedNodes(node.children ?? [], codes)
    const ownGranted = Boolean(node.code && codes.has(node.code))
    return ownGranted || children.length ? [{ ...node, ...(ownGranted ? {} : { code: undefined, kind: undefined }), children }] : []
  })
}

function PermissionPreviewNode({ node, depth = 0 }: { node: PermissionNode; depth?: number }) {
  const [open, setOpen] = useState(true)
  const hasChildren = Boolean(node.children?.length)
  return <li className="min-w-0 border-b border-border/70 last:border-b-0">
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("flex min-w-0 items-center gap-2 py-1 pr-2", depth === 0 && "bg-muted/30")}>
        {hasChildren ? <CollapsibleTrigger asChild><Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={`${open ? "收起" : "展开"}${node.label}`}><ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} /></Button></CollapsibleTrigger> : <span className="size-7 shrink-0" aria-hidden="true" />}
        <span className={cn("min-w-0 flex-1 text-sm leading-5", hasChildren && "font-medium")}>{node.label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{hasChildren ? `${node.kind ? `${node.kind} · ` : ""}${selectableCodes([node]).length} 项` : node.kind ?? "权限"}</span>
      </div>
      {hasChildren && <CollapsibleContent><ul className="ml-2 border-l pl-2" aria-label={`${node.label}生效权限`}>{node.children?.map((child) => <PermissionPreviewNode key={child.id} node={child} depth={depth + 1} />)}</ul></CollapsibleContent>}
    </Collapsible>
  </li>
}

export function PermissionPreviewTree({ platform, codes }: { platform: PermissionPlatform; codes: string[] }) {
  const visible = grantedNodes(permissionCatalog[platform], new Set(codes))
  return <ul className="border-t" aria-label={`${platform === "web" ? "Web" : "App"} 生效权限树`}>{visible.map((node) => <PermissionPreviewNode key={node.id} node={node} />)}</ul>
}

export function changePermissionGrants(platform: PermissionPlatform, previous: string[], codes: string[], checked: boolean): string[] {
  const available = new Set(selectableCodes(permissionCatalog[platform]))
  const next = new Set(previous)
  if (checked) {
    const add = (code: string) => {
      if (!available.has(code) || next.has(code)) return
      for (const dependency of dependencies[code] ?? []) add(dependency)
      next.add(code)
    }
    codes.forEach(add)
  } else {
    codes.forEach((code) => next.delete(code))
    let changed = true
    while (changed) {
      changed = false
      for (const code of [...next]) {
        if ((dependencies[code] ?? []).some((dependency) => !next.has(dependency))) {
          next.delete(code)
          changed = true
        }
      }
    }
  }
  const catalogOrder = selectableCodes(permissionCatalog[platform])
  return [...catalogOrder.filter((code) => next.has(code)), ...[...next].filter((code) => !available.has(code))]
}

function PermissionTreeNode({ node, platform, grants, onChange, depth = 0 }: {
  node: PermissionNode
  platform: PermissionPlatform
  grants: string[]
  onChange: (codes: string[], checked: boolean) => void
  depth?: number
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = Boolean(node.children?.length)
  const codes = node.code ? [node.code] : selectableCodes([node])
  const selected = codes.filter((code) => grants.includes(code)).length
  const checked = codes.length && selected === codes.length ? true : selected > 0 ? "indeterminate" : false
  const inputId = `permission-tree-${platform}-${node.id}`
  const label = node.code ? `${node.kind ?? "权限"} · ${node.code}` : `${selected}/${codes.length} 项`

  return <li className="min-w-0 border-b border-border/70 last:border-b-0">
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("flex min-w-0 items-start gap-2 py-2.5 pr-2", depth === 0 && "bg-muted/30")}>
        {hasChildren ? <CollapsibleTrigger asChild><Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={`${open ? "收起" : "展开"}${node.label}`}><ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} /></Button></CollapsibleTrigger> : <span className="size-7 shrink-0" aria-hidden="true" />}
        <Checkbox id={inputId} className="mt-1.5" checked={node.disabled ? false : checked} disabled={node.disabled || !codes.length} onCheckedChange={() => onChange(codes, selected !== codes.length)} aria-label={`${node.label}${hasChildren ? "全部权限" : "权限"}`} />
        <div className="min-w-0 flex-1"><label htmlFor={inputId} className={cn("block text-sm leading-5", node.disabled ? "text-muted-foreground" : "cursor-pointer", hasChildren && "font-medium")}>{node.label}</label><p className="break-all text-xs leading-5 text-muted-foreground">{node.note ?? label}</p></div>
        {node.disabled && <Badge size="sm" variant="secondary">待开放</Badge>}
      </div>
      {hasChildren && <CollapsibleContent><ul className="ml-3 border-l pl-2" aria-label={`${node.label}子权限`}>{node.children?.map((child) => <PermissionTreeNode key={child.id} node={child} platform={platform} grants={grants} onChange={onChange} depth={depth + 1} />)}</ul></CollapsibleContent>}
    </Collapsible>
  </li>
}

export function PermissionTree({ platform, grants, onChange }: {
  platform: PermissionPlatform
  grants: string[]
  onChange: (codes: string[], checked: boolean) => void
}) {
  return <ul className="border-t" aria-label={`${platform === "web" ? "Web" : "App"} 权限树`}>{permissionCatalog[platform].map((node) => <PermissionTreeNode key={node.id} node={node} platform={platform} grants={grants} onChange={onChange} />)}</ul>
}
