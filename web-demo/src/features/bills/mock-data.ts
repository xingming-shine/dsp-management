import { BANKS, COMPANY, type AuditLog, type Bill, type BillsState, type Invoice, type InvoiceStatus } from "./model"

const deliverySeeds = [
  ["AP2608310698", 19240, 3370022, -26000, -15400], ["AP2608240599", 19873, 3362997, -43600, -23232],
  ["AP2608180054", 20305, 3717781, -24000, -21696], ["AP2608100610", 21453, 3968734, -20500, -21696],
  ["AP2608030339", 21299, 3935092, -52207, -31504], ["AP2607270306", 20338, 3755478, -40000, -19968],
  ["AP2607200415", 21049, 3878123, -62100, -5000], ["AP2607130394", 18791, 3473543, -48519, 0],
  ["AP2607060580", 19826, 3659317, -45898, 0], ["AP2606290110", 19809, 3671029, -33037, 0],
  ["AP2606220334", 20190, 3722015, -20000, 0],
] as const
const claimIds = ["LP2608310211", "LP2608240187", "LP2608170140", "LP2608100093", "LP2608030062", "LP2607270031", "LP2607200019", "LP2607130008", "LP2607060004", "LP2606290002"]
export const shiftDate = (day: string, amount: number) => new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86400000).toISOString().slice(0, 10)
function initialLogs(index: number, status: Bill["status"]): AuditLog[] {
  const day = shiftDate("2026-08-31", -index * 7)
  const logs: AuditLog[] = [
    { id: `${index}-finance`, time: `${day}T15:47:20Z`, operator: "李财务", action: "财务审核通过", note: "账单流转至待DSP确认。" },
    { id: `${index}-business`, time: `${day}T14:03:41Z`, operator: "董帅帅", action: "业务审核通过" },
    { id: `${index}-submit`, time: `${day}T13:12:10Z`, operator: "董帅帅", action: "提交账单" },
    { id: `${index}-create`, time: `${day}T13:12:04Z`, operator: "系统", action: "生成账单" },
  ]
  if (status !== "pending") logs.unshift({ id: `${index}-dsp`, time: `${day}T17:00:00Z`, operator: "John Smith", action: status === "confirmed" ? "DSP确认账单" : "DSP驳回账单", note: status === "rejected" ? "理赔金额与已提交的举证结果不一致，请财务复核。" : undefined })
  return logs
}
const deliveryBills: Bill[] = deliverySeeds.map(([id, count, deliveryCents, claimCents, adjustmentCents], index) => {
  const status = index < 2 ? "pending" : index === 2 ? "rejected" : "confirmed"
  return { id, kind: "delivery", supplier: COMPANY.name, fleet: "BNA-PNS", currency: "USD", cycle: "weekly", start: shiftDate("2026-08-24", -index * 7), end: shiftDate("2026-08-30", -index * 7), week: 35 - index, count, taxRate: 0, deliveryCents, claimCents, adjustmentCents, detailAdjustmentCents: 0, netCents: deliveryCents + claimCents + adjustmentCents, taxCents: 0, merged: true, status, historicalInvoicedCents: 0, logs: initialLogs(index, status) }
})
const claimAmounts = [-43600, -26000, -24000, -20500, -52207, -40000, -62100, -48519, -45898, -33037]
const claimBills: Bill[] = claimIds.map((id, index) => ({ ...deliveryBills[index], id, kind: "claim", count: [4, 2, 2, 1, 3, 2, 3, 3, 2, 2][index], deliveryCents: 0, claimCents: claimAmounts[index], adjustmentCents: 0, netCents: claimAmounts[index], merged: false, historicalInvoicedCents: index === 0 || index === 3 ? 0 : Math.abs(claimAmounts[index]), logs: initialLogs(index, deliveryBills[index].status) }))
function seedInvoice(bill: Bill, index: number, status: InvoiceStatus): Invoice {
  const day = shiftDate(bill.end, 2)
  const now = `${day}T18:40:00Z`
  return { id: `FA${day.replaceAll("-", "").slice(2)}${String(index + 1).padStart(4, "0")}`, number: `FCPNS2608${String(index + 1).padStart(4, "0")}`, date: day, kind: bill.kind, status, currency: "USD", taxRate: bill.taxRate, netCents: Math.abs(bill.netCents), taxCents: Math.abs(bill.taxCents), lines: [{ billId: bill.id, netCents: Math.abs(bill.netCents), taxCents: Math.abs(bill.taxCents) }], company: { ...COMPANY }, bank: { ...BANKS[0] }, phone: COMPANY.phone, note: "", createdAt: now, createdBy: "Ramon Dario", reason: status === "rejected" ? "供应商发票号与提交的发票信息不一致，请作废后重新申请。" : undefined, logs: [
    ...(status !== "draft" ? [{ id: `${index}-status`, time: `${day}T21:00:00Z`, operator: status === "pending" ? "Ramon Dario" : "李财务", action: status === "pending" ? "提交开票申请" : status === "rejected" ? "财务驳回申请" : status === "reversing" ? "财务发起冲销" : "财务审核通过" }] : []),
    { id: `${index}-created`, time: now, operator: "Ramon Dario", action: "生成开票申请单" },
  ] }
}
const invoices = deliveryBills.slice(1).map((bill, index) => seedInvoice(bill, index, index === 1 ? "rejected" : index === 2 ? "reversing" : "approved"))
const voidInvoice = { ...seedInvoice(deliveryBills[2], 11, "void"), id: "FA2608180472", number: "FCPNS26080003", logs: [{ id: "void-old", time: "2026-08-19T15:00:00Z", operator: "John Smith", action: "作废开票申请", note: "发票号填写错误，已释放开票金额。" }] }
const reversedInvoice = { ...seedInvoice(deliveryBills[3], 12, "reversed"), id: "FA2609100003", number: "FCPNS26090003", originalId: invoices[2].id, netCents: -deliveryBills[3].netCents, lines: [{ billId: deliveryBills[3].id, netCents: -deliveryBills[3].netCents, taxCents: 0 }], date: "2026-09-10", createdAt: "2026-09-10T20:08:22Z", createdBy: "李财务", logs: [{ id: "reversed", time: "2026-09-10T20:08:22Z", operator: "李财务", action: "生成负数冲销记录", note: "原申请单的冲销流程处理中，DSP只读跟踪。" }] }
invoices[2].reversalId = reversedInvoice.id
export const initialBillsState: BillsState = { bills: [...deliveryBills, ...claimBills], invoices: [reversedInvoice, seedInvoice(claimBills[0], 13, "pending"), ...invoices, voidInvoice].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }

