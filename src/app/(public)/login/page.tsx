import Link from "next/link"
import { ArrowRightIcon, PackageCheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PackageCheckIcon />
          </span>
          <Badge variant="secondary">基础框架</Badge>
          <CardTitle>登录模块已预留</CardTitle>
          <CardDescription>
            手机号、密码、服务端验证码和安全会话将在下一阶段接入。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            当前可进入系统框架预览菜单结构与全局导航。
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/">
              进入框架预览
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
