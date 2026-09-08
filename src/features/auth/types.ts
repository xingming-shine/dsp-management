import type { OrganizationSummary } from "@/features/organizations/types"
import type { UserPreferences } from "@/features/preferences/types"

export type UserRole = "owner" | "manager" | "finance" | "cs"

export interface SessionUser {
  id: string
  name: string
  phone: string
  email: string
  role: UserRole
}

export interface AuthSession {
  user: SessionUser
  organizations: OrganizationSummary[]
  currentOrganizationId: string
  permissions: string[]
  preferences: UserPreferences
}
