import { LiveDashboard } from "@/features/live-dashboard/components/live-dashboard"
import type { WorkMode } from "@/features/live-dashboard/mock-data"

export default async function LiveDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workMode?: string }>
}) {
  const { workMode } = await searchParams
  const initialWorkMode: WorkMode = workMode === "next-day" ? "next-day" : "same-day"
  return <LiveDashboard initialWorkMode={initialWorkMode} />
}
