"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRightIcon, PackageCheckIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  primaryNavigation,
  type NavigationItem,
} from "@/config/navigation"

function isActive(item: NavigationItem, pathname: string): boolean {
  if (item.href === pathname) {
    return true
  }

  return item.children?.some((child) => isActive(child, pathname)) ?? false
}

function flattenSingleChild(item: NavigationItem): NavigationItem {
  const [onlyChild] = item.children ?? []

  if (
    item.children?.length === 1 &&
    onlyChild.label === item.label &&
    !onlyChild.children
  ) {
    return {
      ...item,
      href: onlyChild.href,
      permission: onlyChild.permission,
      status: onlyChild.status,
      children: undefined,
    }
  }

  return item
}

function NavigationLeaf({
  item,
  pathname,
  nested = false,
}: {
  item: NavigationItem
  pathname: string
  nested?: boolean
}) {
  const Icon = item.icon
  const active = isActive(item, pathname)
  const href = item.status === "available" ? item.href : undefined

  if (nested) {
    return (
      <SidebarMenuSubItem>
        {href ? (
          <SidebarMenuSubButton asChild isActive={active}>
            <Link href={href}>
              {Icon ? <Icon /> : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </Link>
          </SidebarMenuSubButton>
        ) : (
          <SidebarMenuSubButton asChild>
            <button type="button" disabled aria-disabled="true">
              {Icon ? <Icon /> : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          </SidebarMenuSubButton>
        )}
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuItem>
      {href ? (
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.label}
          className="h-9 before:absolute before:start-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brand before:opacity-0 before:transition-opacity data-active:before:opacity-100"
        >
          <Link href={href}>
            {Icon ? <Icon /> : null}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          disabled
          aria-disabled="true"
          tooltip={`${item.label}（待开放）`}
          className="h-9"
        >
          {Icon ? <Icon /> : null}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}

function NestedNavigationGroup({
  item,
  pathname,
}: {
  item: NavigationItem
  pathname: string
}) {
  const active = isActive(item, pathname)

  return (
    <SidebarMenuSubItem>
      <Collapsible defaultOpen={active} className="group/nested">
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton asChild isActive={active}>
            <button type="button">
              <span>{item.label}</span>
              <ChevronRightIcon className="ms-auto transition-transform group-data-[state=open]/nested:rotate-90" />
            </button>
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <NavigationLeaf
                key={child.id}
                item={child}
                pathname={pathname}
                nested
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  )
}

function NavigationGroup({
  item,
  pathname,
}: {
  item: NavigationItem
  pathname: string
}) {
  const Icon = item.icon
  const active = isActive(item, pathname)

  return (
    <Collapsible
      defaultOpen={active}
      className="group/collapsible"
      asChild
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={active}
            tooltip={item.label}
            className="h-9 before:absolute before:start-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brand before:opacity-0 before:transition-opacity data-active:before:opacity-100"
          >
            {Icon ? <Icon /> : null}
            <span>{item.label}</span>
            <ChevronRightIcon className="ms-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) =>
              child.children ? (
                <NestedNavigationGroup
                  key={child.id}
                  item={child}
                  pathname={pathname}
                />
              ) : (
                <NavigationLeaf
                  key={child.id}
                  item={child}
                  pathname={pathname}
                  nested
                />
              )
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" desktopBehavior="overlay">
      <SidebarHeader className="h-14 justify-center border-b bg-card px-3 py-0 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="DSP 管理系统"
              className="h-10 px-2"
            >
              <Link href="/">
                <span className="relative flex size-8 items-center justify-center rounded-full bg-foreground text-background">
                  <PackageCheckIcon />
                  <span
                    aria-hidden="true"
                    className="absolute end-0 bottom-0 size-2 rounded-full bg-brand ring-2 ring-sidebar"
                  />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">DSP 管理系统</span>
                  <span className="truncate text-xs text-muted-foreground">
                    配送服务运营中心
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="bg-card py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {primaryNavigation.map((sourceItem) => {
                const item = flattenSingleChild(sourceItem)

                return item.children ? (
                  <NavigationGroup
                    key={item.id}
                    item={item}
                    pathname={pathname}
                  />
                ) : (
                  <NavigationLeaf
                    key={item.id}
                    item={item}
                    pathname={pathname}
                  />
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
