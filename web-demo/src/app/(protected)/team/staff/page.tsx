import { OtherStaffPage } from "@/features/team/staff/components/other-staff-page"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const demoScope = view === "dsp" ? "dsp" : view === "denied" ? "denied" : "headquarters"
  return <OtherStaffPage key={demoScope} demoScope={demoScope} />
}
