import type { OrganizationSummary } from "@/features/organizations/types"
import type { UserPreferences } from "@/features/preferences/types"

export type UserRole = "owner" | "manager" | "finance" | "cs"

export interface SessionUser {
  id: string
  name: string
  phone: string
  email: string
  gender: "male" | "female"
  createdAt: string
  role: UserRole
}

export interface AuthSession {
  user: SessionUser
  isSystemAdmin?: boolean
  organizations: OrganizationSummary[]
  currentOrganizationId: string
  permissions: string[]
  preferences: UserPreferences
}
