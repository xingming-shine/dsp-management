export type Role = { id: string; name: string; level: string }
export type RolePolicy = Record<"web" | "app", { login: boolean; grants: string[] }>
import { matrixLogin, matrixRoleIds, permissionMatrix } from "@/features/system-management/permission-matrix"

export const roleCatalog: Role[] = [
  { id: "role-owner", name: "DSP Owner", level: "车队" },
  { id: "role-manager", name: "DSP Manager", level: "车队" },
  { id: "role-finance", name: "DSP Financial Manager", level: "车队" },
  { id: "role-support", name: "DSP Customer Support Specialist", level: "车队" },
  { id: "role-driver-lead", name: "DSP Driver Lead", level: "车队" },
  { id: "role-route-supervisor", name: "DSP Route Supervisor", level: "车队" },
  { id: "role-quality-auditor", name: "DSP Quality Auditor", level: "车队" },
]

export const superAdminRole: Role = { id: "role-super-manager", name: "DSP Super Manager", level: "Gofo-Express 总部" }

export const initialRolePolicies: Record<string, RolePolicy> = Object.fromEntries(matrixRoleIds.map((roleId) => [roleId, {
  web: { login: matrixLogin.web[roleId], grants: permissionMatrix.web.filter((row) => roleId === superAdminRole.id || row.allowed.includes(roleId)).map((row) => row.code) },
  app: { login: matrixLogin.app[roleId], grants: permissionMatrix.app.filter((row) => roleId === superAdminRole.id || row.allowed.includes(roleId)).map((row) => row.code) },
}]))

export const ROLE_POLICY_STORAGE_KEY = "dsp-system-permissions-demo-v6"
const presetRoleIds = new Set<string>(matrixRoleIds)

export function migrateV5RolePolicies(previous: Record<string, RolePolicy>): Record<string, RolePolicy> {
  return { ...previous, [superAdminRole.id]: initialRolePolicies[superAdminRole.id] }
}

export function migrateOldRolePolicies(previous: Record<string, RolePolicy>): Record<string, RolePolicy> {
  return {
    ...initialRolePolicies,
    ...Object.fromEntries(Object.entries(previous).filter(([roleId]) => !presetRoleIds.has(roleId))),
  }
}

// Prototype-only reader. The real product reads the saved DSP role policy by DMS roleId.
export function readSavedRolePolicies(): Record<string, RolePolicy> | null {
  if (typeof window === "undefined") return initialRolePolicies
  for (const key of [ROLE_POLICY_STORAGE_KEY, "dsp-system-permissions-demo-v5", "dsp-system-permissions-demo-v4", "dsp-system-permissions-demo-v3", "dsp-system-permissions-demo-v2", "dsp-system-permissions-demo-v1"]) {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
      const stored = parsed as Record<string, unknown>
      const policies = "policies" in stored ? stored.policies : stored
      if (policies && typeof policies === "object" && !Array.isArray(policies) && Object.values(policies).every((value) => {
        if (!value || typeof value !== "object") return false
        const policy = value as Record<string, unknown>
        return ["web", "app"].every((platform) => {
          const entry = policy[platform] as { login?: unknown; grants?: unknown } | undefined
          return typeof entry?.login === "boolean" && Array.isArray(entry.grants)
        })
      })) return key === ROLE_POLICY_STORAGE_KEY ? policies as Record<string, RolePolicy> : key === "dsp-system-permissions-demo-v5" ? migrateV5RolePolicies(policies as Record<string, RolePolicy>) : migrateOldRolePolicies(policies as Record<string, RolePolicy>)
      return null
    } catch { return null }
  }
  return initialRolePolicies
}
