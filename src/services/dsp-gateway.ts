import type { AuthSession } from "@/features/auth/types"
import type { OrganizationSummary } from "@/features/organizations/types"
import type { UserPreferences } from "@/features/preferences/types"

export interface LoginInput {
  phone: string
  password: string
  captchaToken: string
  captchaAnswer: string
}

export interface DspGateway {
  getSession(): Promise<AuthSession | null>
  login(input: LoginInput): Promise<AuthSession>
  logout(): Promise<void>
  switchOrganization(organizationId: OrganizationSummary["id"]): Promise<void>
  updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences>
}
