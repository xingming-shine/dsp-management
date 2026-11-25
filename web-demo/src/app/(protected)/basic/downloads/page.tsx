import { DownloadIcon } from "lucide-react"

import { FeaturePlaceholder } from "@/components/layout/feature-placeholder"

export default function DownloadsPage() {
  return (
    <FeaturePlaceholder
      title="下载中心"
      description="查询并下载系统生成的文件，支持单个和批量下载。"
      icon={DownloadIcon}
    />
  )
}
