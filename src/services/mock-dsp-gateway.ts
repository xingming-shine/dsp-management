import { mockSession } from "@/mocks/session"
import type { DspGateway } from "@/services/dsp-gateway"

let activeSession = mockSession

export const mockDspGateway: DspGateway = {
  async getSession() {
    return activeSession
  },
  async login() {
    activeSession = mockSession
    return activeSession
  },
  async logout() {
    return
  },
  async switchOrganization(organizationId) {
    activeSession = {
      ...activeSession,
      currentOrganizationId: organizationId,
    }
  },
  async updatePreferences(preferences) {
    const nextPreferences = {
      ...activeSession.preferences,
      ...preferences,
    }
    mockSession.preferences = nextPreferences
    activeSession = {
      ...activeSession,
      preferences: nextPreferences,
    }
    return activeSession.preferences
  },
}
