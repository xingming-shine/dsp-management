import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  Building2Icon,
  DownloadIcon,
  InfoIcon,
  Layers3Icon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  primaryNavigation,
  type NavigationItem,
} from "@/config/navigation"
import { mockSession } from "@/mocks/session"

function countItemsByStatus(
  items: NavigationItem[],
  status: NavigationItem["status"]
): number {
  return items.reduce((total, item) => {
    const current = item.status === status ? 1 : 0
    const children = item.children
      ? countItemsByStatus(item.children, status)
      : 0
    return total + current + children
  }, 0)
}

const currentOrganization = mockSession.organizations.find(
  (organization) => organization.id === mockSession.currentOrganizationId
)

export default function HomePage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Badge variant="secondary">运营控制台</Badge>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              欢迎回来，{mockSession.user.name}
            </h1>
            <p className="text-muted-foreground">
              集中查看 DSP 系统迁移进度、组织上下文和核心业务入口。
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/data-cockpit">
            <LayoutDashboardIcon data-icon="inline-start" />
            进入数据驾舱
          </Link>
        </Button>
      </section>

      <Alert>
        <InfoIcon />
        <AlertTitle>当前建设阶段</AlertTitle>
        <AlertDescription>
          旧系统菜单名称与层级已迁移，数据驾舱已开放，其他业务模块将按 PRD 逐步接入。
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="当前组织"
          value={currentOrganization?.name ?? "未选择"}
          description={currentOrganization?.code ?? "请切换组织"}
          icon={Building2Icon}
        />
        <KpiCard
          title="待建设节点"
          value={String(countItemsByStatus(primaryNavigation, "planned"))}
          description="已完成菜单层级迁移"
          icon={Layers3Icon}
        />
        <KpiCard
          title="已开放节点"
          value={String(countItemsByStatus(primaryNavigation, "available"))}
          description="可进入的基础功能与数据页"
          icon={LayoutDashboardIcon}
        />
        <KpiCard
          title="基础权限"
          value={String(mockSession.permissions.length)}
          description="当前角色：DSP Owner"
          icon={ShieldCheckIcon}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>系统就绪情况</CardTitle>
            <CardDescription>
              基础框架、全局配置和领域边界已经建立。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ReadinessRow label="菜单与路由" detail="旧系统层级已配置化" />
            <Separator />
            <ReadinessRow label="数据分析" detail="数据驾舱样例数据已就绪" />
            <Separator />
            <ReadinessRow label="会话与权限" detail="等待 DMS 与网关接口接入" pending />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
            <CardDescription>访问已开放的基础能力。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/my/profile">
                <UserIcon data-icon="inline-start" />
                个人资料
                <ArrowRightIcon data-icon="inline-end" className="ms-auto" />
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/basic/downloads">
                <DownloadIcon data-icon="inline-start" />
                下载中心
                <ArrowRightIcon data-icon="inline-end" className="ms-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: LucideIcon
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardAction>
          <Icon className="text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function ReadinessRow({
  label,
  detail,
  pending = false,
}: {
  label: string
  detail: string
  pending?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-medium">{label}</span>
        <span className="truncate text-xs text-muted-foreground">{detail}</span>
      </div>
      <Badge variant="outline">{pending ? "待接入" : "已就绪"}</Badge>
    </div>
  )
}
