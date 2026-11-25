"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type AppBreadcrumbItem = {
  label: string
  href?: string
  onSelect?: () => void
}

type AppBreadcrumbContextValue = {
  items: AppBreadcrumbItem[]
  setItems: (items: AppBreadcrumbItem[]) => void
}

const AppBreadcrumbContext = createContext<AppBreadcrumbContextValue | null>(
  null
)

export function AppBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppBreadcrumbItem[]>([])
  const value = useMemo(() => ({ items, setItems }), [items])

  return (
    <AppBreadcrumbContext.Provider value={value}>
      {children}
    </AppBreadcrumbContext.Provider>
  )
}

export function useAppBreadcrumbItems() {
  return useContext(AppBreadcrumbContext)?.items ?? []
}

export function useAppBreadcrumbs(items: AppBreadcrumbItem[]) {
  const setItems = useContext(AppBreadcrumbContext)?.setItems

  useEffect(() => {
    if (!setItems) return

    setItems(items)
    return () => setItems([])
  }, [items, setItems])
}
