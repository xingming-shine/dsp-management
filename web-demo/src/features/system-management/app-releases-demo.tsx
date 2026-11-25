"use client"

import { useEffect, useMemo, useState } from "react"
import { PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DataPagination } from "@/components/ui/pagination"
import { PeriodPicker } from "@/components/ui/period-picker"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useTimezone } from "@/features/preferences/timezone-store"
import { DmsOrgTreePicker, DmsOrgTreeView } from "./dms-org-tree-picker"
import { invalidDspIds, loadDemoDmsOrgTree, type DmsOrgSnapshot } from "./dms-org-tree-demo"
import { formatDateTime } from "@/lib/date-time"
import { mockSession } from "@/mocks/session"

type Status = "enabled" | "withdrawn" | "disabled"
type Platform = "Android" | "iOS"
type ReminderPolicy = "daily" | "three_days"
type Release = {
  id: string; version: string; platform: Platform
  requirement: "suggest" | "force"; reminderPolicy: ReminderPolicy | null; scope: "all" | "gray"; targets: string[]
  storeUrl: string; privateUrl: string; minVersion: string; notes: string
  publishAt: string; status: Status; disabledAt: string | null; disabledBy: string | null
}
type StoredRelease = Omit<Release, "status" | "reminderPolicy" | "disabledAt" | "disabledBy"> & { status: Status | "gray" | "full" | "stopped" | "draft" | "scheduled" | "paused"; reminderPolicy?: ReminderPolicy | null; disabledAt?: string | null; disabledBy?: string | null; events?: { at: string; title: string; operator: string }[]; build?: string; minBuild?: string; type?: "normal" | "hot"; hotKey?: string; hotMaxBuild?: string }
type DisabledVersion = { id: string; platform: Platform; version: string; at: string; reason: string }
type StoredDisabledVersion = DisabledVersion & { build?: string }
type PendingAction = { kind: "withdraw" | "enable" | "disable" | "restore"; releaseId: string }
type DiscardIntent = { kind: "action"; action: PendingAction } | null

const sample: Release[] = [
  { id: "r-1", version: "2.8.0", platform: "Android", requirement: "suggest", reminderPolicy: "three_days", scope: "gray", targets: ["org-1", "org-2"], storeUrl: "https://play.google.com/store/apps/details?id=example.dsp", privateUrl: "", minVersion: "", notes: "优化任务列表与扫描反馈。", publishAt: "2026-11-19T09:00:00Z", status: "enabled", disabledAt: null, disabledBy: null },
  { id: "r-2", version: "2.7.2", platform: "iOS", requirement: "force", reminderPolicy: null, scope: "all", targets: [], storeUrl: "https://apps.apple.com/app/example-dsp/id000000", privateUrl: "", minVersion: "", notes: "修复登录稳定性问题。", publishAt: "2026-11-15T09:00:00Z", status: "enabled", disabledAt: null, disabledBy: null },
]
const emptyRelease = (): Release => ({ id: "", version: "", platform: "Android", requirement: "suggest", reminderPolicy: null, scope: "gray", targets: [], storeUrl: "", privateUrl: "", minVersion: "", notes: "", publishAt: "", status: "enabled", disabledAt: null, disabledBy: null })
const storageKey = "dsp-app-releases-demo-v2"
const disabledKey = "dsp-disabled-builds-demo-v2"
const statusText: Record<Status, string> = { enabled: "启用", withdrawn: "已撤回", disabled: "已禁用" }
const actionText: Record<PendingAction["kind"], string> = { withdraw: "撤回", enable: "启用", disable: "禁用版本", restore: "解除禁用" }
const reminderText: Record<ReminderPolicy, string> = { daily: "每天一次", three_days: "每三天一次" }
function ReminderPolicyOptions({ value, onValueChange, idPrefix }: { value: ReminderPolicy | null | ""; onValueChange: (value: ReminderPolicy) => void; idPrefix: string }) {
  return <RadioGroup value={value ?? ""} onValueChange={(next) => onValueChange(next as ReminderPolicy)} className="flex flex-wrap items-center gap-x-8 gap-y-3" aria-label="提醒策略">
    <Field orientation="horizontal" className="w-auto gap-2"><RadioGroupItem id={`${idPrefix}-daily`} value="daily" /><FieldLabel htmlFor={`${idPrefix}-daily`}>每天一次</FieldLabel></Field>
    <Field orientation="horizontal" className="w-auto gap-2"><RadioGroupItem id={`${idPrefix}-three-days`} value="three_days" /><FieldLabel htmlFor={`${idPrefix}-three-days`}>每三天一次</FieldLabel></Field>
  </RadioGroup>
}
function StaticReleaseField({ label, value }: { label: string; value: string }) {
  return <Field><FieldLabel>{label}</FieldLabel><p className="min-h-9 break-all py-2 text-sm">{value || "—"}</p></Field>
}
const versionPattern = /^\d+(?:\.\d+)*$/
function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
function publishTimeToIso(value: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const wallTime = Date.parse(`${value}:00Z`)
  if (Number.isNaN(wallTime)) return null
  const offsetFormatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
  const wallFormatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  const offsets = [wallTime - 86_400_000, wallTime, wallTime + 86_400_000].map((instant) => {
    const offset = offsetFormatter.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value ?? "GMT"
    const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offset)
    return match ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0
  })
  for (const offset of new Set(offsets)) {
    const instant = wallTime - offset * 60_000
    const parts = Object.fromEntries(wallFormatter.formatToParts(instant).map((part) => [part.type, part.value]))
    if (`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` === value) return new Date(instant).toISOString()
  }
  return null
}
function compareVersions(left: string, right: string) {
  if (!versionPattern.test(left) || !versionPattern.test(right)) return Number.NaN
  const leftParts = left.split(".").map(BigInt)
  const rightParts = right.split(".").map(BigInt)
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index] ?? BigInt(0)
    const rightPart = rightParts[index] ?? BigInt(0)
    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1
  }
  return 0
}
function statusVariant(status: Status): "success" | "warning" | "destructive" {
  if (status === "enabled") return "success"
  if (status === "disabled") return "destructive"
  return "warning"
}

