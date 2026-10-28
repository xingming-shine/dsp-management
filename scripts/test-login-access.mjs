import assert from "node:assert/strict"
import { test } from "node:test"

import {
  evaluateDspLoginRole,
  resolveDspLoginAccess,
} from "../src/features/permissions/login-access.ts"

const role = (roleId, active = true) => ({ roleId, active })
const membership = (
  organizationId,
  roles,
  overrides = {}
) => ({
  organizationId,
  organizationType: "dsp",
  organizationActive: true,
  membershipActive: true,
  roles,
  ...overrides,
})
const evaluate = (memberships, overrides = {}) =>
  evaluateDspLoginRole({
    accountActive: true,
    memberships,
    driverRoleId: "driver",
    ...overrides,
  })

test("driver-only roles across multiple DSP organizations cannot log in", () => {
  assert.deepEqual(
    evaluate([
      membership("org-a", [role("driver")]),
      membership("org-b", [role("driver")]),
    ]),
    { allowed: false, reason: "driver_only", roleIds: ["driver"] }
  )
})

test("a non-driver role in any active DSP organization passes the login rule", () => {
  assert.deepEqual(
    evaluate([
      membership("org-a", [role("driver")]),
      membership("org-b", [role("manager")]),
    ]),
    { allowed: true, reason: "allowed", roleIds: ["driver", "manager"] }
  )
})

test("roles outside active DSP memberships do not count", () => {
  const decision = evaluate([
    membership("org-a", [role("driver")]),
    membership("org-b", [role("manager")], { organizationType: "other" }),
    membership("org-c", [role("finance")], { organizationActive: false }),
    membership("org-d", [role("owner")], { membershipActive: false }),
    membership("org-e", [role("cs", false)]),
  ])
  assert.deepEqual(decision, {
    allowed: false,
    reason: "driver_only",
    roleIds: ["driver"],
  })
})

test("no active DSP roles and inactive accounts are denied", () => {
  assert.deepEqual(evaluate([]), {
    allowed: false,
    reason: "no_active_dsp_role",
    roleIds: [],
  })
  assert.deepEqual(
    evaluate([membership("org-a", [role("manager")])], {
      accountActive: false,
    }),
    { allowed: false, reason: "account_inactive", roleIds: [] }
  )
})

test("local system access must admit at least one organization", () => {
  const memberships = [
    membership("org-a", [role("driver")]),
    membership("org-b", [role("manager")]),
  ]
  assert.deepEqual(
    resolveDspLoginAccess({
      accountActive: true,
      memberships,
      driverRoleId: "driver",
      systemAccessPolicies: [],
    }),
    {
      allowed: false,
      reason: "no_admitted_organization",
      roleIds: ["driver", "manager"],
      organizationIds: [],
    }
  )
})

test("organization-specific policy overrides general role access", () => {
  const decision = resolveDspLoginAccess({
    accountActive: true,
    memberships: [
      membership("org-a", [role("manager")]),
      membership("org-b", [role("manager")]),
    ],
    driverRoleId: "driver",
    systemAccessPolicies: [
      { organizationId: null, roleId: "manager", enabled: true },
      { organizationId: "org-b", roleId: "manager", enabled: false },
    ],
  })
  assert.equal(decision.allowed, true)
  assert.deepEqual(decision.organizationIds, ["org-a"])
})

test("login union does not grant an organization without its own admitted role", () => {
  const decision = resolveDspLoginAccess({
    accountActive: true,
    memberships: [
      membership("org-a", [role("driver")]),
      membership("org-b", [role("finance")]),
    ],
    driverRoleId: "driver",
    systemAccessPolicies: [
      { organizationId: "org-b", roleId: "finance", enabled: true },
    ],
  })
  assert.equal(decision.allowed, true)
  assert.deepEqual(decision.organizationIds, ["org-b"])
})