export type DeliveryDetail = { id: string; city: string; state: string; zip: string; hub: string; fleet: string; route: string; signType: string; driver: string; driverId: string; checkIn: string; outbound: string; signedAt: string; samePoint: number; firstId: string; kg: number; cents: number }
export type ClaimDetail = { id: string; date: string; driver: string; zip: string; type: string; declaredCents: number; kg: number; confirmedDate: string; cents: number }
export type AdjustmentDetail = { id: string; date: string; type: string; cents: number; note: string; driver: string; driverId: string }
function distribute(total: number, count: number, index: number) {
  const absolute = Math.abs(total)
  return (Math.floor(absolute / count) + (index < absolute % count ? 1 : 0)) * Math.sign(total)
}
export function deliveryDetails(bill: Bill): DeliveryDetail[] {
  if (bill.kind !== "delivery") return []
  const prefix = `GFUS${bill.id.slice(2, 8)}`
  return Array.from({ length: bill.count }, (_, i) => {
    const id = `${prefix}${String(i + 1).padStart(7, "0")}`
    const day = shiftDate(bill.end, -(i % 7))
    return { id, city: "Nashville", state: "Tennessee", zip: i % 2 ? "37203" : "37205", hub: "BNA01", fleet: bill.fleet, route: i % 2 ? "BNA01-D2" : "BNA01-D4", signType: i % 2 ? "前台签收" : "门前/院内", driver: i % 2 ? "Karen Polito" : "Edgar Chiquito", driverId: i % 2 ? "254319" : "20406", checkIn: `${day}T12:00:00Z`, outbound: `${day}T13:20:00Z`, signedAt: `${day}T${String(14 + i % 8).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`, samePoint: i % 13 === 12 ? 2 : 1, firstId: i % 13 === 12 ? `${prefix}${String(i).padStart(7, "0")}` : id, kg: (100 + i % 2400) / 1000, cents: distribute(bill.deliveryCents, bill.count, i) }
  })
}
export function claimDetails(bill: Bill): ClaimDetail[] {
  const count = bill.kind === "claim" ? bill.count : Math.max(1, Math.ceil(Math.abs(bill.claimCents) / 15000))
  return Array.from({ length: bill.claimCents ? count : 0 }, (_, i) => ({ id: `GFUS${bill.id.slice(2, 8)}${String(i + 1).padStart(7, "0")}`, date: shiftDate(bill.end, -i - 2), driver: i % 2 ? "Karen Polito" : "Edgar Chiquito", zip: i % 2 ? "37203" : "37205", type: i % 2 ? "丢失" : "破损件", declaredCents: 18000 + i * 2500, kg: 0.86 + i * 0.2, confirmedDate: shiftDate(bill.end, -i), cents: distribute(bill.claimCents, count, i) }))
}
export function adjustmentDetails(bill: Bill): AdjustmentDetail[] {
  if (!bill.adjustmentCents) return []
  return [
    { id: "fuel", date: shiftDate(bill.start, 1), type: "燃油补贴", cents: 12000, note: "当期油价补差", driver: "Edgar Chiquito", driverId: "20406" },
    { id: "remote", date: shiftDate(bill.start, 2), type: "超区补贴", cents: 4800, note: "远郊派送补贴", driver: "Karen Polito", driverId: "254319" },
    { id: "penalty", date: shiftDate(bill.start, 3), type: "罚款", cents: bill.adjustmentCents - 16800, note: "POD不合规扣款", driver: "Edgar Chiquito", driverId: "20406" },
  ]
}