function readStoredReleases(stored: StoredRelease[], legacyDisabled: StoredDisabledVersion[]): Release[] {
  const source: StoredRelease[] = Array.isArray(stored) ? stored : sample
  return source.flatMap((item) => {
    if (!item || item.type === "hot" || item.status === "draft" || item.status === "scheduled") return []
    const oldDisable = legacyDisabled.find((entry) => entry.platform === item.platform && (entry.version === item.version || (!entry.version && entry.build && entry.build === item.build)))
    const status: Status = oldDisable || item.status === "disabled" ? "disabled" : item.status === "withdrawn" || item.status === "stopped" || item.status === "paused" ? "withdrawn" : "enabled"
    const lastDisable = Array.isArray(item.events) ? item.events.find((entry) => entry.title === "禁用版本") : undefined
    const storedFields = { ...item }
    delete storedFields.events
    delete storedFields.build
    delete storedFields.minBuild
    delete storedFields.type
    delete storedFields.hotKey
    delete storedFields.hotMaxBuild
    const release: Release = { ...storedFields, status, reminderPolicy: item.requirement === "force" ? null : item.reminderPolicy === "daily" ? "daily" : "three_days", scope: item.status === "gray" ? "gray" : item.status === "full" ? "all" : item.scope, minVersion: item.minVersion ?? "", disabledAt: status === "disabled" ? item.disabledAt ?? oldDisable?.at ?? lastDisable?.at ?? null : null, disabledBy: status === "disabled" ? item.disabledBy ?? lastDisable?.operator ?? (oldDisable ? "演示数据" : null) : null }
    return [release]
  })
}

