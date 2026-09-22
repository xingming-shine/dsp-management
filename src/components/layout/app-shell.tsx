import type { ReactNode } from "react"

import { AppBreadcrumbProvider } from "@/components/layout/app-breadcrumb-context"
import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SkipToMain } from "@/components/layout/skip-to-main"
import { OrganizationProvider } from "@/features/organizations/organization-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <OrganizationProvider>
      <SidebarProvider defaultOpen={false} hoverExpand>
        <AppBreadcrumbProvider>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset className="@container/content min-w-0 bg-background [--header-sidebar-offset:0px] md:peer-data-[state=expanded]:[--header-sidebar-offset:calc(var(--sidebar-width)-var(--sidebar-width-icon))]">
            <AppHeader />
            <main
              id="main"
              tabIndex={-1}
              className="flex w-full flex-1 flex-col p-4 outline-none"
            >
              {children}
            </main>
          </SidebarInset>
        </AppBreadcrumbProvider>
      </SidebarProvider>
    </OrganizationProvider>
  )
}
