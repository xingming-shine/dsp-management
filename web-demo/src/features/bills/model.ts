export type BillKind = "delivery" | "claim"
export type BillStatus = "pending" | "confirmed" | "rejected"
export type BillingStatus = "unbilled" | "processing" | "billed"
export type InvoiceStatus = "draft" | "pending" | "approved" | "rejected" | "void" | "reversing" | "reversed"
export const BILL_LABELS: Record<BillStatus, string> = { pending: "待DSP确认", confirmed: "DSP已确认", rejected: "DSP驳回" }
export const BILLING_LABELS: Record<BillingStatus, string> = { unbilled: "未开票", processing: "开票中", billed: "已开票" }
export const INVOICE_LABELS: Record<InvoiceStatus, string> = { draft: "待提交", pending: "待审核", approved: "审核通过", rejected: "驳回", void: "作废", reversing: "冲销中", reversed: "已冲销" }
export const KIND_LABELS: Record<BillKind, string> = { delivery: "派费账单", claim: "理赔账单" }
export const CYCLE_LABELS = { weekly: "周结", fortnightly: "半月结", monthly: "月结" }
export type Attachment = { id: string; name: string; size: number; file: File }
export type AuditLog = { id: string; time: string; operator: string; action: string; note?: string; attachments?: Attachment[] }
// Monetary values are integer cents. No floating-point accumulation in transitions.
export type Bill = {
  id: string; kind: BillKind; supplier: string; fleet: string; currency: "USD"; cycle: keyof typeof CYCLE_LABELS
  start: string; end: string; week: number; count: number; taxRate: number; deliveryCents: number
  claimCents: number; adjustmentCents: number; detailAdjustmentCents: number; netCents: number; taxCents: number
  merged: boolean; status: BillStatus; historicalInvoicedCents: number; logs: AuditLog[]
}
export type Company = { name: string; address: string; ein: string; registration: string; email: string; phone: string; terms: string }
export type Bank = { id: string; label: string; accountName: string; bank: string; swift: string; ach: string; wire: string }
export type Invoice = {
  id: string; number: string; date: string; kind: BillKind; status: InvoiceStatus; currency: "USD"; taxRate: number
  netCents: number; taxCents: number; lines: { billId: string; netCents: number; taxCents: number }[]
  company: Company; bank: Bank; phone: string; note: string; createdAt: string; createdBy: string
  reason?: string; originalId?: string; reversalId?: string; logs: AuditLog[]
}
export type BillsState = { bills: Bill[]; invoices: Invoice[] }
export type InvoiceDraft = { number: string; date: string; phone: string; note: string; bankId: string; billIds: string[] }
export const COMPANY: Company = {
  name: "PNS CARGO LLC", address: "1200 Rosa L Parks Blvd, Nashville, TN 37208", ein: "83-0004102", registration: "TN-LLC-000841257",
  email: "finance@example.com", phone: "+1 (615) 555-0136", terms: "30 天内付款",
}
export const BANKS: Bank[] = [
  { id: "chase", label: "Chase ····6011", accountName: COMPANY.name, bank: "Chase", swift: "CHASUS33", ach: "0640····21", wire: "0210····33" },
  { id: "boa", label: "Bank of America ····3308", accountName: COMPANY.name, bank: "Bank of America", swift: "BOFAUS3N", ach: "0610····52", wire: "0260····93" },
]
export const gross = (row: { netCents: number; taxCents: number }) => row.netCents + row.taxCents
export const money = (cents: number, decimals = 2) => new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(cents / 100)
export const integer = (value: number) => new Intl.NumberFormat("en-US").format(value)
export function todayISO(timeZone = "America/New_York", now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
export function invoiceBalance(bill: Bill, invoices: Invoice[]) {
  let paid = bill.historicalInvoicedCents
  let reserved = 0
  for (const invoice of invoices) {
    if (invoice.originalId || invoice.status === "void" || invoice.status === "reversed") continue
    const amount = invoice.lines.filter((line) => line.billId === bill.id).reduce((sum, line) => sum + Math.abs(gross(line)), 0)
    if (invoice.status === "approved" || invoice.status === "reversing") paid += amount
    else reserved += amount
  }
  const remaining = Math.max(0, Math.abs(gross(bill)) - paid - reserved)
  const status: BillingStatus = reserved > 0 ? "processing" : remaining > 0 ? "unbilled" : "billed"
  return { remaining, reserved, paid, status }
}
export function parseBillNumbers(input: string) {
  const numbers = Array.from(new Set(input.trim().split(/[\s,，;；]+/).filter(Boolean).map((n) => n.toUpperCase())))
  if (numbers.length > 1000) throw new Error("一次最多查询 1000 个账单编号")
  return numbers
}
export function validateAttachments(files: { size: number; name: string }[]) {
  if (files.length > 3) throw new Error("最多上传 3 个附件")
  for (const file of files) {
    if (!/\.(pdf|png|jpe?g|xlsx?|csv)$/i.test(file.name)) throw new Error("附件仅支持 PDF、PNG、JPG、Excel 或 CSV")
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("附件不能为空，且单个文件不能超过 10 MB")
  }
}
function selectedBills(state: BillsState, ids: string[]) {
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error("请先选择账单，且不能重复选择")
  const rows = ids.map((id) => state.bills.find((bill) => bill.id === id))
  if (rows.some((row) => !row)) throw new Error("部分账单已不存在，请重新查询")
  const bills = rows as Bill[]
  if (bills.some((row) => row.supplier !== COMPANY.name || row.fleet !== "BNA-PNS")) throw new Error("只能操作当前所属车队的账单")
  return bills
}
export function reviewBills(state: BillsState, ids: string[], result: "confirmed" | "rejected", note: string, attachments: Attachment[], operator: string, now: string): BillsState {
  const bills = selectedBills(state, ids)
  if (bills.some((bill) => bill.status !== "pending")) throw new Error("只有待DSP确认的账单可以确认或驳回")
  if (note.trim().length > 500) throw new Error("备注最多 500 字")
  if (result === "rejected" && note.trim().length < 10) throw new Error("驳回原因至少填写 10 字")
  validateAttachments(attachments)
  return { ...state, bills: state.bills.map((bill) => ids.includes(bill.id) ? { ...bill, status: result, logs: [{ id: `${now}-${bill.id}`, time: now, operator, action: result === "confirmed" ? "DSP确认账单" : "DSP驳回账单", note: note.trim(), attachments }, ...bill.logs] } : bill) }
}
export function createInvoice(state: BillsState, draft: InvoiceDraft, operator: string, now: string, today: string): { state: BillsState; id: string } {
  const bills = selectedBills(state, draft.billIds)
  if (bills.some((bill) => bill.kind !== bills[0].kind || bill.currency !== bills[0].currency || bill.taxRate !== bills[0].taxRate)) throw new Error("仅支持相同类型、币种及税率的账单合并开票")
  if (!draft.number.trim() || draft.number.trim().length > 20) throw new Error("供应商发票号必填，且最多 20 个字符")
  if (state.invoices.some((invoice) => invoice.number.toLowerCase() === draft.number.trim().toLowerCase() && invoice.status !== "void")) throw new Error("供应商发票号已存在，请使用新的发票号")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(Date.parse(draft.date)) || new Date(draft.date).toISOString().slice(0, 10) !== draft.date || draft.date > today) throw new Error("请选择有效且不晚于今天的开票日期")
  if (!/^[+\d\s()\-]{7,30}$/.test(draft.phone.trim())) throw new Error("请填写有效的联系电话")
  if (draft.note.length > 100) throw new Error("备注最多 100 字")
  const bank = BANKS.find((item) => item.id === draft.bankId)
  if (!bank) throw new Error("请选择银行账号")
  const lines = bills.map((bill) => {
    const balance = invoiceBalance(bill, state.invoices)
    if (balance.status !== "unbilled" || balance.remaining !== Math.abs(gross(bill))) throw new Error(`${bill.id} 当前不可开票，请刷新账单状态`)
    return { billId: bill.id, netCents: Math.abs(bill.netCents), taxCents: Math.abs(bill.taxCents) }
  })
  let serial = state.invoices.length + 1
  const prefix = `FA${today.replaceAll("-", "").slice(2)}`
  while (state.invoices.some((invoice) => invoice.id === `${prefix}${String(serial).padStart(4, "0")}`)) serial++
  const id = `${prefix}${String(serial).padStart(4, "0")}`
  const invoice: Invoice = {
    id, number: draft.number.trim(), date: draft.date, kind: bills[0].kind, status: "draft", currency: bills[0].currency, taxRate: bills[0].taxRate,
    netCents: lines.reduce((sum, line) => sum + line.netCents, 0), taxCents: lines.reduce((sum, line) => sum + line.taxCents, 0), lines,
    company: { ...COMPANY }, bank: { ...bank }, phone: draft.phone.trim(), note: draft.note.trim(), createdAt: now, createdBy: operator,
    logs: [{ id: `${now}-create`, time: now, operator, action: "生成开票申请单", note: "待提交，已预留关联账单的开票金额。" }],
  }
  return { id, state: { ...state, invoices: [invoice, ...state.invoices] } }
}
export function changeInvoice(state: BillsState, id: string, action: "submit" | "delete" | "void", operator: string, now: string): BillsState {
  const invoice = state.invoices.find((row) => row.id === id)
  if (!invoice) throw new Error("申请单已不存在")
  if (invoice.originalId || (action === "void" ? invoice.status !== "rejected" : invoice.status !== "draft")) throw new Error("当前状态不支持此操作")
  if (action === "delete") return { ...state, invoices: state.invoices.filter((row) => row.id !== id) }
  return { ...state, invoices: state.invoices.map((row) => row.id === id ? { ...row, status: action === "submit" ? "pending" : "void", logs: [{ id: `${now}-${action}`, time: now, operator, action: action === "submit" ? "提交开票申请" : "作废开票申请", note: action === "submit" ? "已流转至财务审核，DSP端可查看处理状态。" : "关联账单的开票金额已释放，可重新申请。" }, ...row.logs] } : row) }
}