export function AppReleasesDemo() {
  const timeZone = useTimezone()
  const today = todayInTimeZone(timeZone)
  const [releases, setReleases] = useState<Release[]>(sample)
  const [mode, setMode] = useState<"form" | "detail" | "manage" | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Release>(emptyRelease)
  const [formInitial, setFormInitial] = useState("")
  const [publishAtInput, setPublishAtInput] = useState("")
  const [installConfirmed, setInstallConfirmed] = useState(false)
  const [closePending, setClosePending] = useState(false)
  const [discardIntent, setDiscardIntent] = useState<DiscardIntent>(null)
  const [manageReminderDraft, setManageReminderDraft] = useState<ReminderPolicy | "">("")
  const [manageRequirementDraft, setManageRequirementDraft] = useState<Release["requirement"]>("suggest")
  const [manageNotesDraft, setManageNotesDraft] = useState("")
  const [impactSavePending, setImpactSavePending] = useState(false)
  const [manageScopeDraft, setManageScopeDraft] = useState<Release["scope"]>("gray")
  const [grayTargets, setGrayTargets] = useState<string[]>([])
  const [orgSnapshot, setOrgSnapshot] = useState<DmsOrgSnapshot | null>(null)
  const [orgSyncing, setOrgSyncing] = useState(true)
  const [orgSyncError, setOrgSyncError] = useState(false)
  const [draftOrgVersion, setDraftOrgVersion] = useState("")
  const [grayOrgVersion, setGrayOrgVersion] = useState("")
  const [searchDraft, setSearchDraft] = useState("")
  const [platformDraft, setPlatformDraft] = useState("all")
  const [statusDraft, setStatusDraft] = useState("all")
  const [dateRangeDraft, setDateRangeDraft] = useState<{ start: string; end: string } | null>(null)
  const [filters, setFilters] = useState({ search: "", platform: "all", status: "all", from: "", to: "" })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [pending, setPending] = useState<PendingAction | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(storageKey)
        const oldDisabled = window.localStorage.getItem(disabledKey)
        const legacyDisabled = oldDisabled ? JSON.parse(oldDisabled) as StoredDisabledVersion[] : []
        if (stored || oldDisabled) {
          const releases = readStoredReleases(stored ? JSON.parse(stored) as StoredRelease[] : sample, Array.isArray(legacyDisabled) ? legacyDisabled : [])
          setReleases(releases)
          window.localStorage.setItem(storageKey, JSON.stringify(releases))
          window.localStorage.removeItem(disabledKey)
        }
      } catch { /* 演示初始值 */ }
      void loadDemoDmsOrgTree().then(setOrgSnapshot).catch(() => setOrgSyncError(true)).finally(() => setOrgSyncing(false))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const active = releases.find((item) => item.id === activeId)
  const visible = useMemo(() => releases.filter((item) =>
    (filters.platform === "all" || item.platform === filters.platform) &&
    (filters.status === "all" || item.status === filters.status) &&
    (!filters.from || Boolean(item.publishAt && new Date(item.publishAt).getTime() >= new Date(filters.from).getTime())) &&
    (!filters.to || Boolean(item.publishAt && new Date(item.publishAt).getTime() <= new Date(filters.to).getTime())) &&
    item.version.includes(filters.search)
  ), [releases, filters])
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visible.length / pageSize)))
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const requirementDirty = mode === "manage" && manageRequirementDraft !== active?.requirement
  const notesDirty = mode === "manage" && manageNotesDraft !== active?.notes
  const reminderDirty = mode === "manage" && manageRequirementDraft === "suggest" && manageReminderDraft !== active?.reminderPolicy
  const added = grayTargets.filter((id) => !active?.targets.includes(id))
  const removed = active?.targets.filter((id) => !grayTargets.includes(id)) ?? []
  const rangeDirty = mode === "manage" && (manageScopeDraft !== active?.scope || (manageScopeDraft === "gray" && (added.length > 0 || removed.length > 0)))
  const manageDirty = Boolean(requirementDirty || notesDirty || reminderDirty || rangeDirty)
  const expandingRange = active?.scope === "gray" && manageScopeDraft === "all" && rangeDirty
  const makingForce = active?.requirement === "suggest" && manageRequirementDraft === "force" && requirementDirty

  function commit(next: Release[]) { setReleases(next); window.localStorage.setItem(storageKey, JSON.stringify(next)); window.localStorage.removeItem(disabledKey) }
  function openForm() { const next = emptyRelease(); setDraftOrgVersion(orgSnapshot?.version ?? ""); setDraft(next); setFormInitial(JSON.stringify(next)); setPublishAtInput(""); setInstallConfirmed(false); setMode("form") }
  function openDetail(item: Release) { setActiveId(item.id); setMode("detail") }
  function openManage(item: Release) { setActiveId(item.id); setManageRequirementDraft(item.requirement); setManageReminderDraft(item.reminderPolicy ?? ""); setManageNotesDraft(item.notes); setManageScopeDraft(item.scope); setGrayTargets([...item.targets]); setGrayOrgVersion(orgSnapshot?.version ?? ""); setMode("manage") }
  function changeManageRequirement(requirement: Release["requirement"]) {
    setManageRequirementDraft(requirement)
    setManageReminderDraft(requirement === "force" ? "" : active?.requirement === "suggest" ? active.reminderPolicy ?? "" : "")
  }
  function resetManageDrafts() {
    setManageRequirementDraft(active?.requirement ?? "suggest")
    setManageReminderDraft(active?.reminderPolicy ?? "")
    setManageNotesDraft(active?.notes ?? "")
    setManageScopeDraft(active?.scope ?? "gray")
    setGrayTargets(active?.targets ?? [])
  }
  function begin(next: PendingAction) { setPending(next) }
  function cancelManage() { requestClose() }
  function beginFromManage(action: PendingAction) {
    if (manageDirty) { setDiscardIntent({ kind: "action", action }); setClosePending(true); return }
    begin(action)
  }
  function discardChanges() {
    const intent = discardIntent
    setClosePending(false)
    setDiscardIntent(null)
    if (intent?.kind === "action") {
      resetManageDrafts()
      begin(intent.action)
      return
    }
    setMode(null)
  }
  function requestClose() {
    if (mode === "form" && (JSON.stringify(draft) !== formInitial || publishAtInput || installConfirmed)) { setClosePending(true); return }
    if (manageDirty) { setDiscardIntent(null); setClosePending(true); return }
    setMode(null)
  }
  function saveManage(impactConfirmed = false) {
    if (!active || mode !== "manage" || active.status === "disabled" || !manageDirty) return
    if (!manageNotesDraft.trim()) { toast.error("请填写发布内容"); return }
    if (manageRequirementDraft === "suggest" && !manageReminderDraft) { toast.error("请选择非强制更新的提醒策略"); return }
    if (rangeDirty && manageScopeDraft === "gray") {
      if (!grayTargets.length) { toast.error("灰度名单至少保留一个 DSP；如需停止推送，请使用撤回"); return }
      if (!orgSnapshot || orgSyncing || orgSyncError || grayOrgVersion !== orgSnapshot.version) { toast.error("组织树已变化，请重新同步后再保存"); return }
      if (invalidDspIds(grayTargets, orgSnapshot).length) { toast.error("灰度名单中有失效 DSP，请先移除"); return }
    }
    if ((makingForce || expandingRange) && !impactConfirmed) { setImpactSavePending(true); return }
    commit(releases.map((item) => item.id === active.id ? {
      ...item,
      requirement: manageRequirementDraft,
      reminderPolicy: manageRequirementDraft === "force" ? null : manageReminderDraft as ReminderPolicy,
      notes: manageNotesDraft.trim(),
      scope: rangeDirty ? manageScopeDraft : item.scope,
      targets: rangeDirty ? manageScopeDraft === "gray" ? [...grayTargets] : [] : item.targets,
    } : item))
    setManageNotesDraft(manageNotesDraft.trim())
    setImpactSavePending(false)
    toast.success("修改已保存（演示）")
  }
  function publish() {
    const publishAt = publishTimeToIso(publishAtInput, timeZone)
    if (!versionPattern.test(draft.version.trim())) { toast.error("请输入数字及点号组成的版本号，例如 2.9.0"); return }
    if (draft.minVersion.trim() && (!versionPattern.test(draft.minVersion.trim()) || compareVersions(draft.minVersion.trim(), draft.version.trim()) > 0)) { toast.error("最低兼容版本号须不高于当前版本号"); return }
    if (!draft.notes.trim()) { toast.error("请填写发布内容"); return }
    if (draft.requirement === "suggest" && !draft.reminderPolicy) { toast.error("请选择非强制更新的提醒策略"); return }
    if (!publishAt) { toast.error("请填写当前时区下有效的发布时间"); return }
    if (new Date(publishAt).getTime() > Date.now()) { toast.error("发布时间不能晚于当前时间"); return }
    if (!draft.storeUrl.trim() && !draft.privateUrl.trim()) { toast.error("请填写至少一个安装地址"); return }
    if ([draft.storeUrl, draft.privateUrl].some((value) => value.trim() && !/^https?:\/\//i.test(value.trim()))) { toast.error("安装地址须以 http:// 或 https:// 开头"); return }
    if (!installConfirmed) { toast.error("请确认目标版本已在分发渠道可安装"); return }
    if (draft.scope === "gray" && !draft.targets.length) { toast.error("请至少选择一个灰度 DSP"); return }
    if (draft.scope === "gray" && (!orgSnapshot || orgSyncing || orgSyncError || draftOrgVersion !== orgSnapshot.version)) { toast.error("请重新同步 DMS 组织树后选择灰度 DSP"); return }
    if (draft.scope === "gray" && invalidDspIds(draft.targets, orgSnapshot).length) { toast.error("灰度名单中有失效 DSP，请先移除"); return }
    if (releases.some((item) => item.platform === draft.platform && compareVersions(item.version, draft.version.trim()) === 0)) { toast.error("该平台版本号已有发布记录"); return }
    const next: Release = { ...draft, id: crypto.randomUUID(), version: draft.version.trim(), reminderPolicy: draft.requirement === "force" ? null : draft.reminderPolicy, minVersion: draft.minVersion.trim(), status: "enabled", targets: draft.scope === "all" ? [] : draft.targets, publishAt }
    commit([next, ...releases])
    setMode(null); toast.success("版本已发布（演示）")
  }
  function confirmAction() {
    if (!pending) return
    const item = releases.find((release) => release.id === pending.releaseId)
    if (!item) return
    const valid = pending.kind === "withdraw" ? item.status === "enabled"
      : pending.kind === "enable" ? item.status === "withdrawn"
      : pending.kind === "disable" ? item.status !== "disabled"
      : item.status === "disabled"
    if (!valid) { toast.error("版本状态已变化，请刷新后重试"); setPending(null); return }
    const nextStatus: Status = pending.kind === "disable" ? "disabled" : pending.kind === "restore" || pending.kind === "withdraw" ? "withdrawn" : "enabled"
    commit(releases.map((release) => release.id === item.id ? { ...release, status: nextStatus, disabledAt: pending.kind === "disable" ? new Date().toISOString() : pending.kind === "restore" ? null : release.disabledAt, disabledBy: pending.kind === "disable" ? mockSession.user.name : pending.kind === "restore" ? null : release.disabledBy } : release))
    toast.success(`${actionText[pending.kind]}已生效（演示）`); setPending(null)
  }
  async function refreshOrgTree() {
    setOrgSyncing(true); setOrgSyncError(false)
    try {
      const snapshot = await loadDemoDmsOrgTree()
      setOrgSnapshot(snapshot)
      if (mode === "form") setDraftOrgVersion(snapshot.version)
      if (mode === "manage") setGrayOrgVersion(snapshot.version)
      toast.success("组织树已同步（演示）")
    }
    catch { setOrgSyncError(true); toast.error("组织树同步失败，请重试") }
    finally { setOrgSyncing(false) }
  }
  function changeDraftTargets(ids: string[]) { setDraftOrgVersion(orgSnapshot?.version ?? ""); setDraft((item) => ({ ...item, targets: ids })) }
  function changeGrayTargets(ids: string[]) { setGrayOrgVersion(orgSnapshot?.version ?? ""); setGrayTargets(ids) }

  function applyFilters() {
    const from = dateRangeDraft ? publishTimeToIso(`${dateRangeDraft.start}T00:00`, timeZone) : ""
    const to = dateRangeDraft ? publishTimeToIso(`${dateRangeDraft.end}T23:59`, timeZone) : ""
    if (dateRangeDraft && (!from || !to)) { toast.error("请选择当前时区下有效的发布时间范围"); return }
    setFilters({ search: searchDraft.trim(), platform: platformDraft, status: statusDraft, from: from ?? "", to: to ? new Date(new Date(to).getTime() + 59_999).toISOString() : "" }); setPage(1)
  }
  function resetFilters() {
    setSearchDraft(""); setPlatformDraft("all"); setStatusDraft("all"); setDateRangeDraft(null)
    setFilters({ search: "", platform: "all", status: "all", from: "", to: "" }); setPage(1)
  }

  const pendingRelease = releases.find((item) => item.id === pending?.releaseId)

  const filterToolbar = <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); applyFilters() }}>
    <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field><FieldLabel htmlFor="release-search">版本号</FieldLabel><Input id="release-search" placeholder="请输入版本号" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} /></Field>
      <Field><FieldLabel htmlFor="release-platform">平台</FieldLabel><Select value={platformDraft} onValueChange={setPlatformDraft}><SelectTrigger id="release-platform" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部平台</SelectItem><SelectItem value="Android">Android</SelectItem><SelectItem value="iOS">iOS</SelectItem></SelectGroup></SelectContent></Select></Field>
      <Field><FieldLabel htmlFor="release-status">发布状态</FieldLabel><Select value={statusDraft} onValueChange={setStatusDraft}><SelectTrigger id="release-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部状态</SelectItem>{(Object.keys(statusText) as Status[]).map((status) => <SelectItem key={status} value={status}>{statusText[status]}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
      <PeriodPicker triggerClassName="max-w-none" label="发布时间" selection={{ mode: "day", value: dateRangeDraft?.end ?? today, range: dateRangeDraft ?? { start: today, end: today } }} onChange={(selection) => setDateRangeDraft(selection.range ?? { start: selection.value, end: selection.value })} rangeOnly modes={["day"]} showGranularity={false} timeZone={timeZone} placeholder={dateRangeDraft ? undefined : "请选择发布时间范围"} />
    </FieldGroup>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button type="button" onClick={openForm}><PlusIcon data-icon="inline-start" />新建版本</Button>
      <div className="ml-auto flex items-center gap-2"><Button type="submit"><SearchIcon data-icon="inline-start" />查询</Button><Button type="button" variant="outline" onClick={resetFilters}><RotateCcwIcon data-icon="inline-start" />重置</Button></div>
    </div>
  </form>

  return <div className="flex min-w-0 w-full flex-col gap-6">
    <header><h1 className="text-2xl font-semibold">App 版本发布</h1><p className="mt-1 text-sm text-muted-foreground">管理版本策略、灰度名单及旧版本禁用；安装包由现有分发渠道提供。</p></header>
    <Table aria-label="App 版本记录" className="min-w-[350px] sm:min-w-[1040px]" viewportClassName="mx-4 mb-4 rounded-lg border" toolbar={filterToolbar} footer={<DataPagination page={currentPage} pageSize={pageSize} total={visible.length} pageSizeOptions={[10, 20, 50, 100]} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />}>
      <TableHeader><TableRow><TableHead>版本号</TableHead><TableHead className="hidden sm:table-cell">平台</TableHead><TableHead className="hidden sm:table-cell">更新机制</TableHead><TableHead className="hidden sm:table-cell">发布范围</TableHead><TableHead>状态</TableHead><TableHead className="hidden sm:table-cell">发布时间（当前时区）</TableHead><TableHead className="hidden sm:table-cell">禁用时间（当前时区）</TableHead><TableHead sticky="right" className="w-40 min-w-40 text-center sm:w-44 sm:min-w-44">操作</TableHead></TableRow></TableHeader>
      <TableBody>
        {pageRows.map((item) => <TableRow key={item.id}>
          <TableCell><div className="flex flex-col gap-1 py-2"><span className="font-medium tabular-nums">{item.version}</span><span className="text-muted-foreground sm:hidden">{item.platform}</span></div></TableCell>
          <TableCell className="hidden sm:table-cell">{item.platform}</TableCell>
          <TableCell className="hidden sm:table-cell">{item.requirement === "force" ? "强制更新" : "非强制更新"}</TableCell>
          <TableCell className="hidden sm:table-cell">{item.scope === "gray" ? `灰度 · ${item.targets.length} 个 DSP` : "全网"}</TableCell>
          <TableCell><Badge variant={statusVariant(item.status)} size="sm">{statusText[item.status]}</Badge></TableCell>
          <TableCell className="hidden tabular-nums sm:table-cell">{item.publishAt ? formatDateTime(item.publishAt, { timeZone }) : "—"}</TableCell>
          <TableCell className="hidden tabular-nums sm:table-cell">{item.status === "disabled" ? formatDateTime(item.disabledAt ?? "", { timeZone }) : "—"}</TableCell>
          <TableCell sticky="right" className="w-40 min-w-40 text-center sm:w-44 sm:min-w-44"><div className="mx-auto flex w-32 items-center justify-start gap-1 whitespace-nowrap">
            <Button variant="link" size="xs" onClick={() => openDetail(item)}>详情</Button>
            {item.status !== "disabled" && <Button variant="link" size="xs" onClick={() => openManage(item)}>管理</Button>}
            {item.status === "disabled" ? <Button variant="link" size="xs" onClick={() => begin({ kind: "restore", releaseId: item.id })}>解除禁用</Button> : <Button variant="link" size="xs" onClick={() => begin({ kind: "disable", releaseId: item.id })}>禁用</Button>}
          </div></TableCell>
        </TableRow>)}
        {!pageRows.length && <TableRow><TableCell colSpan={8}><Empty className="min-h-44"><EmptyHeader><EmptyTitle>没有匹配的版本</EmptyTitle><EmptyDescription>调整查询条件后重试。</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}
      </TableBody>
    </Table>

    <Sheet open={mode === "form"} onOpenChange={(open) => { if (!open) requestClose() }}><SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:lg:w-[70vw]"><SheetHeader className="border-b px-[30px] py-[30px]"><SheetTitle>新建 App 版本</SheetTitle><SheetDescription>填写版本配置后立即发布；安装包由现有分发渠道提供。</SheetDescription></SheetHeader><div className="min-h-0 flex-1 overflow-y-auto px-[30px] py-[30px]"><FieldGroup className="gap-6">
      <FieldSet><FieldLegend variant="label">版本标识</FieldLegend><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="version-number"><span>版本号 <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></span></FieldLabel><Input id="version-number" value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} placeholder="例如 2.9.0" /></Field><Field><FieldLabel><span>平台 <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></span></FieldLabel><Select value={draft.platform} onValueChange={(value) => setDraft({ ...draft, platform: value as Platform })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="Android">Android</SelectItem><SelectItem value="iOS">iOS</SelectItem></SelectGroup></SelectContent></Select></Field></div></FieldSet>
      <FieldSet><FieldLegend variant="label">更新机制与发布地址</FieldLegend><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel><span>更新机制 <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></span></FieldLabel><Select value={draft.requirement} onValueChange={(value) => setDraft({ ...draft, requirement: value as Release["requirement"], reminderPolicy: null })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="suggest">非强制更新</SelectItem><SelectItem value="force">强制更新</SelectItem></SelectGroup></SelectContent></Select></Field><Field><FieldLabel><span>发布范围 <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></span></FieldLabel><Select value={draft.scope} onValueChange={(value) => setDraft({ ...draft, scope: value as Release["scope"] })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="gray">按 DSP 灰度</SelectItem><SelectItem value="all">全网</SelectItem></SelectGroup></SelectContent></Select></Field>{draft.requirement === "suggest" && <FieldSet><FieldLegend variant="label">提醒策略 <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></FieldLegend><ReminderPolicyOptions value={draft.reminderPolicy} onValueChange={(reminderPolicy) => setDraft({ ...draft, reminderPolicy })} idPrefix="release-reminder" /></FieldSet>}</div>{draft.scope === "gray" && <Field><FieldLabel>灰度 DSP 名单（已选 {draft.targets.length}）</FieldLabel><DmsOrgTreePicker snapshot={orgSnapshot} selected={draft.targets} onChange={changeDraftTargets} onSync={refreshOrgTree} syncing={orgSyncing} syncError={orgSyncError} /></Field>}<div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="store-url">商店地址</FieldLabel><Input id="store-url" type="url" value={draft.storeUrl} onChange={(e) => setDraft({ ...draft, storeUrl: e.target.value })} placeholder="https://…" /></Field><Field><FieldLabel htmlFor="private-url">私服包地址</FieldLabel><Input id="private-url" type="url" value={draft.privateUrl} onChange={(e) => setDraft({ ...draft, privateUrl: e.target.value })} placeholder="https://…" /></Field><Field><FieldLabel htmlFor="min-version">最低兼容版本号</FieldLabel><Input id="min-version" value={draft.minVersion} onChange={(e) => setDraft({ ...draft, minVersion: e.target.value })} placeholder="例如 2.5.0" /></Field></div></FieldSet>
      <FieldSet><FieldLegend variant="label">发布信息</FieldLegend><Field><FieldLabel htmlFor="publish-time"><span>发布时间 <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></span></FieldLabel><Input id="publish-time" type="datetime-local" value={publishAtInput} onChange={(e) => setPublishAtInput(e.target.value)} /></Field><Field><FieldLabel htmlFor="release-notes"><span>发布内容 <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></span></FieldLabel><Textarea id="release-notes" rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field><label className="flex items-start gap-2 text-sm"><Checkbox checked={installConfirmed} onCheckedChange={(checked) => setInstallConfirmed(checked === true)} />我确认目标版本已在所填分发渠道可安装（发布时必选）</label></FieldSet>
    </FieldGroup></div><SheetFooter className="flex-row flex-wrap justify-end border-t px-[30px] py-[18px]"><Button variant="outline" onClick={requestClose}>取消</Button><Button onClick={publish}>发布版本</Button></SheetFooter></SheetContent></Sheet>

    <Sheet open={(mode === "detail" || mode === "manage") && !!active} onOpenChange={(open) => { if (!open) requestClose() }}><SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:lg:w-[70vw]"><SheetHeader className="border-b px-[30px] py-[30px]"><SheetTitle>{mode === "manage" ? "版本管理" : "版本详情"} · {active?.version}</SheetTitle><SheetDescription>已发布记录的版本标识和安装地址不可原地修改。</SheetDescription></SheetHeader>{active && <div className="min-h-0 flex-1 overflow-y-auto px-[30px] py-[30px]"><FieldGroup className="gap-6">
      <FieldSet><FieldLegend variant="label">版本标识</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <StaticReleaseField label="版本号" value={active.version} />
          <StaticReleaseField label="平台" value={active.platform} />
        </div>
        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">发布状态</span><Badge size="sm" variant={statusVariant(active.status)}>{statusText[active.status]}</Badge></div>
      </FieldSet>
      <FieldSet><FieldLegend variant="label">更新机制与发布地址</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "manage" ? <Field><FieldLabel><span>更新机制 <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></span></FieldLabel><Select value={manageRequirementDraft} onValueChange={(value) => changeManageRequirement(value as Release["requirement"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="suggest">非强制更新</SelectItem><SelectItem value="force">强制更新</SelectItem></SelectGroup></SelectContent></Select></Field> : <StaticReleaseField label="更新机制" value={active.requirement === "force" ? "强制更新" : "非强制更新"} />}
          <Field>
            <FieldLabel>发布范围{mode === "manage" && <> <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></>}</FieldLabel>
            {mode === "manage" ? <Select value={manageScopeDraft} onValueChange={(value) => setManageScopeDraft(value as Release["scope"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="gray">按 DSP 灰度</SelectItem><SelectItem value="all">全网</SelectItem></SelectGroup></SelectContent></Select> : <p className="min-h-9 py-2 text-sm">{active.scope === "gray" ? `按 DSP 灰度 · ${active.targets.length} 个 DSP` : "全网"}</p>}
          </Field>
          {(mode === "manage" ? manageRequirementDraft : active.requirement) === "suggest" && <FieldSet><FieldLegend variant="label">提醒策略{mode === "manage" && <> <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></>}</FieldLegend>{mode === "manage" ? <ReminderPolicyOptions value={manageReminderDraft} onValueChange={setManageReminderDraft} idPrefix="manage-reminder" /> : <p className="min-h-9 py-2 text-sm">{reminderText[active.reminderPolicy ?? "three_days"]}</p>}</FieldSet>}
        </div>
        {(mode === "manage" ? manageScopeDraft : active.scope) === "gray" && <Field><FieldLabel>灰度 DSP 名单（已选 {mode === "manage" ? grayTargets.length : active.targets.length}）</FieldLabel>{mode === "manage" ? <><DmsOrgTreePicker snapshot={orgSnapshot} selected={grayTargets} onChange={changeGrayTargets} onSync={refreshOrgTree} syncing={orgSyncing} syncError={orgSyncError} /><p className="text-xs text-muted-foreground">本次变更：新增 {added.length} 个，移除 {removed.length} 个</p></> : <DmsOrgTreeView snapshot={orgSnapshot} selected={active.targets} />}</Field>}
        <div className="grid gap-4 sm:grid-cols-2">
          <StaticReleaseField label="商店地址" value={active.storeUrl} />
          <StaticReleaseField label="私服包地址" value={active.privateUrl} />
          <StaticReleaseField label="最低兼容版本号" value={active.minVersion} />
        </div>
      </FieldSet>
      <FieldSet><FieldLegend variant="label">发布信息</FieldLegend>
        <StaticReleaseField label="发布时间" value={active.publishAt ? formatDateTime(active.publishAt, { timeZone }) : "—"} />
        <Field><FieldLabel htmlFor={mode === "manage" ? "managed-release-notes" : undefined}><span>发布内容{mode === "manage" && <> <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">（必填）</span></>}</span></FieldLabel>{mode === "manage" ? <Textarea id="managed-release-notes" rows={4} value={manageNotesDraft} onChange={(event) => setManageNotesDraft(event.target.value)} /> : <p className="min-h-24 whitespace-pre-wrap break-words py-2 text-sm">{active.notes || "暂无发布内容"}</p>}</Field>
      </FieldSet>
      {active.status === "disabled" && <FieldSet><FieldLegend variant="label">禁用信息</FieldLegend><div className="grid gap-4 sm:grid-cols-2"><StaticReleaseField label="禁用时间" value={formatDateTime(active.disabledAt ?? "", { timeZone })} /><StaticReleaseField label="操作人" value={active.disabledBy || "—"} /></div></FieldSet>}
    </FieldGroup></div>}{mode === "manage" && active && <SheetFooter className="flex-row flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t px-[30px] py-[18px]">
      <div className="flex items-center gap-2">
        {active.status === "enabled" && <Button variant="outline" onClick={() => beginFromManage({ kind: "withdraw", releaseId: active.id })}>撤回</Button>}
        {active.status === "withdrawn" && <Button variant="outline" onClick={() => beginFromManage({ kind: "enable", releaseId: active.id })}>启用</Button>}
      </div>
      <div className="flex items-center gap-2"><Button variant="outline" onClick={cancelManage}>取消</Button><Button onClick={() => saveManage()} disabled={!manageDirty}>保存修改</Button></div>
    </SheetFooter>}</SheetContent></Sheet>

    <AlertDialog open={closePending} onOpenChange={(open) => { setClosePending(open); if (!open) setDiscardIntent(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>放弃未保存的修改？</AlertDialogTitle><AlertDialogDescription>{discardIntent?.kind === "action" ? "继续其他操作前，需要放弃尚未保存的版本配置修改。" : "关闭后，本次填写或选择的内容将被取消。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={() => { setClosePending(false); setDiscardIntent(null) }}>继续编辑</Button><Button variant="destructive" onClick={discardChanges}>放弃修改</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <AlertDialog open={impactSavePending} onOpenChange={setImpactSavePending}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认保存发布配置？</AlertDialogTitle><AlertDialogDescription>{[expandingRange && (active?.status === "enabled" ? "发布范围将从灰度扩大至全网，原灰度名单会清空，所有 DSP 将在下一次成功联网检查时可获得此版本。" : "发布范围将从灰度扩大至全网，原灰度名单会清空；版本当前已撤回，再次启用后将面向所有 DSP。"), makingForce && "更新机制将改为强制更新，适用范围内尚未升级的用户必须更新才能继续使用。请先确认目标版本可安装；系统不会自动核验。"].filter(Boolean).join(" ")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={() => setImpactSavePending(false)}>取消</Button><Button onClick={() => saveManage(true)}>确认保存</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认{pending ? actionText[pending.kind] : "操作"}</AlertDialogTitle><AlertDialogDescription>{pending?.kind === "disable" ? `将禁用 ${pendingRelease?.platform ?? ""} ${pendingRelease?.version ?? ""}：停止向目标 DSP 推送此版本，已安装用户下次检查时必须升级。请先自行确认有可用的新版本；系统不会自动核验安装情况。` : pending?.kind === "restore" ? "解除禁用后版本变为已撤回：已安装用户可继续使用，但不会恢复推送。需要再次点击启用。" : pending?.kind === "withdraw" ? "撤回后不再向目标 DSP 推送此版本，已安装用户仍可使用。" : "启用后将按原发布范围恢复向目标 DSP 推送。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={() => setPending(null)}>取消</Button><Button variant={pending?.kind === "disable" ? "destructive" : "default"} onClick={confirmAction}>确认{pending ? actionText[pending.kind] : ""}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
