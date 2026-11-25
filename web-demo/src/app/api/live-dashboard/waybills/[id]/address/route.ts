import { resolveDemoMonitorAddress } from "@/features/live-dashboard/monitor-address-server"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const address = resolveDemoMonitorAddress(id)
  return Response.json(address ? { address } : { error: "运单不存在" }, { status: address ? 200 : 404, headers: { "Cache-Control": "no-store" } })
}
