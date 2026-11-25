"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeftIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ListIcon, MoreHorizontalIcon, PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DataPagination } from "@/components/ui/pagination"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { useTimezone } from "@/features/preferences/timezone-store"
import { mockSession } from "@/mocks/session"
import { PermissionTree, PermissionPreviewTree, changePermissionGrants, effectivePermissionCodes, permissionCatalog, selectableCodes, type PermissionNode, type PermissionPlatform } from "@/features/system-management/permission-tree"
import { initialRolePolicies, migrateOldRolePolicies, migrateV5RolePolicies, ROLE_POLICY_STORAGE_KEY, roleCatalog, superAdminRole, type Role, type RolePolicy } from "@/features/system-management/role-policy-data"

type Platform = PermissionPlatform
type AdmissionFilter = "all" | "allowed" | "blocked"
type Policy = RolePolicy
type AuditPermissionType = "页面" | "操作" | "隐私字段" | "未知类型"
type PermissionAuditItem = { adjustment: "新增" | "删除"; fieldName: string; permissionType: AuditPermissionType; code: string }
type HistoryEntry = { id: string; batchId: string; at: string; roleId: string; roleName: string; platform: Platform; changeType: "Web 权限更新" | "App 权限更新"; operator: string | null; permissions: PermissionAuditItem[]; admission?: boolean; source?: string; snapshot?: Policy[Platform] }
type LegacyPermissionAuditItem = { platform: Platform; change: "配置" | "新增" | "移除"; code: string; label?: string; kind?: string }
type LegacyHistoryEntry = { id: string; at: string; roleId: string; roleName: string; action: string; operator: string | null; detail?: string; source?: string; snapshot?: Policy; permissions?: LegacyPermissionAuditItem[]; admissions?: { platform: Platform; before?: boolean; after: boolean }[] }
type DetailTab = "preview" | "history"
type PendingNavigation = { kind: "list" } | { kind: "role"; roleId: string } | { kind: "tab"; tab: DetailTab }

const roles: Role[] = [...roleCatalog, superAdminRole]
const initialPolicies: Record<string, Policy> = initialRolePolicies
const STORAGE_KEY = ROLE_POLICY_STORAGE_KEY
const PREVIOUS_STORAGE_KEY = "dsp-system-permissions-demo-v5"
const EARLIER_STORAGE_KEY = "dsp-system-permissions-demo-v4"
const OLDER_STORAGE_KEY = "dsp-system-permissions-demo-v3"
const LEGACY_STATE_KEY = "dsp-system-permissions-demo-v2"
const LEGACY_POLICY_KEY = "dsp-system-permissions-demo-v1"
const INITIALIZATION_VERSION = "v6-super-admin"
const blankPolicy = (): Policy => ({ web: { login: false, grants: [] }, app: { login: false, grants: [] } })
// Names and types from the pre-Excel demo catalog are kept only to explain
// removals in the v4 -> v5 operation log. They are not grantable in v5.
const previousCatalog: Record<string, { label: string; kind: string }> = {
  "operations.waybill.edit": { label: "修改运单", kind: "操作" },
  "team.driver.review": { label: "司机审核", kind: "操作" },
  "driver.phone.masked_read": { label: "查看脱敏司机电话", kind: "隐私字段" },
  "driver.phone.full_read": { label: "按次查看完整司机电话", kind: "隐私字段" },
  "finance.bills.export": { label: "导出账单", kind: "导出" },
  "driver.phone.full_export": { label: "导出完整司机电话", kind: "导出" },
  "app.driver.review": { label: "司机审核", kind: "操作" },
  "app.scan.sort": { label: "扫描分拣", kind: "操作" },
  "app.pod.edit": { label: "POD 修改", kind: "操作" },
  "app.driver.phone.masked_read": { label: "查看脱敏司机电话", kind: "隐私字段" },
  "app.driver.phone.full_read": { label: "按次查看完整司机电话", kind: "隐私字段" },
}

function findPermissionNode(nodes: PermissionNode[], code: string): PermissionNode | undefined {
  for (const node of nodes) {
    if (node.code === code) return node
    const child = findPermissionNode(node.children ?? [], code)
    if (child) return child
  }
}

function permissionAuditItem(platform: Platform, adjustment: PermissionAuditItem["adjustment"], code: string, legacy?: LegacyPermissionAuditItem): PermissionAuditItem {
  const node = findPermissionNode(permissionCatalog[platform], code)
  const sourceType = legacy?.kind && legacy.kind !== "未知类型" ? legacy.kind : node?.kind ?? previousCatalog[code]?.kind
  const permissionType: AuditPermissionType = sourceType === "导出" ? "操作" : sourceType === "页面" || sourceType === "操作" || sourceType === "隐私字段" ? sourceType : "未知类型"
  return { adjustment, code, fieldName: legacy?.label && legacy.label !== "未登记权限" ? legacy.label : node?.label ?? previousCatalog[code]?.label ?? "未登记权限", permissionType }
}

function readStoredState<THistory>(value: string | null): { policies: Record<string, Policy>; history: THistory[] } | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as { policies?: Record<string, Policy>; history?: THistory[] }
    return parsed.policies && typeof parsed.policies === "object" && Array.isArray(parsed.history)
      ? { policies: parsed.policies, history: parsed.history }
      : null
  } catch { return null }
}

function readLegacyPolicies(value: string | null): Record<string, Policy> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Record<string, Policy>
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
  } catch { return null }
}

