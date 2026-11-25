import type { Metadata } from "next"
import { BillsPage } from "@/features/bills/components/bills-page"

export const metadata: Metadata = { title: "账单管理" }

export default function Page() { return <BillsPage /> }
