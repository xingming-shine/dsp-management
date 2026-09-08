"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useState } from "react"
import {
  Building2Icon,
  ChevronDownIcon,
  Clock3Icon,
  DownloadIcon,
  ExternalLinkIcon,
  InfoIcon,
  LanguagesIcon,
  LogOutIcon,
  SettingsIcon,
  SmartphoneIcon,
  UserIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  useAppBreadcrumbItems,
  type AppBreadcrumbItem,
} from "@/components/layout/app-breadcrumb-context"
import { cn } from "@/lib/utils"
import { mockSession } from "@/mocks/session"
import {
  primaryNavigation,
  type NavigationItem,
  utilityRouteLabels,
} from "@/config/navigation"

const timezoneOptions = [
  { value: "America/New_York", label: "东部时间" },
  { value: "America/Chicago", label: "中部时间" },
  { value: "America/Denver", label: "山地时间" },
  { value: "America/Los_Angeles", label: "太平洋时间" },
  { value: "America/Phoenix", label: "凤凰城" },
  { value: "America/Puerto_Rico", label: "波多黎各" },
  { value: "Pacific/Honolulu", label: "夏威夷" },
  { value: "Asia/Shanghai", label: "北京时间" },
  { value: "Local", label: "本地时区" },
]

const localeOptions = [
  { value: "zh-CN", label: "中文" },
  { value: "en-US", label: "English" },
  { value: "es-ES", label: "Español" },
]

function findNavigationTrail(
  items: NavigationItem[],
  pathname: string,
  parents: NavigationItem[] = []
): NavigationItem[] | undefined {
  for (const item of items) {
    const trail = [...parents, item]

    if (item.href === pathname) {
      return trail
    }

    if (item.children) {
      const childTrail = findNavigationTrail(item.children, pathname, trail)
      if (childTrail) {
        return childTrail
      }
    }
  }
}

function getRouteBreadcrumbItems(pathname: string): AppBreadcrumbItem[] {
  const navigationTrail = findNavigationTrail(primaryNavigation, pathname)
  const routeItems = navigationTrail?.map((item) => ({
    label: item.label,
    href: item.href,
  })) ?? [{ label: utilityRouteLabels[pathname] }]

  return routeItems.filter(
    (item, index, items): item is AppBreadcrumbItem =>
      Boolean(item.label) && item.label !== items[index - 1]?.label
  )
}

