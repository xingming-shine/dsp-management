import type { Metadata } from "next"

import { FinanceToolkitPage } from "@/features/finance-toolkit/components/finance-toolkit-page"

export const metadata: Metadata = { title: "财务结算小工具" }

export default function Page() {
  return <FinanceToolkitPage />
}
