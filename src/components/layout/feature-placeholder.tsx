import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function FeaturePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">功能筹备中</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>页面框架已预留</CardTitle>
            <CardDescription>
              当前已完成路由、导航与权限边界，业务字段和交互将按 PRD 分阶段接入。
            </CardDescription>
            <CardAction>
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon />
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Separator />
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusItem label="路由与导航" status="已完成" />
              <StatusItem label="页面规范" status="已对齐" />
              <StatusItem label="业务接口" status="待接入" />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>交付标准</CardTitle>
            <CardDescription>后续功能将遵循统一的系统状态模型。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>· 加载态与骨架屏</p>
            <p>· 空数据与操作引导</p>
            <p>· 错误提示与重试机制</p>
            <p>· 权限与数据范围控制</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function StatusItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{status}</span>
    </div>
  )
}
