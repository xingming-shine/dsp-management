import { formatDate, formatDateRange, formatDateTime } from "@/lib/date-time"
import { adjustmentDetails, claimDetails, deliveryDetails } from "./mock-data"
import { BILL_LABELS, CYCLE_LABELS, gross, money, type Bill, type Invoice } from "./model"

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const link = document.createElement("a"); link.href = url; link.download = name; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function csvCell(value: unknown) {
  const raw = String(value ?? "")
  // Text originating from form inputs must never become an Excel formula.
  const safe = /^[=+@\t\r]/.test(raw) || (/^-/.test(raw) && !/^-\d[\d,.]*$/.test(raw)) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}
export function downloadCSV(name: string, headers: string[], rows: unknown[][]) {
  download(name, `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`, "text/csv;charset=utf-8")
}
export function downloadBill(bill: Bill, timezone: string) {
  const summary: unknown[][] = [["模拟账单", bill.id], ["供应商", bill.supplier], ["车队", bill.fleet], ["账期", formatDateRange(bill.start, bill.end)], ["周期", CYCLE_LABELS[bill.cycle]], ["状态", BILL_LABELS[bill.status]], ["币种", bill.currency], ["账单金额_未税", money(bill.netCents)], ["税额", money(bill.taxCents)], ["账单金额_含税", money(gross(bill))], ["账单票数", bill.count], []]
  const rows = bill.kind === "delivery" ? deliveryDetails(bill).map((row) => [row.id, row.city, row.state, row.zip, row.hub, row.fleet, row.route, row.signType, row.driver, row.driverId, formatDateTime(row.checkIn, { timeZone: timezone }), formatDateTime(row.outbound, { timeZone: timezone }), formatDateTime(row.signedAt, { timeZone: timezone }), row.samePoint, row.firstId, row.kg.toFixed(3), (row.kg * 2.20462262).toFixed(4), money(row.cents, 4)]) : claimDetails(bill).map((row) => [formatDate(row.date), row.id, row.driver, row.zip, row.type, "否", "0%", money(row.declaredCents), row.kg.toFixed(3), formatDate(row.confirmedDate), money(row.cents)])
  const headers = bill.kind === "delivery" ? ["运单号", "目的城市", "目的州", "收件邮编", "转运中心", "车队", "区域/路线", "签收类型", "快递员", "快递员ID", `车队签入时间(${timezone})`, "待出库时间", "签收时间", "同天同点数", "第一票单号", "结算重量(kg)", "结算重量(lb)", "费用合计_未税"] : ["日期", "运单号", "快递员", "邮编", "理赔类型", "含税", "税率", "申报货值(USD)", "重量(kg)", "确认日期", "费用合计_未税"]
  const claims = bill.kind === "delivery" ? [[], ["理赔明细"], ["日期", "运单号", "理赔类型", "费用合计_未税"], ...claimDetails(bill).map((row) => [formatDate(row.date), row.id, row.type, money(row.cents)])] : []
  const adjustments = [[], ["调总账明细"], ["日期", "费用类型", "调账金额_未税", "说明", "快递员", "快递员ID"], ...adjustmentDetails(bill).map((row) => [formatDate(row.date), row.type, money(row.cents), row.note, row.driver, row.driverId])]
  downloadCSV(`${bill.id}-模拟账单.csv`, ["账单信息", "内容"], [...summary, headers, ...rows, ...claims, ...adjustments])
}
/** A standalone, searchable PDF using the built-in Helvetica font. All labels in
 * this exported demo invoice are ASCII so no external font or service is needed. */
export function invoicePDF(invoice: Invoice) {
  const escape = (value: string) => value.replace(/[^\x20-\x7e]/g, " ").replace(/[\\()]/g, "\\$&")
  const lines = ["GOFO | DEMONSTRATION INVOICE", "SIMULATED DATA - NOT A TAX INVOICE", "", `Application: ${invoice.id}`, `Supplier invoice: ${invoice.number}`, `Invoice date: ${formatDate(invoice.date)}`, `Type: ${invoice.kind === "claim" ? "Claim" : "Delivery"}`, "", invoice.company.name, invoice.company.address, `Email: ${invoice.company.email}`, `Phone: ${invoice.phone}`, `Bank: ${invoice.bank.bank}`, `Account: ${invoice.bank.label}`, "", "BILL                         NET (USD)        TAX (USD)", ...invoice.lines.map((line) => `${line.billId.padEnd(28)} ${money(line.netCents).padStart(12)}   ${money(line.taxCents).padStart(10)}`), "", `Net: USD ${money(invoice.netCents)}`, `Tax: USD ${money(invoice.taxCents)}`, `Total: USD ${money(gross(invoice))}`, "", "Payment terms: Net 30", ...(invoice.note ? [`Note: ${invoice.note}`] : [])]
  const stream = `BT /F1 10 Tf 45 800 Td 16 TL ${lines.map((line, index) => `${index ? "T* " : ""}(${escape(line)}) Tj`).join("\n")} ET`
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]
  let document = "%PDF-1.4\n"
  const offsets = [0]
  objects.forEach((object, i) => { offsets.push(document.length); document += `${i + 1} 0 obj\n${object}\nendobj\n` })
  const xref = document.length
  document += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return document
}
export function downloadInvoice(invoice: Invoice) { download(`${invoice.id}-demo-invoice.pdf`, invoicePDF(invoice), "application/pdf") }
