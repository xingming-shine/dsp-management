import type { Metadata } from "next"

import { LoginDemo } from "@/features/login/components/login-demo"

export const metadata: Metadata = {
  title: "登录",
  description: "GOFO DSP 管理系统登录页",
}

export default function LoginPage() {
  return <LoginDemo />
}
