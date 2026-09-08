import { KeyRoundIcon } from "lucide-react"

import { FeaturePlaceholder } from "@/components/layout/feature-placeholder"

export default function PasswordPage() {
  return (
    <FeaturePlaceholder
      title="密码修改"
      description="修改当前登录密码，并提供实时密码强度校验。"
      icon={KeyRoundIcon}
    />
  )
}
