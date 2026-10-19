import type { Metadata } from "next"

import { RecordsPage, type RecordsTab } from "@/features/learning/components/records-page"

export const metadata: Metadata = { title: "学习记录" }

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; item?: string; record?: string }> }) {
  const { tab, item, record } = await searchParams
  const initialTab: RecordsTab = tab === "downloads" ? "downloads" : "progress"
  return <RecordsPage initialTab={initialTab} initialSelection={initialTab === "downloads" ? record : item} />
}