function migrateLegacyHistory(entries: LegacyHistoryEntry[]): HistoryEntry[] {
  return entries.filter((entry) => entry.action !== "历史演示操作" && !entry.id.startsWith("legacy-")).flatMap((entry) => {
    const permissions = entry.permissions ? [...entry.permissions] : []
    const admissions = entry.admissions ? [...entry.admissions] : []
    if (!entry.permissions && !entry.admissions && entry.detail) {
      for (const part of entry.detail.split("；")) {
        const permissionMatch = part.match(/^(Web|App) (新增|移除)：(.+)$/)
        if (permissionMatch) {
          const platform: Platform = permissionMatch[1] === "Web" ? "web" : "app"
          permissions.push(...permissionMatch[3].split("、").map((code) => ({ platform, change: permissionMatch[2] as "新增" | "移除", code })))
        }
        // 旧版记录沿用当时的「不允许」文案；新界面只按布尔值显示「禁止」。
        const admissionMatch = part.match(/^(Web|App) 准入：(允许|不允许) → (允许|不允许)$/)
        if (admissionMatch) admissions.push({ platform: admissionMatch[1] === "Web" ? "web" : "app", before: admissionMatch[2] === "允许", after: admissionMatch[3] === "允许" })
      }
    }
    return (["web", "app"] as const).flatMap((platform): HistoryEntry[] => {
      const platformPermissions = permissions.filter((item) => item.platform === platform)
      const snapshot = entry.snapshot?.[platform]
      const admission = admissions.find((item) => item.platform === platform)?.after ?? snapshot?.login
      const isInitialization = entry.action === "系统初始化" || entry.action === "首次配置权限"
      if (!platformPermissions.length && admission === undefined && !snapshot) return []
      const sourcePermissions = platformPermissions.length ? platformPermissions : isInitialization && snapshot ? snapshot.grants.map((code): LegacyPermissionAuditItem => ({ platform, change: "配置", code })) : []
      return [{
        id: `${entry.id}-${platform}`,
        batchId: entry.id,
        at: entry.at,
        roleId: entry.roleId,
        roleName: entry.roleName,
        platform,
        changeType: platform === "web" ? "Web 权限更新" : "App 权限更新",
        operator: entry.action === "系统初始化" ? "系统" : entry.operator,
        permissions: sourcePermissions.map((item) => permissionAuditItem(platform, item.change === "移除" ? "删除" : "新增", item.code, item)),
        ...(admission === undefined ? {} : { admission }),
        ...(entry.source ? { source: entry.source } : {}),
        ...(snapshot ? { snapshot: { login: snapshot.login, grants: [...snapshot.grants] } } : {}),
      }]
    })
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

function initializeHistory(policies: Record<string, Policy>, existing: HistoryEntry[]): HistoryEntry[] {
  const at = new Date().toISOString()
  const initialized = [...roles.slice(0, 5), superAdminRole].flatMap((role) => {
    const policy = policies[role.id]
    if (!policy || existing.some((entry) => entry.roleId === role.id)) return []
    return (["web", "app"] as const).map((platform): HistoryEntry => ({
      id: `system-init-${INITIALIZATION_VERSION}-${role.id}-${platform}`,
      batchId: `system-init-${INITIALIZATION_VERSION}-${role.id}`,
      at,
      roleId: role.id,
      roleName: role.name,
      platform,
      changeType: platform === "web" ? "Web 权限更新" : "App 权限更新",
      operator: "系统",
      permissions: policy[platform].grants.map((code) => permissionAuditItem(platform, "新增", code)),
      admission: policy[platform].login,
      source: `Excel 角色矩阵及超级管理员全权限（${INITIALIZATION_VERSION}）`,
      snapshot: { login: policy[platform].login, grants: [...policy[platform].grants] },
    }))
  })
  return [...existing, ...initialized].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

function migratePresetHistory(previousPolicies: Record<string, Policy>, previousHistory: HistoryEntry[], nextPolicies: Record<string, Policy>, source: string): HistoryEntry[] {
  const at = new Date().toISOString()
  const batchId = `policy-migration-${INITIALIZATION_VERSION}-${at}`
  const entries = [...roles.slice(0, 5), superAdminRole].flatMap((role): HistoryEntry[] => {
    const newRole = !previousPolicies[role.id]
    const before = previousPolicies[role.id] ?? blankPolicy()
    const after = nextPolicies[role.id]
    if (!after) return []
    return (["web", "app"] as const).flatMap((platform): HistoryEntry[] => {
      const added = after[platform].grants.filter((code) => !before[platform].grants.includes(code))
      const removed = before[platform].grants.filter((code) => !after[platform].grants.includes(code))
      const loginChanged = before[platform].login !== after[platform].login
      if (!newRole && !added.length && !removed.length && !loginChanged) return []
      return [{
        id: `${batchId}-${role.id}-${platform}`,
        batchId,
        at,
        roleId: role.id,
        roleName: role.name,
        platform,
        changeType: platform === "web" ? "Web 权限更新" : "App 权限更新",
        operator: "系统",
        permissions: [...added.map((code) => permissionAuditItem(platform, "新增", code)), ...removed.map((code) => permissionAuditItem(platform, "删除", code))],
        ...(newRole || loginChanged ? { admission: after[platform].login } : {}),
        source,
        snapshot: { login: after[platform].login, grants: [...after[platform].grants] },
      }]
    })
  })
  return [...entries, ...previousHistory].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

function ensureSuperAdminAppHistory(policies: Record<string, Policy>, history: HistoryEntry[]): HistoryEntry[] {
  if (!policies[superAdminRole.id] || history.some((entry) => entry.roleId === superAdminRole.id && entry.platform === "app")) return history
  const webEntry = history.find((entry) => entry.roleId === superAdminRole.id && entry.platform === "web")
  const policy = policies[superAdminRole.id].app
  const appEntry: HistoryEntry = {
    id: `system-init-${INITIALIZATION_VERSION}-${superAdminRole.id}-app`,
    batchId: webEntry?.batchId ?? `system-init-${INITIALIZATION_VERSION}-${superAdminRole.id}`,
    at: webEntry?.at ?? new Date().toISOString(),
    roleId: superAdminRole.id,
    roleName: superAdminRole.name,
    platform: "app",
    changeType: "App 权限更新",
    operator: "系统",
    permissions: policy.grants.map((code) => permissionAuditItem("app", "新增", code)),
    admission: policy.login,
    source: `Excel 角色矩阵及超级管理员全权限（${INITIALIZATION_VERSION}）`,
    snapshot: { login: policy.login, grants: [...policy.grants] },
  }
  return [...history, appEntry].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

function LoginAccessBadge({ allowed }: { allowed: boolean }) {
  return <Badge variant={allowed ? "success" : "destructive"} size="sm">{allowed ? "允许" : "禁止"}</Badge>
}

function HistoryDetail({ entry }: { entry: HistoryEntry }) {
  return <div className="mt-2 flex flex-col gap-3 text-xs">
    {entry.permissions.length > 0 && <section aria-label="权限变更" className="flex flex-col gap-2">
      <h5 className="font-medium">权限变更</h5>
      <div className="overflow-x-auto">
        <div className="min-w-[30rem]">
          <div className="grid grid-cols-[64px_72px_minmax(120px,1fr)_minmax(180px,1.4fr)] gap-x-2 border-b pb-1 text-muted-foreground"><span>调整类型</span><span>权限类型</span><span>字段名</span><span>权限码</span></div>
          <ul className="flex flex-col">{entry.permissions.map((item, index) => <li key={`${item.code}-${item.adjustment}-${index}`} className="grid grid-cols-[64px_72px_minmax(120px,1fr)_minmax(180px,1.4fr)] gap-x-2 border-b border-border/70 py-2 last:border-b-0"><span>{item.adjustment}</span><span>{item.permissionType === "未知类型" && previousCatalog[item.code] ? previousCatalog[item.code].kind === "导出" ? "操作" : previousCatalog[item.code].kind : item.permissionType}</span><span className="min-w-0 break-words">{item.fieldName === "未登记权限" ? previousCatalog[item.code]?.label ?? item.fieldName : item.fieldName}</span><span className="min-w-0 break-all text-muted-foreground">{item.code}</span></li>)}</ul>
        </div>
      </div>
    </section>}
    {entry.admission !== undefined && <section aria-label="系统准入" className="flex flex-col gap-1"><h5 className="font-medium">系统准入</h5><p><span className="text-muted-foreground">调整类型：</span>{entry.admission ? "允许登录" : "禁止登录"}</p></section>}
  </div>
}

function PermissionPreviewContent({ policy }: { policy: Policy | null }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    {(["web", "app"] as const).map((platform) => {
      const login = policy?.[platform].login ?? false
      const effectiveCodes = effectivePermissionCodes(platform, login, policy?.[platform].grants ?? [])
      return <section key={platform} className={cn("min-w-0", platform === "web" && "border-b pb-4 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0")}>
        <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-baseline gap-2"><h3 className="text-base font-medium">{platform === "web" ? "Web" : "App"} 权限</h3><span className="shrink-0 text-xs text-muted-foreground">生效 {effectiveCodes.length} 项</span></div><LoginAccessBadge allowed={login} /></div>
        {effectiveCodes.length ? <div className="mt-3"><PermissionPreviewTree platform={platform} codes={effectiveCodes} /></div> : <Empty className="mt-3 min-h-32"><EmptyHeader><EmptyTitle>暂无生效权限</EmptyTitle><EmptyDescription>{!policy ? "角色尚未保存权限策略。" : !login ? policy[platform].grants.length ? "禁止登录，已配置权限暂不生效。" : "禁止登录，暂无已配置权限。" : "尚未授予可生效的功能权限。"}</EmptyDescription></EmptyHeader></Empty>}
      </section>
    })}
  </div>
}

function OperationTimeline({ entries, timeZone }: { entries: HistoryEntry[]; timeZone: string }) {
  return entries.length ? <ol className="audit-timeline" aria-label="权限操作记录">{entries.map((item, index) => <li key={item.id} className="audit-timeline__item" data-latest={index === 0}><div className="audit-timeline__track" aria-hidden="true"><span className="audit-timeline__node" data-tone={index === 0 ? "success" : undefined} /></div><div className="audit-timeline__content"><div className="audit-timeline__heading"><h4>{item.changeType}</h4>{index === 0 && <Badge size="sm" variant="secondary">最新</Badge>}</div><div className="audit-timeline__meta"><time dateTime={item.at} title={timeZone}>{formatDateTime(item.at, { timeZone })}</time><span className="audit-timeline__operator">· 操作人：{item.operator ?? "—"}</span></div><HistoryDetail entry={item} /></div></li>)}</ol> : <Empty className="min-h-40"><EmptyHeader><EmptyTitle>暂无操作记录</EmptyTitle><EmptyDescription>保存权限后，操作会显示在这里。</EmptyDescription></EmptyHeader></Empty>
}

function PermissionPlatformPanel({ platform, policy, onLoginChange, onGrantsChange }: {
  platform: Platform
  policy: Policy[Platform]
  onLoginChange: (login: boolean) => void
  onGrantsChange: (codes: string[], checked: boolean) => void
}) {
  const name = platform === "web" ? "Web" : "App"
  const total = selectableCodes(permissionCatalog[platform]).length
  const selected = selectableCodes(permissionCatalog[platform]).filter((code) => policy.grants.includes(code)).length
  return <section aria-label={`${name} 权限配置`} className={cn("flex min-h-0 flex-col", platform === "web" && "border-b md:border-r md:border-b-0")}>
    <div className="shrink-0 border-b px-4 py-3">
      <div className="flex items-center justify-between gap-3"><h3 className="text-base font-medium">{name} 权限</h3><span className="text-xs tabular-nums text-muted-foreground">已配置 {selected}/{total} 项</span></div>
      <Field orientation="horizontal" className="mt-3 items-center"><FieldContent><FieldTitle>{name} 登录准入</FieldTitle><FieldDescription className="text-xs">{policy.login ? "允许登录，已配置权限生效" : "禁止登录，已配置权限暂不生效"}</FieldDescription></FieldContent><Switch checked={policy.login} onCheckedChange={onLoginChange} aria-label={`${name} 登录准入`} /></Field>
    </div>
    <div className="min-h-0 flex-1 px-3 pb-3 md:overflow-y-auto md:overscroll-contain"><PermissionTree platform={platform} grants={policy.grants} onChange={onGrantsChange} /></div>
  </section>
}

export function PermissionsDemo() {
  const timeZone = useTimezone()
  const [policies, setPolicies] = useState<Record<string, Policy>>(initialPolicies)
  const [saved, setSaved] = useState<Record<string, Policy>>(initialPolicies)
  const [roleId, setRoleId] = useState<string | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<"edit" | DetailTab>("preview")
  const [editReturnTab, setEditReturnTab] = useState<DetailTab>("preview")
  const [roleNameDraft, setRoleNameDraft] = useState("")
  const [roleIdDraft, setRoleIdDraft] = useState("")
  const [roleNameSearch, setRoleNameSearch] = useState("")
  const [roleIdSearch, setRoleIdSearch] = useState("")
  const [webAdmissionDraft, setWebAdmissionDraft] = useState<AdmissionFilter>("all")
  const [appAdmissionDraft, setAppAdmissionDraft] = useState<AdmissionFilter>("all")
  const [webAdmission, setWebAdmission] = useState<AdmissionFilter>("all")
  const [appAdmission, setAppAdmission] = useState<AdmissionFilter>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [candidateSearch, setCandidateSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [newRoleId, setNewRoleId] = useState<string | null>(null)
  const [newRolePolicy, setNewRolePolicy] = useState<Policy>(blankPolicy)
  const [discardNewRoleOpen, setDiscardNewRoleOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null)
  const [roleListOpen, setRoleListOpen] = useState(true)
  const [mobileList, setMobileList] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const current = readStoredState<HistoryEntry>(window.localStorage.getItem(STORAGE_KEY))
        if (current) {
          const completeHistory = ensureSuperAdminAppHistory(current.policies, current.history)
          setPolicies(current.policies)
          setSaved(current.policies)
          setHistory(completeHistory)
          if (completeHistory !== current.history) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ policies: current.policies, history: completeHistory }))
          return
        }
        const previousV5 = readStoredState<HistoryEntry>(window.localStorage.getItem(PREVIOUS_STORAGE_KEY))
        const previousV4 = previousV5 ? null : readStoredState<HistoryEntry>(window.localStorage.getItem(EARLIER_STORAGE_KEY))
        const previous = previousV5 || previousV4 ? null : readStoredState<LegacyHistoryEntry>(window.localStorage.getItem(OLDER_STORAGE_KEY)) ?? readStoredState<LegacyHistoryEntry>(window.localStorage.getItem(LEGACY_STATE_KEY))
        const oldPolicies = previousV5?.policies ?? previousV4?.policies ?? previous?.policies ?? readLegacyPolicies(window.localStorage.getItem(LEGACY_POLICY_KEY))
        const migratedPolicies = previousV5 ? migrateV5RolePolicies(previousV5.policies) : oldPolicies ? migrateOldRolePolicies(oldPolicies) : initialPolicies
        const previousHistory = previousV5?.history ?? previousV4?.history ?? migrateLegacyHistory(previous?.history ?? [])
        const migratedHistory = oldPolicies
          ? migratePresetHistory(oldPolicies, previousHistory, migratedPolicies, previousV5 ? `超级管理员全权限初始配置（${INITIALIZATION_VERSION}）` : `Excel 角色矩阵及超级管理员全权限（${INITIALIZATION_VERSION}）`)
          : initializeHistory(migratedPolicies, [])
        setPolicies(migratedPolicies)
        setSaved(migratedPolicies)
        setHistory(migratedHistory)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ policies: migratedPolicies, history: migratedHistory }))
      } catch { /* 使用演示初始值 */ }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const role = roles.find((item) => item.id === roleId)
  const policy = roleId ? policies[roleId] ?? blankPolicy() : blankPolicy()
  const dirty = workspaceMode === "edit" && !!roleId && JSON.stringify(policy) !== JSON.stringify(saved[roleId])
  const newRole = roleCatalog.find((item) => item.id === newRoleId)
  const newRoleDirty = JSON.stringify(newRolePolicy) !== JSON.stringify(blankPolicy())
  const configuredRoleList = useMemo(() => roles.filter((item) => Boolean(saved[item.id])), [saved])
  const roleIndex = configuredRoleList.findIndex((item) => item.id === roleId)
  const configuredRoles = useMemo(() => configuredRoleList.filter((item) => {
    const policy = saved[item.id]
    return item.name.toLowerCase().includes(roleNameSearch.trim().toLowerCase())
      && (!roleIdSearch.trim() || item.id.toLowerCase() === roleIdSearch.trim().toLowerCase())
      && (webAdmission === "all" || policy.web.login === (webAdmission === "allowed"))
      && (appAdmission === "all" || policy.app.login === (appAdmission === "allowed"))
  }), [configuredRoleList, saved, roleNameSearch, roleIdSearch, webAdmission, appAdmission])
  const currentPage = Math.min(page, Math.max(1, Math.ceil(configuredRoles.length / pageSize)))
  const visibleRoles = configuredRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const candidates = useMemo(() => roleCatalog.filter((item) => !saved[item.id] && `${item.name} ${item.id}`.toLowerCase().includes(candidateSearch.toLowerCase())), [saved, candidateSearch])
  const workspacePreviewPolicy = roleId ? saved[roleId] ?? null : null
  const workspaceHistory = useMemo(() => history.filter((item) => item.roleId === roleId).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), [history, roleId])
  const latestOperationByRole = useMemo(() => Object.fromEntries(roles.map((item) => [item.id, history.filter((entry) => entry.roleId === item.id).reduce<string | null>((latest, entry) => !latest || Date.parse(entry.at) > Date.parse(latest) ? entry.at : latest, null)])), [history])

  function submitRoleSearch() {
    setRoleNameSearch(roleNameDraft)
    setRoleIdSearch(roleIdDraft)
    setWebAdmission(webAdmissionDraft)
    setAppAdmission(appAdmissionDraft)
    setPage(1)
  }

  function resetRoleSearch() {
    setRoleNameDraft("")
    setRoleIdDraft("")
    setRoleNameSearch("")
    setRoleIdSearch("")
    setWebAdmissionDraft("all")
    setAppAdmissionDraft("all")
    setWebAdmission("all")
    setAppAdmission("all")
    setPage(1)
  }

  function updatePolicy(platform: Platform, next: Partial<Policy[Platform]>) {
    if (!roleId) return
    setPolicies((previous) => ({ ...previous, [roleId]: { ...(previous[roleId] ?? blankPolicy()), [platform]: { ...(previous[roleId] ?? blankPolicy())[platform], ...next } } }))
  }

  function changePermissions(platform: Platform, codes: string[], checked: boolean) {
    const before = policy[platform].grants
    const grants = changePermissionGrants(platform, before, codes, checked)
    const autoAdded = grants.filter((code) => !before.includes(code) && !codes.includes(code))
    const autoRemoved = before.filter((code) => !grants.includes(code) && !codes.includes(code))
    updatePolicy(platform, { grants })
    if (autoAdded.length) toast.info(`已同时勾选 ${autoAdded.length} 项所需权限`)
    if (autoRemoved.length) toast.info(`已同时取消 ${autoRemoved.length} 项依赖该权限的授权`)
  }

  function save() {
    if (!roleId || !role) return
    const before = saved[roleId]
    if (!before) return
    const changedPlatforms = (["web", "app"] as const).filter((platform) => JSON.stringify(before[platform]) !== JSON.stringify(policy[platform]))
    if (!changedPlatforms.length) return
    const batchId = crypto.randomUUID()
    const at = new Date().toISOString()
    const entries: HistoryEntry[] = changedPlatforms.map((platform) => {
      const added = policy[platform].grants.filter((code) => !before[platform].grants.includes(code))
      const removed = before[platform].grants.filter((code) => !policy[platform].grants.includes(code))
      return {
        id: `${batchId}-${platform}`,
        batchId,
        at,
        roleId,
        roleName: role.name,
        platform,
        changeType: platform === "web" ? "Web 权限更新" : "App 权限更新",
        operator: mockSession.user.name,
        permissions: [...added.map((code) => permissionAuditItem(platform, "新增", code)), ...removed.map((code) => permissionAuditItem(platform, "删除", code))],
        ...(before[platform].login !== policy[platform].login ? { admission: policy[platform].login } : {}),
      }
    })
    const next = { ...policies, [roleId]: policy }
    const nextHistory = [...entries, ...history]
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ policies: next, history: nextHistory }))
    } catch {
      toast.error("演示权限保存失败，请重试")
      return
    }
    setPolicies(next)
    setSaved(next)
    setHistory(nextHistory)
    setWorkspaceMode(editReturnTab)
    toast.success("演示权限已保存")
  }

  function openNewRole(id: string) {
    setNewRolePolicy(blankPolicy())
    setNewRoleId(id)
    setAddOpen(false)
  }

  function updateNewRolePolicy(platform: Platform, next: Partial<Policy[Platform]>) {
    setNewRolePolicy((previous) => ({ ...previous, [platform]: { ...previous[platform], ...next } }))
  }

  function changeNewRolePermissions(platform: Platform, codes: string[], checked: boolean) {
    setNewRolePolicy((previous) => ({
      ...previous,
      [platform]: { ...previous[platform], grants: changePermissionGrants(platform, previous[platform].grants, codes, checked) },
    }))
  }

  function requestCloseNewRole() {
    if (newRoleDirty) { setDiscardNewRoleOpen(true); return }
    setNewRoleId(null)
  }

  function saveNewRole() {
    if (!newRoleId || !newRole || saved[newRoleId]) return
    const batchId = crypto.randomUUID()
    const at = new Date().toISOString()
    const entries: HistoryEntry[] = (["web", "app"] as const).map((platform) => ({
      id: `${batchId}-${platform}`,
      batchId,
      at,
      roleId: newRoleId,
      roleName: newRole.name,
      platform,
      changeType: platform === "web" ? "Web 权限更新" : "App 权限更新",
      operator: mockSession.user.name,
      permissions: newRolePolicy[platform].grants.map((code) => permissionAuditItem(platform, "新增", code)),
      admission: newRolePolicy[platform].login,
      snapshot: { login: newRolePolicy[platform].login, grants: [...newRolePolicy[platform].grants] },
    }))
    const next = { ...saved, [newRoleId]: newRolePolicy }
    const nextHistory = [...entries, ...history]
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ policies: next, history: nextHistory }))
    } catch {
      toast.error("演示权限保存失败，请重试")
      return
    }
    setPolicies(next)
    setSaved(next)
    setHistory(nextHistory)
    setNewRoleId(null)
    toast.success("角色已加入配置列表，权限已保存")
  }

  function discardChanges() {
    if (roleId && saved[roleId]) setPolicies((previous) => ({ ...previous, [roleId]: saved[roleId] }))
  }

  function discardAndBack() {
    discardChanges()
    setRoleId(null)
    setWorkspaceMode("preview")
    setMobileList(false)
    setPendingNavigation(null)
  }

  function backToList() {
    if (dirty) { setPendingNavigation({ kind: "list" }); return }
    discardAndBack()
  }

  function switchRole(id: string) {
    if (id === roleId) { setMobileList(false); return }
    if (dirty) { setPendingNavigation({ kind: "role", roleId: id }); return }
    if (workspaceMode === "edit") setWorkspaceMode(editReturnTab)
    setRoleId(id)
    setMobileList(false)
  }

  function navigateToTab(tab: DetailTab) {
    if (workspaceMode === tab) return
    if (dirty) { setPendingNavigation({ kind: "tab", tab }); return }
    if (workspaceMode === "edit") discardChanges()
    setWorkspaceMode(tab)
  }

  function startEditing() {
    if (workspaceMode === "edit") return
    setEditReturnTab(workspaceMode)
    setWorkspaceMode("edit")
  }

  function cancelEditing() {
    discardChanges()
    setWorkspaceMode(editReturnTab)
  }

  function confirmNavigation() {
    if (!pendingNavigation) return
    if (pendingNavigation.kind === "list") { discardAndBack(); return }
    discardChanges()
    if (pendingNavigation.kind === "tab") {
      setWorkspaceMode(pendingNavigation.tab)
      setPendingNavigation(null)
      return
    }
    if (workspaceMode === "edit") setWorkspaceMode(editReturnTab)
    setRoleId(pendingNavigation.roleId)
    setMobileList(false)
    setPendingNavigation(null)
  }

  function switchAdjacentRole(offset: number) {
    const next = configuredRoleList[roleIndex + offset]
    if (next) switchRole(next.id)
  }

  function openRoleWorkspace(id: string, mode: DetailTab) {
    setRoleListOpen(true)
    setMobileList(false)
    setWorkspaceMode(mode)
    setRoleId(id)
  }

  function openRoleEditor(id: string) {
    setRoleListOpen(true)
    setMobileList(false)
    setEditReturnTab("preview")
    setWorkspaceMode("edit")
    setRoleId(id)
  }

  return <div className={cn("flex min-w-0 w-full flex-col gap-4", roleId && "h-[calc(100dvh-5.5rem)] min-h-[32rem]")}>
    {roleId && <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Button variant="outline" size="sm" onClick={backToList}><ArrowLeftIcon data-icon="inline-start" />{dirty ? "取消修改并返回" : "返回列表"}</Button><h1 className="truncate text-base font-medium">系统权限</h1></div><div className="flex items-center gap-2"><Button variant="outline" size="icon-sm" className="hidden lg:inline-flex" aria-label={roleListOpen ? "收起角色列表" : "展开角色列表"} aria-expanded={roleListOpen} aria-controls="permission-role-list" onClick={() => setRoleListOpen(!roleListOpen)}><ListIcon /></Button><span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{`${roleIndex + 1} / ${configuredRoleList.length}`}</span><Button variant="outline" size="icon-sm" aria-label="上一角色" disabled={roleIndex <= 0} onClick={() => switchAdjacentRole(-1)}><ChevronLeftIcon /></Button><Button variant="outline" size="icon-sm" aria-label="下一角色" disabled={roleIndex < 0 || roleIndex >= configuredRoleList.length - 1} onClick={() => switchAdjacentRole(1)}><ChevronRightIcon /></Button><Button variant="outline" size="sm" className="lg:hidden" aria-expanded={mobileList} aria-controls="permission-role-list" onClick={() => setMobileList(!mobileList)}><ListIcon data-icon="inline-start" />{mobileList ? workspaceMode === "history" ? "查看记录" : "查看权限" : "切换角色"}</Button></div></header>}
    {!roleId ? <Table variant="grid" aria-label="系统权限已配置角色列表" className="sm:min-w-[980px]" viewportClassName="mx-4 mb-4 rounded-lg border" toolbar={
        <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); submitRoleSearch() }}>
          <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field><FieldLabel htmlFor="role-name-filter">角色名称</FieldLabel><Input id="role-name-filter" value={roleNameDraft} onChange={(event) => setRoleNameDraft(event.target.value)} placeholder="输入角色名称" /></Field>
            <Field><FieldLabel htmlFor="role-id-filter">角色 ID</FieldLabel><Input id="role-id-filter" value={roleIdDraft} onChange={(event) => setRoleIdDraft(event.target.value)} placeholder="输入角色 ID" /></Field>
            <Field><FieldLabel htmlFor="web-admission-filter">Web 准入</FieldLabel><Select value={webAdmissionDraft} onValueChange={(value) => setWebAdmissionDraft(value as AdmissionFilter)}><SelectTrigger id="web-admission-filter" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem value="allowed">允许</SelectItem><SelectItem value="blocked">禁止</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field><FieldLabel htmlFor="app-admission-filter">App 准入</FieldLabel><Select value={appAdmissionDraft} onValueChange={(value) => setAppAdmissionDraft(value as AdmissionFilter)}><SelectTrigger id="app-admission-filter" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部</SelectItem><SelectItem value="allowed">允许</SelectItem><SelectItem value="blocked">禁止</SelectItem></SelectGroup></SelectContent></Select></Field>
          </FieldGroup>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" onClick={() => { setCandidateSearch(""); setAddOpen(true) }}><PlusIcon data-icon="inline-start" />新增角色</Button>
            <div className="ml-auto flex items-center gap-2"><Button type="submit"><SearchIcon data-icon="inline-start" />查询</Button><Button type="button" variant="outline" onClick={resetRoleSearch}><RotateCcwIcon data-icon="inline-start" />重置</Button></div>
          </div>
        </form>
      } footer={<DataPagination page={currentPage} pageSize={pageSize} total={configuredRoles.length} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />}><TableHeader><TableRow><TableHead>角色名称 / ID</TableHead><TableHead>DMS 状态</TableHead><TableHead>Web 准入</TableHead><TableHead>App 准入</TableHead><TableHead title={`当前时区：${timeZone}`}>最新操作时间</TableHead><TableHead sticky="right" className="w-14 min-w-14 text-center md:w-56 md:min-w-56">操作</TableHead></TableRow></TableHeader><TableBody>{visibleRoles.map((item) => <TableRow key={item.id} className="cursor-pointer focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring" tabIndex={0} aria-label={`查看 ${item.name} 的权限`} onClick={() => openRoleWorkspace(item.id, "preview")} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openRoleWorkspace(item.id, "preview") } }}><TableCell><span className="font-medium">{item.name}</span><span className="block text-muted-foreground">{item.id} · {item.level}</span></TableCell><TableCell><Badge variant="secondary" size="sm">启用</Badge></TableCell><TableCell><LoginAccessBadge allowed={saved[item.id].web.login} /></TableCell><TableCell><LoginAccessBadge allowed={saved[item.id].app.login} /></TableCell><TableCell className="tabular-nums">{latestOperationByRole[item.id] ? formatDateTime(latestOperationByRole[item.id]!, { timeZone }) : "—"}</TableCell><TableCell sticky="right" className="w-14 min-w-14 text-center md:w-56 md:min-w-56" onClick={(event) => event.stopPropagation()}>
              <div className="hidden items-center justify-center gap-1 md:flex"><Button variant="link" size="xs" onClick={() => openRoleEditor(item.id)}>编辑</Button><Button variant="link" size="xs" onClick={() => openRoleWorkspace(item.id, "preview")}>查看权限</Button><Button variant="link" size="xs" onClick={() => openRoleWorkspace(item.id, "history")}>操作记录</Button></div>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={item.name + " 更多操作"}><MoreHorizontalIcon /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onSelect={() => openRoleEditor(item.id)}>编辑</DropdownMenuItem><DropdownMenuItem onSelect={() => openRoleWorkspace(item.id, "preview")}>查看权限</DropdownMenuItem><DropdownMenuItem onSelect={() => openRoleWorkspace(item.id, "history")}>操作记录</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
            </TableCell></TableRow>)}{configuredRoles.length === 0 && <TableRow><TableCell colSpan={6}><Empty className="min-h-40"><EmptyHeader><EmptyTitle>没有匹配的角色</EmptyTitle><EmptyDescription>请调整角色名称、角色 ID 或准入条件。</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}</TableBody></Table> : <div className={cn("grid min-h-0 min-w-0 flex-1 gap-4", roleListOpen && "lg:grid-cols-[224px_minmax(0,1fr)]")}>
      <Card className={cn("min-h-0 min-w-0 gap-0 py-0", mobileList ? "flex" : "hidden", roleListOpen ? "lg:flex" : "lg:hidden")}><aside id="permission-role-list" aria-label="已配置角色列表" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2" aria-label="切换已配置角色"><ul className="flex flex-col gap-2">{configuredRoleList.map((item) => <li key={item.id}><Button variant="outline" size="sm" aria-current={item.id === roleId ? "true" : undefined} className="h-auto min-h-16 w-full flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left whitespace-normal aria-current:text-brand-ink" onClick={() => switchRole(item.id)}><span className="font-medium">{item.name}</span><span className="break-all text-xs text-muted-foreground">{item.id} · {item.level}</span></Button></li>)}</ul></nav>
      </aside></Card>
      <Card className={cn("min-h-0 min-w-0 gap-0 py-0", mobileList && "hidden lg:flex")}>
        <CardHeader className="flex shrink-0 flex-row flex-wrap items-start justify-between gap-3 py-4">
          <CardTitle>{role?.name}</CardTitle>
          {workspaceMode === "edit" && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => navigateToTab("preview")}>查看权限</Button><Button variant="outline" size="sm" onClick={() => navigateToTab("history")}>操作记录</Button></div>}
        </CardHeader>
        {workspaceMode === "edit" ? <>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 md:overflow-hidden">
            <div className="grid min-h-0 md:h-full md:grid-cols-2">
              <PermissionPlatformPanel platform="web" policy={policy.web} onLoginChange={(login) => updatePolicy("web", { login })} onGrantsChange={(codes, checked) => changePermissions("web", codes, checked)} />
              <PermissionPlatformPanel platform="app" policy={policy.app} onLoginChange={(login) => updatePolicy("app", { login })} onGrantsChange={(codes, checked) => changePermissions("app", codes, checked)} />
            </div>
          </CardContent>
          <CardFooter className="shrink-0 flex-wrap justify-between gap-3 border-t bg-card pb-4"><p className="text-xs text-muted-foreground" aria-live="polite">{dirty ? "权限修改尚未保存" : "当前权限已保存"}</p><div className="flex gap-2"><Button variant="outline" onClick={cancelEditing}>取消</Button><Button disabled={!dirty} onClick={save}><CheckIcon data-icon="inline-start" />保存权限</Button></div></CardFooter>
        </> : <Tabs value={workspaceMode} onValueChange={(value) => navigateToTab(value as DetailTab)} className="min-h-0 min-w-0 flex-1 gap-0">
          <div className="shrink-0 px-6"><TabsList variant="line" aria-label="角色详情"><TabsTrigger value="preview">查看权限</TabsTrigger><TabsTrigger value="history">操作记录</TabsTrigger></TabsList></div>
          <TabsContent value="preview" className="min-h-0 min-w-0 overflow-y-auto px-4 py-4"><PermissionPreviewContent policy={workspacePreviewPolicy} /></TabsContent>
          <TabsContent value="history" className="min-h-0 min-w-0 overflow-y-auto px-6 py-6"><OperationTimeline entries={workspaceHistory} timeZone={timeZone} /></TabsContent>
          <CardFooter className="shrink-0 justify-end border-t bg-card pb-4"><Button onClick={startEditing}>编辑</Button></CardFooter>
        </Tabs>}
      </Card></div>}
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent className="p-[30px] sm:max-w-lg">
        <DialogHeader><DialogTitle>新增角色</DialogTitle><DialogDescription>从 DMS 已启用的车队级别角色中选择尚未配置的角色；不会在 DMS 创建角色。</DialogDescription></DialogHeader>
        <div className="flex flex-col gap-3">
          <Field><FieldLabel htmlFor="candidate-search">搜索 DMS 角色</FieldLabel><Input id="candidate-search" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} placeholder="角色名称或 ID" /></Field>
          <div className="max-h-72 overflow-y-auto rounded-lg border">{candidates.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b p-3 last:border-b-0"><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.id} · {item.level} · 启用</p></div><Button variant="outline" size="sm" onClick={() => openNewRole(item.id)}>选择并配置</Button></div>)}{candidates.length === 0 && <Empty className="min-h-40"><EmptyHeader><EmptyTitle>暂无可新增角色</EmptyTitle><EmptyDescription>请先在 DMS 创建或启用车队级别角色。</EmptyDescription></EmptyHeader></Empty>}</div>
        </div>
      </DialogContent>
    </Dialog>
    <Sheet open={Boolean(newRoleId)} onOpenChange={(open) => { if (!open) requestCloseNewRole() }}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none md:data-[side=right]:w-[80vw] md:data-[side=right]:max-w-4xl" onEscapeKeyDown={(event) => { if (newRoleDirty) { event.preventDefault(); setDiscardNewRoleOpen(true) } }} onInteractOutside={(event) => { if (newRoleDirty) { event.preventDefault(); setDiscardNewRoleOpen(true) } }}>
        <SheetHeader className="shrink-0 border-b px-[30px] py-[30px]"><SheetTitle>配置角色权限 · {newRole?.name}</SheetTitle><SheetDescription>{newRole?.id} · 首次配置；保存后加入已配置角色列表。</SheetDescription></SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden"><div className="grid min-h-full md:h-full md:grid-cols-2">
          <PermissionPlatformPanel platform="web" policy={newRolePolicy.web} onLoginChange={(login) => updateNewRolePolicy("web", { login })} onGrantsChange={(codes, checked) => changeNewRolePermissions("web", codes, checked)} />
          <PermissionPlatformPanel platform="app" policy={newRolePolicy.app} onLoginChange={(login) => updateNewRolePolicy("app", { login })} onGrantsChange={(codes, checked) => changeNewRolePermissions("app", codes, checked)} />
        </div></div>
        <SheetFooter className="shrink-0 flex-row flex-wrap items-center justify-end border-t px-[30px] py-[18px]"><Button variant="outline" onClick={requestCloseNewRole}>取消</Button><Button onClick={saveNewRole}><CheckIcon data-icon="inline-start" />保存并加入列表</Button></SheetFooter>
      </SheetContent>
    </Sheet>
    <AlertDialog open={discardNewRoleOpen} onOpenChange={setDiscardNewRoleOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>放弃首次配置？</AlertDialogTitle><AlertDialogDescription>当前 Web 和 App 权限草稿将被取消，角色仍可在「新增角色」中选择。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={() => setDiscardNewRoleOpen(false)}>继续配置</Button><Button variant="destructive" onClick={() => { setDiscardNewRoleOpen(false); setNewRoleId(null); setNewRolePolicy(blankPolicy()) }}>放弃配置</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(pendingNavigation)} onOpenChange={(open) => { if (!open) setPendingNavigation(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>放弃未保存的权限修改？</AlertDialogTitle><AlertDialogDescription>{pendingNavigation?.kind === "role" ? "切换角色后，当前角色尚未保存的 Web 和 App 设置将被取消。" : pendingNavigation?.kind === "tab" ? "切换详情页签后，当前角色尚未保存的 Web 和 App 设置将被取消。" : "返回列表后，当前角色尚未保存的 Web 和 App 设置将被取消。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={() => setPendingNavigation(null)}>继续编辑</Button><Button variant="destructive" onClick={confirmNavigation}>{pendingNavigation?.kind === "role" ? "放弃修改并切换" : pendingNavigation?.kind === "tab" ? "放弃修改并查看" : "放弃修改并返回"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
