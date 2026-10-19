import type { Metadata } from "next"

import { KnowledgePage } from "@/features/learning/components/knowledge-page"

export const metadata: Metadata = { title: "知识库" }

export default async function Page({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams
  return <KnowledgePage key={item ?? "all"} initialItem={item} />
}
