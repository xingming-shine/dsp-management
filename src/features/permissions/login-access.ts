/**
 * DMS 数据进入 DSP 后的标准化结构。角色、组织和成员状态都由上游提供，
 * DSP 只使用稳定 ID 做判断，不比较“司机”等展示名称。
 */
export interface ExternalRole {
  roleId: string
  active: boolean
}

export interface ExternalOrganizationMembership {
  organizationId: string
  organizationType: "dsp" | "other"
  organizationActive: boolean
  membershipActive: boolean
  roles: readonly ExternalRole[]
}

export interface LoginRoleInput {
  accountActive: boolean
  memberships: readonly ExternalOrganizationMembership[]
  driverRoleId: string
}

export interface SystemAccessPolicy {
  roleId: string
  /** null 表示该角色的通用策略；指定组织的策略优先且完整替代通用策略。 */
  organizationId: string | null
  enabled: boolean
}

export interface DspLoginAccessInput extends LoginRoleInput {
  systemAccessPolicies: readonly SystemAccessPolicy[]
}

export type LoginRoleDecision =
  | { allowed: true; reason: "allowed"; roleIds: string[] }
  | {
      allowed: false
      reason: "account_inactive" | "no_active_dsp_role" | "driver_only"
      roleIds: string[]
    }

export type DspLoginAccessDecision = {
  allowed: boolean
  reason: LoginRoleDecision["reason"] | "no_admitted_organization"
  roleIds: string[]
  organizationIds: string[]
}

function activeDspMemberships(memberships: readonly ExternalOrganizationMembership[]) {
  return memberships.filter(
    (membership) =>
      membership.organizationId.trim() &&
      membership.organizationType === "dsp" &&
      membership.organizationActive &&
      membership.membershipActive
  )
}

/**
 * 登录角色规则：所有有效 DSP 组织的角色并集必须包含至少一个非司机角色。
 *
 * 这只是登录门槛，不决定用户能进入哪些组织。具体组织仍要用该组织下的
 * 有效角色检查 DSP 本地的 system.access 策略。
 */
export function evaluateDspLoginRole(input: LoginRoleInput): LoginRoleDecision {
  if (!input.driverRoleId.trim()) {
    throw new Error("必须配置上游司机角色的稳定 ID")
  }

  if (!input.accountActive) {
    return { allowed: false, reason: "account_inactive", roleIds: [] }
  }

  const roleIds = [
    ...new Set(
      activeDspMemberships(input.memberships)
        .flatMap((membership) => membership.roles)
        .filter((role) => role.active && role.roleId.trim())
        .map((role) => role.roleId)
    ),
  ]

  if (roleIds.length === 0) {
    return { allowed: false, reason: "no_active_dsp_role", roleIds }
  }

  if (roleIds.length === 1 && roleIds[0] === input.driverRoleId) {
    return { allowed: false, reason: "driver_only", roleIds }
  }

  return { allowed: true, reason: "allowed", roleIds }
}

/**
 * 在全局登录角色规则通过后，逐组织计算 DSP 本地 system.access。
 * 只有返回的 organizationIds 可以用于会话中的组织选择。
 */
export function resolveDspLoginAccess(input: DspLoginAccessInput): DspLoginAccessDecision {
  const roleDecision = evaluateDspLoginRole(input)
  if (!roleDecision.allowed) {
    return { ...roleDecision, organizationIds: [] }
  }

  const policies = new Map(
    input.systemAccessPolicies.map((policy) => [
      JSON.stringify([policy.organizationId, policy.roleId]),
      policy.enabled,
    ])
  )
  const admitted = (organizationId: string, roleId: string) => {
    const exact = JSON.stringify([organizationId, roleId])
    const general = JSON.stringify([null, roleId])
    return policies.has(exact) ? policies.get(exact) === true : policies.get(general) === true
  }

  const organizationIds = [
    ...new Set(
      activeDspMemberships(input.memberships)
        .filter((membership) =>
          membership.roles.some(
            (role) => role.active && role.roleId.trim() && admitted(membership.organizationId, role.roleId)
          )
        )
        .map((membership) => membership.organizationId)
    ),
  ]

  return organizationIds.length > 0
    ? { ...roleDecision, organizationIds }
    : {
        allowed: false,
        reason: "no_admitted_organization",
        roleIds: roleDecision.roleIds,
        organizationIds,
      }
}
