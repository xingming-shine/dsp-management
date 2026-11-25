"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { mockSession } from "@/mocks/session"

const STORAGE_KEY = "dsp-current-organization"

interface OrganizationContextValue {
  organizationId: string
  organization: (typeof mockSession.organizations)[number]
  setOrganizationId: (organizationId: string) => void
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

function validOrganizationId(value: string | null) {
  return mockSession.organizations.some((organization) => organization.id === value)
    ? value
    : null
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizationId, setOrganizationIdState] = useState(mockSession.currentOrganizationId)

  useEffect(() => {
    const syncFromLocation = () => {
      const queryValue = validOrganizationId(new URLSearchParams(window.location.search).get("org"))
      const storedValue = validOrganizationId(window.localStorage.getItem(STORAGE_KEY))
      setOrganizationIdState(queryValue ?? storedValue ?? mockSession.currentOrganizationId)
    }
    syncFromLocation()
    window.addEventListener("popstate", syncFromLocation)
    return () => window.removeEventListener("popstate", syncFromLocation)
  }, [])

  const setOrganizationId = useCallback((nextOrganizationId: string) => {
    if (!validOrganizationId(nextOrganizationId)) return
    setOrganizationIdState(nextOrganizationId)
    window.localStorage.setItem(STORAGE_KEY, nextOrganizationId)
    const url = new URL(window.location.href)
    url.searchParams.set("org", nextOrganizationId)
    window.history.replaceState(null, "", url)
  }, [])

  const organization = useMemo(
    () => mockSession.organizations.find((item) => item.id === organizationId) ?? mockSession.organizations[0],
    [organizationId]
  )

  return (
    <OrganizationContext.Provider value={{ organizationId, organization, setOrganizationId }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) throw new Error("useOrganization 必须在 OrganizationProvider 内使用")
  return context
}
