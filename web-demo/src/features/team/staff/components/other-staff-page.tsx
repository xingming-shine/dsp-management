"use client"

import { useLayoutEffect, useRef, useState, type FormEvent } from "react"
import { ChevronDownIcon, EyeIcon, PlusIcon, RotateCcwIcon, SearchIcon, TruckIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { DataPagination } from "@/components/ui/pagination"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { can } from "@/features/permissions/can"
import { PermissionPreviewTree, effectivePermissionCodes } from "@/features/system-management/permission-tree"
import { initialRolePolicies, readSavedRolePolicies, roleCatalog } from "@/features/system-management/role-policy-data"
import { useTimezone } from "@/features/preferences/timezone-store"
import { DRIVER_ROLE_ID, driverCandidates, initialStaffRows, type EmploymentStatus, type StaffRow } from "@/features/team/staff/mock-data"
import { WorkflowPanel } from "@/features/withdrawal-mode/components/withdrawal-parts"
import { enterWithdrawalWorkspace, WithdrawalRecordWorkspace, type RecordNavigation } from "@/features/withdrawal-mode/components/withdrawal-workspace"
import { formatDateTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"
import { mockSession } from "@/mocks/session"

type DemoScope = "headquarters" | "dsp" | "denied"
type StaffPanel = { type: "detail" | "edit"; id: string }
type CreateMode = "direct" | "driver"
type Filter = { name: string; userId: string; organizationId: string; organizationQuery: string; employmentStatus: string }
type StaffForm = {
  name: string
  phoneCode: string
  phone: string
  email: string
  employmentStatus: EmploymentStatus
  assignments: Record<string, string[]>
}
type FormErrors = Partial<Record<"driver" | "name" | "phone" | "email" | "status" | "assignments", string>>
type ChangeLog = {
  id: string
  userId: string
  organizationIds: string[]
  actor: string
  at: string
  action: "新增" | "从司机添加" | "修改"
  changes: string[]
}
type StaffUser = { userId: string; representative: StaffRow; relations: StaffRow[]; updatedAt: string }

const emptyFilter: Filter = { name: "", userId: "", organizationId: "all", organizationQuery: "", employmentStatus: "all" }
const emptyForm: StaffForm = { name: "", phoneCode: "+1", phone: "", email: "", employmentStatus: "active", assignments: {} }
const sheetWidth = "max-w-[100vw] gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none md:data-[side=right]:w-[70vw]"
const statusScopeMessage = "该员工关联其他车队，需拥有全部关联车队权限才能变更在职状态。可继续调整有权车队的管理角色。"
const initialLogs: ChangeLog[] = [
  { id: "log-1", userId: "21672", organizationIds: ["org-1", "org-2"], actor: "John Smith", at: "2026-11-23T17:45:00Z", action: "修改", changes: ["JAM-JJ：新增角色 DSP Customer Support Specialist"] },
  { id: "log-2", userId: "21672", organizationIds: ["org-1", "org-2"], actor: "John Smith", at: "2026-11-20T15:20:00Z", action: "新增", changes: ["添加到 JAM-JJ、JAM-SS"] },
]

function maskPhone(code: string, phone: string) {
  return `${code} ${phone.slice(0, 3)}••••${phone.slice(-2)}`
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@")
  return domain ? `${name.slice(0, 2)}•••@${domain}` : "••••"
}

function logTitle(entry: ChangeLog) {
  if (entry.action === "新增") return "直接新增员工"
  if (entry.action === "从司机添加") return "从司机添加员工"
  const statusChange = entry.changes.find((change) => change.startsWith("在职状态："))
  if (statusChange && entry.changes.length === 1) return statusChange.endsWith("离职") ? "设置员工离职" : "恢复员工在职"
  if (entry.changes.every((change) => /角色|加入|移出|管理/.test(change))) return "调整 DSP 车队角色"
  return "修改员工资料与权限"
}

export function OtherStaffPage({ demoScope = "headquarters" }: { demoScope?: DemoScope }) {
  const timeZone = useTimezone()
  const organizations = mockSession.organizations
  const accessibleOrganizations = demoScope === "dsp" ? organizations.slice(0, 2) : organizations
  const allowedIds = new Set(accessibleOrganizations.map((item) => item.id))
  const hasPermission = demoScope !== "denied" && can(mockSession, "team.staff.read")

  const [rows, setRows] = useState<StaffRow[]>(initialStaffRows)
  const [logs, setLogs] = useState<ChangeLog[]>(initialLogs)
  const [draft, setDraft] = useState<Filter>(emptyFilter)
  const [applied, setApplied] = useState<Filter>(emptyFilter)
  const [organizationFilterOpen, setOrganizationFilterOpen] = useState(false)
  const suppressOrganizationFocusRef = useRef(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>("direct")
  const [driverQuery, setDriverQuery] = useState("")
  const [driverPickerOpen, setDriverPickerOpen] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState("")
  const [dspPickerOpen, setDspPickerOpen] = useState(false)
  const [dspQuery, setDspQuery] = useState("")
  const [modeSwitchTarget, setModeSwitchTarget] = useState<CreateMode | null>(null)
  const [discardCreateOpen, setDiscardCreateOpen] = useState(false)
  const [panel, setPanel] = useState<StaffPanel | null>(null)
  const [returnedId, setReturnedId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const previousScrollRef = useRef(0)
  const returningRef = useRef(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [originalForm, setOriginalForm] = useState<StaffForm>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rolePolicies, setRolePolicies] = useState(initialRolePolicies)
  const [rolePolicyError, setRolePolicyError] = useState(false)
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null)
  const [expandedRoleRows, setExpandedRoleRows] = useState<string[]>([])
  const rolePreviewTriggerRef = useRef<HTMLButtonElement | null>(null)

  const otherRoles = rolePolicyError ? [] : roleCatalog.filter((role) => Boolean(rolePolicies[role.id]))
  const availableDrivers = driverCandidates.filter((driver) => driver.organizationIds.some((id) => allowedIds.has(id)) &&
    !rows.some((row) => row.userId === driver.userId && (row.employmentStatus === "inactive" || (allowedIds.has(row.organizationId) && row.roleIds.some((id) => id !== DRIVER_ROLE_ID)))))
  const matchingDrivers = availableDrivers.filter((driver) => !driverQuery.trim() || [driver.userId, driver.name, driver.phone].some((value) => value.toLowerCase().includes(driverQuery.trim().toLowerCase())))
  const selectedDriver = availableDrivers.find((driver) => driver.userId === selectedDriverId) ?? null
  const driverPending = createOpen && createMode === "driver" && !selectedDriver
  const existingDriverEmail = selectedDriverId
    ? (rows.find((row) => row.userId === selectedDriverId)?.email?.trim() || selectedDriver?.email?.trim() || "")
    : ""
  const driverEmailReadOnly = createOpen && createMode === "driver" && Boolean(existingDriverEmail.trim())
  const editingRow = rows.find((row) => row.userId === editingUserId) ?? null
  const accountFleetIds = editingUserId ? new Set([
    ...rows.filter((row) => row.userId === editingUserId).map((row) => row.organizationId),
    ...driverCandidates.filter((driver) => driver.userId === editingUserId).flatMap((driver) => driver.organizationIds),
  ]) : new Set<string>()
  const statusScopeLocked = Boolean(editingUserId && demoScope !== "headquarters" && [...accountFleetIds].some((id) => !allowedIds.has(id)))
  const profileChanged = Boolean(editingRow && (
    editingRow.name !== form.name.trim() ||
    editingRow.phoneCode !== form.phoneCode ||
    editingRow.phone !== form.phone.replace(/[\s()-]/g, "") ||
    editingRow.email !== form.email.trim().toLowerCase() ||
    editingRow.employmentStatus !== form.employmentStatus
  ))
  const writesDmsAccount = Boolean(
    (createOpen && createMode === "direct") ||
    (createOpen && createMode === "driver" && selectedDriver && !existingDriverEmail) ||
    profileChanged
  )
  const selectedRow = panel ? rows.find((row) => row.userId === panel.id && allowedIds.has(row.organizationId) && row.roleIds.some((id) => id !== DRIVER_ROLE_ID)) ?? null : null
  const dirty = JSON.stringify(form) !== JSON.stringify(originalForm)
  const turningInactive = Boolean(editingRow?.employmentStatus === "active" && form.employmentStatus === "inactive")
  const driverOnlyOrganizations = editingUserId ? rows
    .filter((row) => row.userId === editingUserId && allowedIds.has(row.organizationId) && row.roleIds.includes(DRIVER_ROLE_ID) && row.roleIds.some((id) => id !== DRIVER_ROLE_ID) && !(form.assignments[row.organizationId]?.length))
    .map((row) => row.organizationId) : []
  const userMap = new Map<string, StaffUser>()
  for (const row of rows.filter((item) => allowedIds.has(item.organizationId) && item.roleIds.some((id) => id !== DRIVER_ROLE_ID))) {
    const user = userMap.get(row.userId)
    if (user) {
      user.relations.push(row)
      if (Date.parse(row.updatedAt) > Date.parse(user.updatedAt)) {
        user.representative = row
        user.updatedAt = row.updatedAt
      }
    } else userMap.set(row.userId, { userId: row.userId, representative: row, relations: [row], updatedAt: row.updatedAt })
  }
  const staffUsers = [...userMap.values()]
  const organizationName = (id: string) => organizations.find((item) => item.id === id)?.name ?? "未知 DSP 车队"
  const driverOrganizationNames = (ids: string[]) => ids.filter((id) => allowedIds.has(id)).map(organizationName).join("、")
  const roleName = (id: string) => id === DRIVER_ROLE_ID ? "Driver" : roleCatalog.find((item) => item.id === id)?.name ?? "角色已失效"
  const previewPolicy = previewRoleId && !rolePolicyError ? rolePolicies[previewRoleId] ?? null : null
  const previewRole = roleCatalog.find((role) => role.id === previewRoleId)
  const visibleUsers = staffUsers
    .filter((user) => !applied.name.trim() || user.representative.name.toLowerCase().includes(applied.name.trim().toLowerCase()))
    .filter((user) => !applied.userId.trim() || user.userId === applied.userId.trim())
    .filter((user) => applied.organizationId !== "all"
      ? user.relations.some((row) => row.organizationId === applied.organizationId)
      : !applied.organizationQuery.trim() || user.relations.some((row) => organizationName(row.organizationId).toLowerCase().includes(applied.organizationQuery.trim().toLowerCase())))
    .filter((user) => applied.employmentStatus === "all" || user.representative.employmentStatus === applied.employmentStatus)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.userId.localeCompare(b.userId))
  const pagedUsers = visibleUsers.slice((page - 1) * pageSize, page * pageSize)
  const selectedUser = panel ? staffUsers.find((user) => user.userId === panel.id) ?? null : null
  const workspaceUsers = selectedUser && !visibleUsers.some((user) => user.userId === selectedUser.userId) ? [selectedUser, ...visibleUsers] : visibleUsers
  const availableOrganizations = accessibleOrganizations.filter((organization) => !Object.hasOwn(form.assignments, organization.id))
  const matchingOrganizations = availableOrganizations.filter((organization) => organization.name.toLowerCase().includes(dspQuery.trim().toLowerCase()))
  const history = logs
    .filter((entry) => entry.userId === selectedRow?.userId && entry.organizationIds.some((id) => allowedIds.has(id)))
    .map((entry) => ({
      ...entry,
      changes: entry.changes.filter((change) => !organizations.some((organization) => !allowedIds.has(organization.id) && change.includes(organization.name))),
    }))
    .filter((entry) => entry.changes.length > 0)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const matchingFilterOrganizations = accessibleOrganizations.filter((organization) => organization.name.toLowerCase().includes(draft.organizationQuery.trim().toLowerCase()))

  useLayoutEffect(() => {
    if (panel || !returningRef.current) return
    returningRef.current = false
    window.scrollTo({ top: previousScrollRef.current, behavior: "instant" })
    const row = Array.from(listRef.current?.querySelectorAll<HTMLTableRowElement>("[data-staff-user-id]") ?? [])
      .find((item) => item.dataset.staffUserId === returnedId)
    const target = row?.querySelector<HTMLButtonElement>("button")
    if (target) target.focus({ preventScroll: true })
    else if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true })
  }, [panel, returnedId])

  function enterPanel(next: StaffPanel, trigger: HTMLElement) {
    triggerRef.current = trigger
    previousScrollRef.current = window.scrollY
    enterWithdrawalWorkspace(() => {
      setReturnedId(null)
      setPanel(next)
    })
  }

  function returnToList() {
    const id = panel?.id
    const index = visibleUsers.findIndex((user) => user.userId === id)
    if (index >= 0) setPage(Math.floor(index / pageSize) + 1)
    returningRef.current = true
    setReturnedId(id ?? null)
    setPanel(null)
  }

  function updateForm<K extends keyof StaffForm>(key: K, value: StaffForm[K]) {
    if (key === "employmentStatus" && statusScopeLocked) return
    setForm((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }

  function selectOrganizationFilter(organizationId: string) {
    setDraft((previous) => ({ ...previous, organizationId, organizationQuery: organizationId === "all" ? "" : organizationName(organizationId) }))
    setOrganizationFilterOpen(false)
    suppressOrganizationFocusRef.current = true
    window.requestAnimationFrame(() => {
      const input = document.getElementById("staff-organization") as HTMLInputElement | null
      input?.focus({ preventScroll: true })
      input?.setSelectionRange(input.value.length, input.value.length)
      suppressOrganizationFocusRef.current = false
    })
  }

  function refreshRolePolicies() {
    const latest = readSavedRolePolicies()
    if (latest) { setRolePolicies(latest); setRolePolicyError(false) }
    else setRolePolicyError(true)
    return latest
  }

  function openCreate(trigger: HTMLElement) {
    const next: StaffForm = { ...emptyForm, assignments: {} }
    triggerRef.current = trigger
    setCreateMode("direct")
    setDriverQuery("")
    setDriverPickerOpen(false)
    setSelectedDriverId("")
    setDspPickerOpen(false)
    setDspQuery("")
    setEditingUserId(null)
    setForm(next)
    setOriginalForm({ ...emptyForm, assignments: {} })
    setErrors({})
    refreshRolePolicies()
    setCreateOpen(true)
  }

  function openRolePreview(roleId: string, trigger: HTMLButtonElement) {
    rolePreviewTriggerRef.current = trigger
    refreshRolePolicies()
    setPreviewRoleId(roleId)
  }

  function switchCreateMode(next: CreateMode) {
    if (next === createMode) return
    if (dirty) { setModeSwitchTarget(next); return }
    setCreateMode(next)
    setDriverQuery("")
    setDriverPickerOpen(false)
    setSelectedDriverId("")
    setDspPickerOpen(false)
    setDspQuery("")
    setForm({ ...emptyForm, assignments: {} })
    setOriginalForm({ ...emptyForm, assignments: {} })
    setErrors({})
  }

  function selectDriver(userId: string) {
    const driver = availableDrivers.find((item) => item.userId === userId)
    if (!driver) return
    const existing = rows.find((row) => row.userId === userId)
    setSelectedDriverId(userId)
    setDriverPickerOpen(false)
    setDriverQuery("")
    const next: StaffForm = {
      name: existing?.name ?? driver.name,
      phoneCode: existing?.phoneCode ?? driver.phoneCode,
      phone: existing?.phone ?? driver.phone,
      email: existing?.email?.trim() || driver.email,
      employmentStatus: "active",
      assignments: Object.fromEntries(driver.organizationIds.filter((id) => allowedIds.has(id)).map((id) => [id, []])),
    }
    setForm(next)
    setOriginalForm({ ...emptyForm, assignments: {} })
    setErrors({})
  }

  function requestCloseCreate() {
    if (busy) return
    if (dirty) setDiscardCreateOpen(true)
    else setCreateOpen(false)
  }

  function hasDriverRole(organizationId: string) {
    return Boolean(
      (editingUserId && rows.some((row) => row.userId === editingUserId && row.organizationId === organizationId && row.roleIds.includes(DRIVER_ROLE_ID))) ||
      (createOpen && createMode === "driver" && selectedDriverId && (
        selectedDriver?.organizationIds.includes(organizationId) ||
        rows.some((row) => row.userId === selectedDriverId && row.organizationId === organizationId && row.roleIds.includes(DRIVER_ROLE_ID))
      ))
    )
  }

  function prepareEdit(row: StaffRow) {
    const assignments = Object.fromEntries(rows.filter((item) => item.userId === row.userId && allowedIds.has(item.organizationId)).map((item) => [item.organizationId, item.roleIds.filter((id) => id !== DRIVER_ROLE_ID)]))
    const next: StaffForm = { name: row.name, phoneCode: row.phoneCode, phone: row.phone, email: row.email, employmentStatus: row.employmentStatus, assignments }
    setEditingUserId(row.userId)
    setForm(next)
    setOriginalForm(next)
    setErrors({})
    refreshRolePolicies()
  }

  function openEdit(row: StaffRow, trigger: HTMLElement) {
    prepareEdit(row)
    enterPanel({ type: "edit", id: row.userId }, trigger)
  }

  function navigatePanel(next: StaffPanel) {
    if (next.type === "edit") {
      const row = rows.find((item) => item.userId === next.id && allowedIds.has(item.organizationId))
      if (row) prepareEdit(row)
    }
    setPanel(next)
  }

  function toggleOrganization(id: string, checked: boolean) {
    setForm((previous) => {
      const assignments = { ...previous.assignments }
      if (checked) assignments[id] = assignments[id] ?? []
      else if (createOpen && createMode === "driver" && selectedDriver?.organizationIds.includes(id)) assignments[id] = []
      else delete assignments[id]
      return { ...previous, assignments }
    })
    setErrors((previous) => ({ ...previous, assignments: undefined }))
  }

  function toggleRole(organizationId: string, roleId: string, checked: boolean) {
    if (roleId === DRIVER_ROLE_ID) return
    setForm((previous) => {
      const roles = previous.assignments[organizationId] ?? []
      return { ...previous, assignments: { ...previous.assignments, [organizationId]: checked ? [...roles, roleId] : roles.filter((id) => id !== roleId) } }
    })
    setErrors((previous) => ({ ...previous, assignments: undefined }))
  }

  function validateForm() {
    const next: FormErrors = {}
    const phone = form.phone.replace(/[\s()-]/g, "")
    if (createOpen && createMode === "driver" && !selectedDriver) {
      setErrors({ driver: "请先选择一名司机" })
      return false
    }
    if (form.name.trim().length < 2 || form.name.trim().length > 50) next.name = "请输入员工姓名"
    if (editingRow && form.employmentStatus !== editingRow.employmentStatus && statusScopeLocked) next.status = statusScopeMessage
    if (!/^\d{7,15}$/.test(phone)) next.phone = "请输入有效手机号"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "请输入有效的邮箱地址"
    if (rows.some((row) => row.userId !== (editingUserId || (createMode === "driver" ? selectedDriverId : "")) && row.phoneCode === form.phoneCode && row.phone === phone)) next.phone = "该手机号已对应一个用户，不能重复添加"
    if (createOpen && createMode === "direct" && driverCandidates.some((driver) => driver.phoneCode === form.phoneCode && driver.phone === phone)) next.phone = "该手机号已有司机账号，请改用「从司机添加」"
    const assignments = Object.entries(form.assignments)
    const hasExistingDriver = Boolean(editingUserId && rows.some((row) => row.userId === editingUserId && row.roleIds.includes(DRIVER_ROLE_ID)))
    const hasOtherRole = assignments.some(([, roleIds]) => roleIds.length > 0)
    if ((!assignments.length && !hasExistingDriver) || (!hasOtherRole && !(editingUserId && hasExistingDriver)) ||
      assignments.some(([id, roleIds]) => !allowedIds.has(id) || (!roleIds.length && !hasDriverRole(id)) ||
        roleIds.some((roleId) => roleId === DRIVER_ROLE_ID || !otherRoles.some((role) => role.id === roleId)))) {
      next.assignments = editingUserId && hasExistingDriver
        ? "请为新增 DSP 车队选择管理角色；已有 Driver 角色会保留"
        : createOpen && createMode === "driver"
          ? "请至少为一个 DSP 车队选择管理角色；已有司机角色会保留"
        : "请至少选择一个有权限的 DSP 车队，并为每个车队选择至少一个管理角色"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function rolePoliciesChanged() {
    const latestPolicies = readSavedRolePolicies()
    if (!latestPolicies) {
      setRolePolicyError(true)
      toast.error("暂时无法获取最新角色权限，请稍后重试")
      return true
    }
    const selectedRoleIds = [...new Set(Object.values(form.assignments).flat())]
    if (selectedRoleIds.some((id) => JSON.stringify(rolePolicies[id]) !== JSON.stringify(latestPolicies[id]))) {
      setRolePolicies(latestPolicies)
      toast.error("角色权限配置已更新，请重新查看相关角色权限后提交")
      return true
    }
    return false
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (rolePolicyError) { toast.error("暂时无法获取最新角色权限，请稍后重试"); return }
    if (!validateForm() || rolePoliciesChanged()) return
    setConfirmOpen(true)
  }

  function buildChanges(userId: string) {
    const before = rows.filter((row) => row.userId === userId)
    const representative = before[0]
    const changes: string[] = []
    if (!representative) return Object.entries(form.assignments).filter(([, roleIds]) => roleIds.length > 0).map(([organizationId, roleIds]) => `${organizationName(organizationId)}：添加角色 ${roleIds.map(roleName).join("、")}`)
    if (representative.name !== form.name.trim()) changes.push(`姓名：${representative.name} → ${form.name.trim()}`)
    if (representative.phoneCode !== form.phoneCode || representative.phone !== form.phone.replace(/[\s()-]/g, "")) changes.push("手机号已修改")
    if (representative.email !== form.email.trim().toLowerCase()) changes.push("邮箱已修改")
    if (representative.employmentStatus !== form.employmentStatus) changes.push(`在职状态：${representative.employmentStatus === "active" ? "在职" : "离职"} → ${form.employmentStatus === "active" ? "在职" : "离职"}`)
    const oldAssignments = Object.fromEntries(before.filter((row) => allowedIds.has(row.organizationId)).map((row) => [row.organizationId, row.roleIds.filter((id) => id !== DRIVER_ROLE_ID)]))
    for (const organizationId of new Set([...Object.keys(oldAssignments), ...Object.keys(form.assignments)])) {
      const oldRoles: string[] = oldAssignments[organizationId] ?? []
      const newRoles = form.assignments[organizationId] ?? []
      if (!oldRoles.length && newRoles.length) changes.push(`加入 ${organizationName(organizationId)}：${newRoles.map(roleName).join("、")}`)
      else if (oldRoles.length && !newRoles.length) changes.push(hasDriverRole(organizationId) ? `${organizationName(organizationId)}：移除全部管理角色，保留 Driver` : `移出 ${organizationName(organizationId)}`)
      else {
        const added = newRoles.filter((id) => !oldRoles.includes(id))
        const removed = oldRoles.filter((id) => !newRoles.includes(id))
        if (added.length) changes.push(`${organizationName(organizationId)}：新增角色 ${added.map(roleName).join("、")}`)
        if (removed.length) changes.push(`${organizationName(organizationId)}：移除角色 ${removed.map(roleName).join("、")}`)
      }
    }
    return changes.length ? changes : ["无字段变化"]
  }

  function confirmSave() {
    if (busy) return
    if (!validateForm()) { setConfirmOpen(false); toast.error("请检查表单后重新提交"); return }
    if (rolePoliciesChanged()) { setConfirmOpen(false); return }
    setBusy(true)
    const submitted = { ...form, assignments: Object.fromEntries(Object.entries(form.assignments).map(([id, roleIds]) => [id, [...roleIds]])) }
    const userId = editingUserId ?? (createMode === "driver" ? selectedDriverId : crypto.randomUUID().slice(0, 8))
    const changes = buildChanges(userId)
    const firstOrganizationId = Object.keys(submitted.assignments).find((id) => submitted.assignments[id].length > 0)
    const hasVisibleRoleAfterSave = Boolean(firstOrganizationId)
    const isCreate = createOpen
    const fromDriver = isCreate && createMode === "driver"
    const inheritedDriverOrganizationIds = fromDriver ? selectedDriver?.organizationIds.filter((id) => allowedIds.has(id)) ?? [] : []
    // Prototype: simulate DMS accepting account changes and non-Driver role targets before local save.
    window.setTimeout(() => {
      const now = new Date().toISOString()
      const phone = submitted.phone.replace(/[\s()-]/g, "")
      const email = submitted.email.trim().toLowerCase()
      setRows((previous) => {
        const original = previous.filter((row) => row.userId === userId)
        const untouched = previous.filter((row) => row.userId !== userId || !allowedIds.has(row.organizationId)).map((row) => row.userId === userId ? { ...row, name: submitted.name.trim(), phoneCode: submitted.phoneCode, phone, email, employmentStatus: submitted.employmentStatus, updatedAt: now } : row)
        const driverOrganizationIds = new Set([
          ...original.filter((row) => allowedIds.has(row.organizationId) && row.roleIds.includes(DRIVER_ROLE_ID)).map((row) => row.organizationId),
          ...inheritedDriverOrganizationIds,
        ])
        const organizationIds = new Set([...Object.keys(submitted.assignments), ...driverOrganizationIds])
        const updated = [...organizationIds].map((organizationId) => ({
          relationId: original.find((row) => row.organizationId === organizationId)?.relationId ?? `staff-${userId}-${organizationId}`,
          userId,
          name: submitted.name.trim(),
          phoneCode: submitted.phoneCode,
          phone,
          email,
          employmentStatus: submitted.employmentStatus,
          organizationId,
          roleIds: [...(driverOrganizationIds.has(organizationId) ? [DRIVER_ROLE_ID] : []), ...(submitted.assignments[organizationId] ?? [])],
          updatedAt: now,
        })).filter((row) => row.roleIds.length > 0)
        return [...updated, ...untouched]
      })
      setLogs((previous) => [{ id: `log-${Date.now()}`, userId, organizationIds: [...new Set([...Object.keys(originalForm.assignments), ...Object.keys(submitted.assignments), ...inheritedDriverOrganizationIds])], actor: mockSession.user.name, at: now, action: editingUserId ? "修改" : fromDriver ? "从司机添加" : "新增", changes }, ...previous])
      setBusy(false)
      setConfirmOpen(false)
      if (isCreate) setCreateOpen(false)
      else setPanel(hasVisibleRoleAfterSave ? { type: "detail", id: userId } : null)
      setPage(1)
      toast.success(editingUserId ? "修改成功" : "新增成功", { description: "原型模拟保存成功；刷新页面后恢复初始数据。" })
    }, 650)
  }

  function renderStaffForm() {
    return (
        <form id="staff-form" className="flex flex-col gap-6" onSubmit={submitForm} noValidate>
          <FieldGroup className="gap-5">
            {createOpen && <FieldSet><FieldLegend variant="label" className="mb-3 text-[#9d9999]">新增方式</FieldLegend><RadioGroup value={createMode} onValueChange={(value) => switchCreateMode(value as CreateMode)} className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <Field orientation="horizontal" className="w-auto items-center"><RadioGroupItem id="staff-create-direct" value="direct" disabled={busy} /><FieldLabel htmlFor="staff-create-direct">直接新增</FieldLabel></Field>
              <Field orientation="horizontal" className="w-auto items-center"><RadioGroupItem id="staff-create-driver" value="driver" disabled={busy} /><FieldLabel htmlFor="staff-create-driver">从司机添加</FieldLabel></Field>
            </RadioGroup></FieldSet>}
            {createOpen && createMode === "driver" && <Field data-invalid={Boolean(errors.driver)}><FieldLabel htmlFor="staff-driver-select">选择现有司机 <span className="text-destructive">*</span></FieldLabel>
              <Popover open={driverPickerOpen} onOpenChange={(open) => { setDriverPickerOpen(open); if (!open) setDriverQuery("") }}>
                <PopoverTrigger asChild><Button id="staff-driver-select" type="button" variant="outline" role="combobox" aria-expanded={driverPickerOpen} aria-controls="staff-driver-options" aria-invalid={Boolean(errors.driver)} disabled={busy} className="w-full justify-between font-normal"><span className={cn("truncate", !selectedDriver && "text-muted-foreground")}>{selectedDriver ? `${selectedDriver.name} · ${selectedDriver.userId} · ${driverOrganizationNames(selectedDriver.organizationIds)}` : "搜索并选择司机"}</span><ChevronDownIcon aria-hidden="true" /></Button></PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-72"><Input id="staff-driver-query" aria-label="搜索司机姓名、ID 或手机号" value={driverQuery} onChange={(event) => setDriverQuery(event.target.value)} placeholder="输入姓名、ID 或手机号" autoFocus onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); document.querySelector<HTMLButtonElement>("#staff-driver-options [role=option]")?.focus() } if (event.key === "Enter" && matchingDrivers.length === 1) { event.preventDefault(); selectDriver(matchingDrivers[0].userId) } }} />
                  <div id="staff-driver-options" role="listbox" aria-label="现有司机" className="flex max-h-56 flex-col gap-1 overflow-y-auto">{matchingDrivers.length ? matchingDrivers.map((driver) => <Button key={driver.userId} type="button" variant="ghost" role="option" aria-selected={selectedDriverId === driver.userId} className="w-full justify-start" onClick={() => selectDriver(driver.userId)}>{driver.userId} · {driver.name} · {driverOrganizationNames(driver.organizationIds)} · {maskPhone(driver.phoneCode, driver.phone)}</Button>) : <p className="px-2 py-3 text-sm text-muted-foreground">没有匹配的司机</p>}</div>
                </PopoverContent>
              </Popover><FieldError>{errors.driver}</FieldError>
            </Field>}
            {editingRow && <Field><FieldLabel>员工 ID</FieldLabel><Input value={editingRow.userId} disabled /></Field>}
            {rolePolicyError && <Alert variant="destructive"><AlertTitle>角色权限暂时无法获取</AlertTitle><AlertDescription>请重试加载最新权限配置后选择角色。</AlertDescription><AlertAction><Button type="button" variant="outline" size="xs" onClick={refreshRolePolicies}>重试</Button></AlertAction></Alert>}
            <fieldset disabled={driverPending} className={cn("flex flex-col gap-5", driverPending && "opacity-50")}>
            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={Boolean(errors.name)}><FieldLabel htmlFor="staff-name">员工姓名 <span className="text-destructive">*</span></FieldLabel><Input id="staff-name" className="text-base sm:text-sm" value={form.name} onChange={(event) => updateForm("name", event.target.value)} aria-invalid={Boolean(errors.name)} readOnly={createOpen && createMode === "driver"} /><FieldError>{errors.name}</FieldError></Field>
              <Field data-invalid={Boolean(errors.status)}><FieldLabel htmlFor="staff-status-edit">在职状态 <span className="text-destructive">*</span></FieldLabel><Select value={form.employmentStatus} onValueChange={(value) => updateForm("employmentStatus", value as EmploymentStatus)} disabled={(createOpen && createMode === "driver") || statusScopeLocked}><SelectTrigger id="staff-status-edit" className="w-full text-base sm:text-sm" aria-describedby={statusScopeLocked ? "staff-status-scope-note" : undefined} aria-invalid={Boolean(errors.status)}><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="active">在职</SelectItem><SelectItem value="inactive">离职</SelectItem></SelectGroup></SelectContent></Select>{statusScopeLocked && <FieldDescription id="staff-status-scope-note">{statusScopeMessage}</FieldDescription>}<FieldError>{errors.status}</FieldError></Field>
              <Field data-invalid={Boolean(errors.phone)}><FieldLabel htmlFor="staff-phone">手机号 <span className="text-destructive">*</span></FieldLabel><div className="flex gap-2"><Select value={form.phoneCode} onValueChange={(value) => updateForm("phoneCode", value)} disabled={createOpen && createMode === "driver"}><SelectTrigger aria-label="手机区号" className="w-24 text-base sm:text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="+1">+1</SelectItem><SelectItem value="+86">+86</SelectItem></SelectGroup></SelectContent></Select><Input id="staff-phone" className="min-w-0 flex-1 text-base sm:text-sm" inputMode="tel" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} aria-invalid={Boolean(errors.phone)} readOnly={createOpen && createMode === "driver"} /></div><FieldError>{errors.phone}</FieldError></Field>
              <Field data-invalid={Boolean(errors.email)}><FieldLabel htmlFor="staff-email">邮箱 <span className="text-destructive">*</span></FieldLabel><Input id="staff-email" className="text-base sm:text-sm" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} aria-invalid={Boolean(errors.email)} readOnly={driverEmailReadOnly} /><FieldError>{errors.email}</FieldError></Field>
            </div>
            <FieldSet><FieldLegend variant="label" className="text-[#868686]">DSP 车队权限配置 <span className="text-destructive">*</span></FieldLegend>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">已添加 {Object.keys(form.assignments).length} 个 DSP 车队</span>
                <Popover open={dspPickerOpen} onOpenChange={(open) => { setDspPickerOpen(open); if (!open) setDspQuery("") }}>
                  <PopoverTrigger asChild><Button type="button" variant="outline" size="sm" disabled={!availableOrganizations.length || busy}><PlusIcon data-icon="inline-start" />添加 DSP 车队</Button></PopoverTrigger>
                  <PopoverContent align="end" className="w-72"><FieldLabel htmlFor="staff-dsp-search">搜索 DSP 车队</FieldLabel><Input id="staff-dsp-search" value={dspQuery} onChange={(event) => setDspQuery(event.target.value)} placeholder="输入 DSP 车队名称" autoFocus />
                    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">{matchingOrganizations.length ? matchingOrganizations.map((organization) => <Button key={organization.id} type="button" variant="ghost" className="justify-start" onClick={() => { toggleOrganization(organization.id, true); setDspPickerOpen(false); setDspQuery("") }}>{organization.name}</Button>) : <p className="px-2 py-3 text-sm text-muted-foreground">没有匹配的 DSP 车队</p>}</div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-3">{accessibleOrganizations.filter((organization) => Object.hasOwn(form.assignments, organization.id)).map((organization) => <div key={organization.id} className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-medium"><TruckIcon className="size-4 text-muted-foreground" aria-hidden="true" />{organization.name}</span>{(!(createOpen && createMode === "driver" && hasDriverRole(organization.id)) || Boolean(form.assignments[organization.id]?.length)) && <Button type="button" variant="link" size="sm" onClick={() => toggleOrganization(organization.id, false)}>{hasDriverRole(organization.id) ? "移除管理权限" : "移除 DSP 车队"}</Button>}</div>
                {hasDriverRole(organization.id) && <div className="flex flex-wrap items-center gap-2"><Badge size="sm" variant="secondary">Driver</Badge><span className="text-xs text-muted-foreground">已有司机角色</span></div>}
                <FieldSet><FieldLegend variant="label" className="mb-3">管理角色 {(!hasDriverRole(organization.id) || (createOpen && createMode === "direct")) && <span className="text-destructive">*</span>}</FieldLegend><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{otherRoles.map((role) => <Field key={role.id} orientation="horizontal" className="min-w-0 items-center"><Checkbox id={organization.id + "-" + role.id} checked={form.assignments[organization.id]?.includes(role.id) ?? false} onCheckedChange={(checked) => toggleRole(organization.id, role.id, checked === true)} /><FieldLabel htmlFor={organization.id + "-" + role.id} className="min-w-0 flex-1 text-[13px] font-normal">{role.name}</FieldLabel><Button type="button" variant="link" size="xs" className="shrink-0" aria-label={`查看 ${role.name} 的具体权限`} onClick={(event) => openRolePreview(role.id, event.currentTarget)}><EyeIcon data-icon="inline-start" />查看权限</Button></Field>)}</div></FieldSet>
                {errors.assignments && !form.assignments[organization.id]?.length && !hasDriverRole(organization.id) && <p className="text-xs text-destructive">请为 {organization.name} 选择至少一个管理角色</p>}
              </div>)}{!Object.keys(form.assignments).length && <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">尚未添加 DSP 车队。点击“添加 DSP 车队”开始配置。</p>}</div>
            </FieldSet>
            <Field data-invalid={Boolean(errors.assignments)}><FieldError>{errors.assignments}</FieldError></Field>
            </fieldset>
          </FieldGroup>
        </form>
    )
  }

  if (!hasPermission) {
    return <Empty className="min-h-[24rem] border bg-card">
      <EmptyHeader><EmptyTitle>无权访问其他员工管理</EmptyTitle><EmptyDescription>当前账号没有该页面权限，请联系管理员。</EmptyDescription></EmptyHeader>
    </Empty>
  }

  return <div className="min-w-0">
    <div hidden={Boolean(panel)} ref={listRef} className="min-w-0">
      <Table
        variant="grid"
        aria-label="其他员工管理列表"
        className="sm:min-w-[1100px]"
        viewportClassName="mx-4 mb-4 rounded-lg border"
        toolbar={<form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); setOrganizationFilterOpen(false); setApplied(draft); setPage(1) }}>
          <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field><FieldLabel htmlFor="staff-name-filter">员工姓名</FieldLabel><Input id="staff-name-filter" value={draft.name} onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="输入员工姓名" /></Field>
            <Field><FieldLabel htmlFor="staff-id-filter">员工 ID</FieldLabel><Input id="staff-id-filter" value={draft.userId} onChange={(event) => setDraft((previous) => ({ ...previous, userId: event.target.value }))} placeholder="输入员工 ID" /></Field>
            <Field><FieldLabel htmlFor="staff-organization">DSP 车队</FieldLabel><Popover open={organizationFilterOpen} onOpenChange={setOrganizationFilterOpen}>
              <PopoverAnchor asChild><InputGroup><InputGroupInput id="staff-organization" role="combobox" aria-autocomplete="list" aria-expanded={organizationFilterOpen} aria-controls="staff-organization-options" autoComplete="off" value={draft.organizationQuery} placeholder="全部 DSP 车队（输入名称搜索）" onFocus={(event) => { if (suppressOrganizationFocusRef.current) return; setOrganizationFilterOpen(true); event.currentTarget.select() }} onChange={(event) => { setDraft((previous) => ({ ...previous, organizationId: "all", organizationQuery: event.target.value })); setOrganizationFilterOpen(true) }} onKeyDown={(event) => { if (event.key === "Escape") setOrganizationFilterOpen(false); if (event.key === "ArrowDown" && organizationFilterOpen) { event.preventDefault(); document.querySelector<HTMLButtonElement>("#staff-organization-options [role=option]")?.focus() } if (event.key === "Enter" && organizationFilterOpen && (!draft.organizationQuery.trim() || matchingFilterOrganizations.length)) { event.preventDefault(); selectOrganizationFilter(draft.organizationQuery.trim() ? matchingFilterOrganizations[0].id : "all") } }} /><InputGroupAddon align="inline-end"><ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden="true" /></InputGroupAddon></InputGroup></PopoverAnchor>
              <PopoverContent align="start" className="w-72" onOpenAutoFocus={(event) => event.preventDefault()}><div id="staff-organization-options" role="listbox" aria-label="选择 DSP 车队" className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {!draft.organizationQuery.trim() && <Button type="button" variant="ghost" role="option" aria-selected={draft.organizationId === "all"} className="w-full justify-start" onClick={() => selectOrganizationFilter("all")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectOrganizationFilter("all") } }}>全部 DSP 车队</Button>}
                {matchingFilterOrganizations.map((organization) => <Button key={organization.id} type="button" variant="ghost" role="option" aria-selected={draft.organizationId === organization.id} className="w-full justify-start" onClick={() => selectOrganizationFilter(organization.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectOrganizationFilter(organization.id) } }}>{organization.name}</Button>)}
                {!matchingFilterOrganizations.length && <p className="px-2 py-3 text-sm text-muted-foreground">没有匹配的 DSP 车队</p>}
              </div></PopoverContent>
            </Popover></Field>
            <Field><FieldLabel htmlFor="staff-employment">在职状态</FieldLabel><Select value={draft.employmentStatus} onValueChange={(value) => setDraft((previous) => ({ ...previous, employmentStatus: value }))}><SelectTrigger id="staff-employment" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">全部状态</SelectItem><SelectItem value="active">在职</SelectItem><SelectItem value="inactive">离职</SelectItem></SelectGroup></SelectContent></Select></Field>
          </FieldGroup>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" onClick={(event) => openCreate(event.currentTarget)}><PlusIcon data-icon="inline-start" />新增员工</Button>
            <div className="ml-auto flex items-center gap-2">
              <Button type="submit"><SearchIcon data-icon="inline-start" />查询</Button>
              <Button type="button" variant="outline" onClick={() => { setOrganizationFilterOpen(false); setDraft(emptyFilter); setApplied(emptyFilter); setPage(1) }}><RotateCcwIcon data-icon="inline-start" />重置</Button>
            </div>
          </div>
        </form>}
        footer={<DataPagination page={page} pageSize={pageSize} total={visibleUsers.length} pageSizeOptions={[10, 20, 50, 100]} onPageChange={(value) => { setPage(value); listRef.current?.scrollIntoView({ block: "start" }) }} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />}
      >
        <TableHeader><TableRow>
          <TableHead>员工 ID</TableHead>
          <TableHead>员工姓名</TableHead>
          <TableHead className="hidden sm:table-cell">DSP 车队与角色</TableHead>
          <TableHead>在职状态</TableHead>
          <TableHead className="hidden sm:table-cell">手机号</TableHead>
          <TableHead className="hidden sm:table-cell">邮箱</TableHead>
          <TableHead className="hidden sm:table-cell">最后修改时间</TableHead>
          <TableHead sticky="right" className="w-28 text-center sm:w-36">操作</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {pagedUsers.map((user) => { const row = user.representative; const matchesFilter = (relation: StaffRow) => applied.organizationId !== "all" ? relation.organizationId === applied.organizationId : Boolean(applied.organizationQuery.trim() && organizationName(relation.organizationId).toLowerCase().includes(applied.organizationQuery.trim().toLowerCase())); const relations = [...user.relations].sort((a, b) => Number(matchesFilter(b)) - Number(matchesFilter(a)) || a.organizationId.localeCompare(b.organizationId)); return <TableRow key={user.userId} data-staff-user-id={user.userId} data-state={returnedId === user.userId ? "selected" : undefined}>
            <TableCell className="tabular-nums">{row.userId}</TableCell>
            <TableCell><div className="flex flex-col gap-1 py-2"><span>{row.name}</span><span className="text-muted-foreground sm:hidden">{relations.length} 个 DSP 车队 · {organizationName(relations[0].organizationId)}</span></div></TableCell>
            <TableCell className="hidden sm:table-cell"><div className="flex max-w-96 flex-col gap-1 py-2" title={relations.map((relation) => `${organizationName(relation.organizationId)}：${relation.roleIds.map(roleName).join("、")}`).join("\n")}>{relations.slice(0, 2).map((relation) => <span key={relation.organizationId} className="truncate"><span className="font-medium">{organizationName(relation.organizationId)}</span>：{relation.roleIds.map(roleName).join("、")}</span>)}{relations.length > 2 && <span className="text-muted-foreground">另有 {relations.length - 2} 个 DSP 车队，详情中查看</span>}</div></TableCell>
            <TableCell><Badge size="sm" variant={row.employmentStatus === "active" ? "success" : "secondary"}>{row.employmentStatus === "active" ? "在职" : "离职"}</Badge></TableCell>
            <TableCell className="hidden tabular-nums sm:table-cell">{maskPhone(row.phoneCode, row.phone)}</TableCell>
            <TableCell className="hidden sm:table-cell">{maskEmail(row.email)}</TableCell>
            <TableCell className="hidden tabular-nums sm:table-cell">{formatDateTime(user.updatedAt, { timeZone, includeSeconds: false })}</TableCell>
            <TableCell sticky="right" className="w-28 text-center sm:w-36"><div className="flex justify-center gap-1">
              <Button variant="link" size="sm" onClick={(event) => enterPanel({ type: "detail", id: user.userId }, event.currentTarget)}>详情</Button>
              <Button variant="link" size="sm" onClick={(event) => openEdit(row, event.currentTarget)}>修改</Button>
            </div></TableCell>
          </TableRow> })}
          {!pagedUsers.length && <TableRow><TableCell colSpan={8}><Empty className="min-h-36"><EmptyHeader><EmptyTitle>没有符合条件的员工</EmptyTitle><EmptyDescription>调整条件重新查询，或新增其他员工。</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>

    {panel && <WithdrawalRecordWorkspace<StaffPanel>
      panel={panel}
      title="其他员工管理"
      showListHeader={false}
      cards={workspaceUsers.map((user) => ({
        id: user.userId,
        label: "查看 " + user.representative.name + " · " + user.relations.length + " 个管理 DSP 车队",
        content: <>
          <span className="flex min-w-0 items-center justify-between gap-2"><span className="truncate text-sm font-medium">{user.representative.name}</span><Badge size="sm" variant={user.representative.employmentStatus === "active" ? "success" : "secondary"}>{user.representative.employmentStatus === "active" ? "在职" : "离职"}</Badge></span>
          <span className="truncate text-xs text-muted-foreground">{user.userId} · {user.relations.length} 个管理 DSP 车队</span>
          <span className="truncate text-xs text-muted-foreground" title={user.relations.map((row) => organizationName(row.organizationId)).join("、")}>{user.relations.map((row) => organizationName(row.organizationId)).join("、")}</span>
        </>,
      }))}
      detailPanel={(id) => ({ type: "detail", id })}
      onNavigate={navigatePanel}
      onReturn={returnToList}
      navigationLocked={busy}
    >{(navigation: RecordNavigation<StaffPanel>) => <>
      {panel.type === "edit" && <WorkflowPanel
        key={panel.id + "-edit"}
        title="修改员工"
        description="填写基本信息，按 DSP 车队配置管理角色。"
        dirty={dirty || busy}
        onClose={navigation.onCancel}
        footer={(requestClose) => <>
          <Button variant="outline" type="button" disabled={busy} onClick={requestClose}>取消</Button>
          <Button type="submit" form="staff-form" disabled={busy}>提交</Button>
        </>}
      >
        {renderStaffForm()}
      </WorkflowPanel>}

      {panel.type === "detail" && selectedRow && <WorkflowPanel
        key={selectedRow.userId + "-detail"}
        title="员工详情"
        description={selectedRow.userId + " · " + selectedRow.name + " · " + rows.filter((row) => row.userId === selectedRow.userId && allowedIds.has(row.organizationId)).length + " 个 DSP 车队"}
        onClose={returnToList}
        footer={() => <>
          <Button onClick={() => navigation.onNavigate({ type: "edit", id: selectedRow.userId })}>修改</Button>
        </>}
      >
        <section className="flex flex-col gap-4"><h3 className="text-base font-medium">基本信息</h3>
          <dl className="grid gap-5 sm:grid-cols-2">{[
            ["员工 ID", selectedRow.userId],
            ["员工姓名", selectedRow.name],
            ["在职状态", selectedRow.employmentStatus === "active" ? "在职" : "离职"],
            ["手机号", selectedRow.phoneCode + " " + selectedRow.phone],
            ["邮箱", selectedRow.email],
            ["最后修改时间", formatDateTime(selectedUser?.updatedAt ?? selectedRow.updatedAt, { timeZone, includeSeconds: false })],
          ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}</dl>
        </section>
        <section className="flex flex-col gap-4 border-t pt-6"><h3 className="text-base font-medium">DSP 车队与角色</h3>
          <div className="overflow-hidden rounded-lg border">
            <ul className="divide-y">{rows.filter((row) => row.userId === selectedRow.userId && allowedIds.has(row.organizationId)).map((row) => {
              const managementRoles = row.roleIds.filter((roleId) => roleId !== DRIVER_ROLE_ID)
              const hasDriver = row.roleIds.includes(DRIVER_ROLE_ID)
              const expanded = expandedRoleRows.includes(row.relationId)
              const visibleRoles = expanded ? managementRoles : managementRoles.slice(0, 3)
              return <li key={row.relationId} className="flex flex-col gap-3 px-4 py-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <h4 className="flex items-center gap-2 text-sm font-medium"><TruckIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{organizationName(row.organizationId)}</h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{managementRoles.length} 个管理角色</span>
                    {hasDriver && <><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1">司机角色 <Badge size="sm" variant="secondary">Driver</Badge></span></>}
                  </div>
                </div>
                {managementRoles.length > 0 && <div className="min-w-0">
                  <div className="flex flex-wrap items-start gap-2" aria-label={`${organizationName(row.organizationId)} 的管理角色`}>
                    {visibleRoles.map((roleId) => <Button key={roleId} type="button" variant="outline" size="sm" className="h-auto min-h-8 max-w-full justify-start whitespace-normal py-1 text-left" aria-label={`查看 ${roleName(roleId)} 的具体权限`} onClick={(event) => openRolePreview(roleId, event.currentTarget)}><EyeIcon data-icon="inline-start" className="text-brand" /><span className="min-w-0 break-words">{roleName(roleId)}</span></Button>)}
                    {managementRoles.length > 3 && <Button type="button" variant="link" size="xs" aria-expanded={expanded} onClick={() => setExpandedRoleRows((current) => expanded ? current.filter((id) => id !== row.relationId) : [...current, row.relationId])}>{expanded ? "收起" : `展开另外 ${managementRoles.length - 3} 个角色`}</Button>}
                  </div>
                </div>}
              </li>
            })}</ul>
          </div>
        </section>
        <section className="flex flex-col gap-4 border-t pt-6"><h3 className="text-base font-medium">操作记录</h3>
          {history.length ? <ol className="audit-timeline" aria-label="员工操作记录时间线，最新记录在前">{history.map((entry, index) => <li key={entry.id} className="audit-timeline__item" data-latest={index === 0}><div className="audit-timeline__track" aria-hidden="true"><span className="audit-timeline__node" data-tone={index === 0 ? "success" : undefined} /></div><div className="audit-timeline__content"><div className="audit-timeline__heading"><h4>{logTitle(entry)}</h4>{index === 0 && <Badge size="sm" variant="secondary">最新</Badge>}</div><div className="audit-timeline__meta"><time dateTime={entry.at} title={timeZone}>{formatDateTime(entry.at, { timeZone, includeSeconds: false })}</time><span className="audit-timeline__operator">· 操作人：{entry.actor || "—"}</span></div><div className="audit-timeline__notes">{entry.changes.map((change) => <p key={change}>{change}</p>)}</div></div></li>)}</ol> : <Empty className="min-h-36"><EmptyHeader><EmptyTitle>暂无操作记录</EmptyTitle><EmptyDescription>新增或修改员工后，操作会显示在这里。</EmptyDescription></EmptyHeader></Empty>}
        </section>
      </WorkflowPanel>}
    </>}</WithdrawalRecordWorkspace>}

    <Sheet open={createOpen} onOpenChange={(open) => { if (!open) requestCloseCreate() }}><SheetContent className={sheetWidth} onEscapeKeyDown={(event) => { if (busy || dirty) { event.preventDefault(); if (!busy) setDiscardCreateOpen(true) } }}>
      <SheetHeader className="px-[30px] pt-[30px] pb-5"><SheetTitle>新增员工</SheetTitle><SheetDescription>选择新增方式，并为目标 DSP 车队分配管理角色。</SheetDescription></SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-[30px] pb-[30px]">{renderStaffForm()}</div>
      <div className="flex flex-wrap justify-end gap-2 border-t px-[30px] py-[18px]"><Button variant="outline" disabled={busy} onClick={requestCloseCreate}>取消</Button><Button type="submit" form="staff-form" disabled={busy}>提交</Button></div>
    </SheetContent></Sheet>

    <Sheet open={Boolean(previewRoleId)} onOpenChange={(open) => { if (!open) setPreviewRoleId(null) }}>
      <SheetContent className="max-w-[100vw] gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none md:data-[side=right]:w-[70vw] md:data-[side=right]:max-w-4xl" onCloseAutoFocus={(event) => { event.preventDefault(); rolePreviewTriggerRef.current?.focus() }}>
        <SheetHeader className="shrink-0 px-[30px] pt-[30px] pb-5">
          <SheetTitle>{previewRole?.name ?? "角色"} · 权限预览</SheetTitle>
          <SheetDescription>{previewRoleId} · 当前已保存的权限配置，仅供查看。</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto border-t px-[30px] py-[30px]">
          {previewPolicy ? <div className="grid min-w-[640px] grid-cols-2 gap-6">
            {(["web", "app"] as const).map((platform) => {
              const login = previewPolicy[platform].login
              const effectiveCodes = effectivePermissionCodes(platform, login, previewPolicy[platform].grants)
              return <section key={platform} className={cn("min-w-0", platform === "web" && "border-r pr-6")}>
                <div className="flex items-center justify-between gap-3"><h3 className="text-base font-medium">{platform === "web" ? "Web" : "App"} 权限</h3><Badge size="sm" variant={login ? "success" : "secondary"}>{login ? "允许登录" : "禁止登录"}</Badge></div>
                <p className="mt-2 text-xs text-muted-foreground">当前生效 {effectiveCodes.length} 项</p>
                {effectiveCodes.length ? <div className="mt-5"><PermissionPreviewTree platform={platform} codes={effectiveCodes} /></div> : <Empty className="mt-5 min-h-32"><EmptyHeader><EmptyTitle>暂无生效权限</EmptyTitle><EmptyDescription>{login ? "尚未授予可生效的功能权限。" : "禁止登录，已配置权限暂不生效。"}</EmptyDescription></EmptyHeader></Empty>}
              </section>
            })}
          </div> : <Empty className="min-h-40"><EmptyHeader><EmptyTitle>无法获取角色权限</EmptyTitle><EmptyDescription>该角色尚未保存权限配置，请返回后重试。</EmptyDescription></EmptyHeader></Empty>}
        </div>
      </SheetContent>
    </Sheet>

    <AlertDialog open={Boolean(modeSwitchTarget)} onOpenChange={(open) => { if (!open) setModeSwitchTarget(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>切换新增方式？</AlertDialogTitle><AlertDialogDescription>切换后将清空当前填写的内容和已选角色。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={() => setModeSwitchTarget(null)}>继续填写</Button><Button onClick={() => { if (modeSwitchTarget) setCreateMode(modeSwitchTarget); setModeSwitchTarget(null); setSelectedDriverId(""); setDriverQuery(""); setDriverPickerOpen(false); setForm({ ...emptyForm, assignments: {} }); setOriginalForm({ ...emptyForm, assignments: {} }); setErrors({}) }}>确认切换</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={discardCreateOpen} onOpenChange={setDiscardCreateOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>放弃未提交的内容？</AlertDialogTitle><AlertDialogDescription>关闭新增抽屉后，当前填写的内容将不会保留。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={() => setDiscardCreateOpen(false)}>继续填写</Button><Button variant="destructive" onClick={() => { setDiscardCreateOpen(false); setCreateOpen(false) }}>放弃修改</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!busy) setConfirmOpen(open) }}>
      <AlertDialogContent className="sm:max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{turningInactive ? "确认设置离职并保存？" : editingUserId ? "确认保存员工修改？" : createMode === "driver" ? "确认从司机添加？" : "确认直接新增员工？"}</AlertDialogTitle>
          <AlertDialogDescription className={editingUserId || createMode === "driver" ? "sr-only" : undefined}>{editingUserId || createMode === "driver" ? "请核对员工信息及 DSP 车队角色后确认提交。" : "DMS 校验并创建账号后，将向该邮箱发送用户名和初始密码；管理角色关系保存在本系统。"}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto text-sm">
          {turningInactive && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">离职后，司机账号也将不可用，无法登录司机 App。若只需停用 DSP 管理系统权限，建议移除对应的非 Driver 角色。</div>}
          {driverOnlyOrganizations.length > 0 && <div className="rounded-md border bg-muted/40 p-3">移除管理角色后，{driverOnlyOrganizations.map(organizationName).join("、")} 仅保留 Driver，将不再显示在列表的 DSP 车队与角色摘要；若该员工所有 DSP 车队都只剩 Driver，整条员工记录不再展示。修改日志保留。</div>}
          <p>员工：{form.name.trim()} · 手机：{form.phoneCode} {form.phone}</p>
          <p className="break-all">邮箱：{form.email.trim()}</p>
          <div className="flex flex-col gap-2"><span className="font-medium">DSP 车队与分配角色</span>{Object.entries(form.assignments).map(([organizationId, roleIds]) => <p key={organizationId}>{organizationName(organizationId)}：{roleIds.length ? roleIds.map(roleName).join("、") : "仅保留 Driver"}</p>)}</div>
          {editingUserId && <div className="flex flex-col gap-1 border-t pt-3"><span className="font-medium">本次变更</span><ul className="flex list-disc flex-col gap-1 ps-5">{buildChanges(editingUserId).map((change) => <li key={change}>{change}</li>)}</ul></div>}
        </div>
        <AlertDialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirmOpen(false)}>返回修改</Button><Button disabled={busy} onClick={confirmSave}>{busy ? writesDmsAccount ? "DMS 校验中…" : "保存中…" : turningInactive ? "确认离职并保存" : "确认提交"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}
