import { UserRoundIcon } from "lucide-react"

import { FeaturePlaceholder } from "@/components/layout/feature-placeholder"

export default function ProfilePage() {
  return (
    <FeaturePlaceholder
      title="个人资料"
      description="查看和编辑个人基本信息，保存时进行手机验证码验证。"
      icon={UserRoundIcon}
    />
  )
}
