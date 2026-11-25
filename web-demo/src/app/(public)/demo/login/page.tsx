import type { Metadata } from "next"

import { LoginDemo } from "@/features/login/components/login-demo"

export const metadata: Metadata = {
  title: "GOFO 登录设计演示",
  description: "GOFO 配送管理系统登录页设计演示",
}

export default function LoginDemoPage() {
  return <LoginDemo />
}
