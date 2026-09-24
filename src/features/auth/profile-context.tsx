"use client"

import { createContext, useCallback, useContext, useState, useSyncExternalStore, type ReactNode } from "react"

import type { SessionUser } from "@/features/auth/types"
import { mockSession } from "@/mocks/session"

const STORAGE_KEY = "dsp-profile"

type EditableProfile = Pick<SessionUser, "name" | "phone" | "email" | "gender">

interface ProfileContextValue {
  user: SessionUser
  saveProfile: (profile: EditableProfile) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function isEditableProfile(value: unknown): value is EditableProfile {
  if (!value || typeof value !== "object") return false
  const profile = value as Record<string, unknown>
  return typeof profile.name === "string" &&
    typeof profile.phone === "string" &&
    typeof profile.email === "string" &&
    (profile.gender === "male" || profile.gender === "female")
}

function readSavedUser(): SessionUser {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")
    if (isEditableProfile(saved)) return { ...mockSession.user, ...saved }
  } catch {
    // Invalid saved mock data falls back to the bundled session.
  }
  return mockSession.user
}

const subscribeHydration = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function ProfileProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot)
  const [savedUser, setSavedUser] = useState<SessionUser | null>(null)
  const user = savedUser ?? (hydrated ? readSavedUser() : mockSession.user)

  const saveProfile = useCallback((profile: EditableProfile) => {
    const updated = { ...mockSession.user, ...profile }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    mockSession.user = updated
    setSavedUser(updated)
  }, [])

  return (
    <ProfileContext.Provider value={{ user, saveProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) throw new Error("useProfile 必须在 ProfileProvider 内使用")
  return context
}