export function AppHeader() {
  const pathname = usePathname()
  const [organizationId, setOrganizationId] = useState(
    mockSession.currentOrganizationId
  )
  const [timezone, setTimezone] = useState(mockSession.preferences.timezone)
  const [locale, setLocale] = useState(mockSession.preferences.locale)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pageBreadcrumbItems = useAppBreadcrumbItems()
  const breadcrumbItems =
    pageBreadcrumbItems.length > 0
      ? pageBreadcrumbItems
      : getRouteBreadcrumbItems(pathname)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  function handleOrganizationChange(value: string) {
    setOrganizationId(value)
    const organization = mockSession.organizations.find(
      (item) => item.id === value
    )
    toast.success(`已切换到：${organization?.name ?? value}`)
  }

  function handleLogout() {
    setLogoutOpen(false)
    toast.info("框架阶段暂未接入真实退出接口")
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 transition-[margin,box-shadow] duration-200 ease-linear md:ms-[var(--header-sidebar-offset)] sm:gap-4",
          scrolled && "border-b-transparent shadow-sm"
        )}
      >
        <SidebarTrigger className="md:hidden" />
        <Separator orientation="vertical" className="h-6 md:hidden" />

        <Breadcrumb className="me-auto min-w-0 overflow-hidden">
          <BreadcrumbList className="flex-nowrap">
            {breadcrumbItems.map((item, index) => {
              const isCurrentPage = index === breadcrumbItems.length - 1
              const isCollapsedOnMobile =
                breadcrumbItems.length > 2 && index > 0 && !isCurrentPage

              return (
                <Fragment key={`${item.label}-${index}`}>
                  {index === 1 && breadcrumbItems.length > 2 ? (
                    <>
                      <BreadcrumbSeparator className="sm:hidden" />
                      <BreadcrumbItem className="sm:hidden">
                        <BreadcrumbEllipsis />
                      </BreadcrumbItem>
                    </>
                  ) : null}
                  {index > 0 ? (
                    <BreadcrumbSeparator
                      className={cn(isCollapsedOnMobile && "hidden sm:list-item")}
                    />
                  ) : null}
                  <BreadcrumbItem
                    className={cn(
                      "min-w-0",
                      isCollapsedOnMobile && "hidden sm:inline-flex",
                      index === 0 && "shrink-0"
                    )}
                  >
                    {isCurrentPage ? (
                      <BreadcrumbPage className="truncate font-medium">
                        {item.label}
                      </BreadcrumbPage>
                    ) : item.onSelect ? (
                      <BreadcrumbLink asChild>
                        <button
                          type="button"
                          className="truncate outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          onClick={item.onSelect}
                        >
                          {item.label}
                        </button>
                      </BreadcrumbLink>
                    ) : item.href ? (
                      <BreadcrumbLink asChild>
                        <Link className="truncate" href={item.href}>
                          {item.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className="truncate">{item.label}</span>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="hidden items-center xl:flex">
          <Select
            value={organizationId}
            onValueChange={handleOrganizationChange}
          >
            <SelectTrigger size="sm" aria-label="切换组织" className="w-48">
              <Building2Icon />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {mockSession.organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="hidden h-6 xl:block" />

        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/basic/downloads">
            <DownloadIcon data-icon="inline-start" />
            <span className="sr-only">下载中心</span>
          </Link>
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <SmartphoneIcon data-icon="inline-start" />
              <span className="sr-only">关联系统</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="flex flex-col gap-4">
            <PopoverHeader>
              <PopoverTitle>关联系统</PopoverTitle>
              <PopoverDescription>
                App 下载资源将在后续阶段接入。
              </PopoverDescription>
            </PopoverHeader>
            <Alert>
              <InfoIcon />
              <AlertTitle>二维码资源待配置</AlertTitle>
              <AlertDescription>
                DSP App 与 Driver App 的下载二维码尚未提供。
              </AlertDescription>
            </Alert>
            <Button variant="outline" asChild>
              <a href="https://www.gofo.com" target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                GOFO 官网
              </a>
            </Button>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 gap-2 px-1.5"
            >
              <Avatar>
                <AvatarFallback>
                  {mockSession.user.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-24 truncate xl:inline">
                {mockSession.user.name}
              </span>
              <ChevronDownIcon data-icon="inline-end" />
              <span className="sr-only">打开用户菜单</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64">
            <DropdownMenuLabel className="flex items-center gap-3 p-3">
              <Avatar size="lg">
                <AvatarFallback>
                  {mockSession.user.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate">{mockSession.user.name}</span>
                <span className="truncate font-normal text-muted-foreground">
                  {mockSession.user.email}
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2.5 px-2.5">
                  <Building2Icon />
                  当前组织
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={organizationId}
                    onValueChange={handleOrganizationChange}
                  >
                    {mockSession.organizations.map((organization) => (
                      <DropdownMenuRadioItem
                        key={organization.id}
                        value={organization.id}
                      >
                        {organization.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2.5 px-2.5">
                  <Clock3Icon />
                  时区
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={timezone}
                    onValueChange={(value) => {
                      setTimezone(value)
                      toast.success("时区偏好已更新")
                    }}
                  >
                    {timezoneOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2.5 px-2.5">
                  <LanguagesIcon />
                  语言
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(value) => {
                      setLocale(value as typeof locale)
                      toast.success("语言偏好已更新")
                    }}
                  >
                    {localeOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2.5 px-2.5" asChild>
                <Link href="/my/profile">
                  <UserIcon />
                  个人资料
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 px-2.5" asChild>
                <Link href="/my/password">
                  <SettingsIcon />
                  密码修改
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-2.5 px-2.5"
                variant="destructive"
                onSelect={() => setLogoutOpen(true)}
              >
                <LogOutIcon />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认退出登录</DialogTitle>
            <DialogDescription>
              退出后需要重新输入账号密码才能登录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              确定退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
