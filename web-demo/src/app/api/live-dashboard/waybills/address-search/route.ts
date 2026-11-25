import { searchDemoMonitorAddresses } from "@/features/live-dashboard/monitor-address-server"

export async function GET(request: Request) {
  const keyword = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (!keyword || keyword.length > 200) return Response.json({ error: "请输入 1–200 个字符" }, { status: 400 })
  return Response.json({ ids: searchDemoMonitorAddresses(keyword) }, { headers: { "Cache-Control": "no-store" } })
}
