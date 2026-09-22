import assert from "node:assert/strict"
import { test, after } from "node:test"
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { createRequire } from "node:module"
import ts from "typescript"

// Compile only the pure business modules into an isolated directory. This keeps
// the checks runnable with the project's existing Node + TypeScript toolchain.
const directory = mkdtempSync(join(tmpdir(), "dsp-bills-test-"))
const require = createRequire(import.meta.url)
for (const [name, path] of Object.entries({ model: "src/features/bills/model.ts", "mock-data": "src/features/bills/mock-data.ts", "date-time": "src/lib/date-time.ts", export: "src/features/bills/export.ts" })) {
  const source = readFileSync(resolve(path), "utf8").replace('"@/lib/date-time"', '"./date-time"')
  writeFileSync(join(directory, `${name}.js`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)
}
after(() => rmSync(directory, { recursive: true, force: true }))
const { initialBillsState, deliveryDetails, claimDetails, adjustmentDetails } = require(join(directory, "mock-data.js"))
const { createInvoice, changeInvoice, invoiceBalance, reviewBills, parseBillNumbers, validateAttachments, gross } = require(join(directory, "model.js"))
const { invoicePDF, csvCell } = require(join(directory, "export.js"))
const original = () => structuredClone(initialBillsState)
const now = "2026-09-22T12:00:00Z"
const draft = (ids = ["AP2608310698"]) => ({ number: "TEST-0922", date: "2026-09-22", phone: "+1 (615) 555-0100", note: "test", bankId: "chase", billIds: ids })

test("all fixture detail counts and amounts reconcile exactly, including 220k delivery rows", () => {
  for (const bill of initialBillsState.bills) {
    const rows = deliveryDetails(bill)
    assert.equal(rows.length, bill.kind === "delivery" ? bill.count : 0)
    assert.equal(rows.reduce((sum, row) => sum + row.cents, 0), bill.deliveryCents)
    assert.equal(claimDetails(bill).reduce((sum, row) => sum + row.cents, 0), bill.claimCents)
    assert.equal(adjustmentDetails(bill).reduce((sum, row) => sum + row.cents, 0), bill.adjustmentCents)
    assert.equal(bill.netCents, bill.deliveryCents + bill.claimCents + bill.adjustmentCents + bill.detailAdjustmentCents)
  }
})
test("batch confirmation changes only selected pending bills and records operator and note", () => {
  const initial = original()
  const next = reviewBills(initial, [initial.bills[0].id], "confirmed", "核对完成", [], "Tester", now)
  assert.equal(next.bills[0].status, "confirmed")
  assert.equal(initial.bills[0].status, "pending")
  assert.equal(next.bills[1].status, "pending")
  assert.equal(next.bills[0].logs[0].operator, "Tester")
  assert.equal(next.bills[0].logs[0].note, "核对完成")
})
test("batch review is atomic when any selected row is ineligible", () => {
  const state = original()
  assert.throws(() => reviewBills(state, [state.bills[0].id, state.bills[3].id], "confirmed", "", [], "Tester", now), /只有待DSP确认/)
  assert.equal(state.bills[0].status, "pending")
  assert.throws(() => reviewBills(state, [state.bills[0].id], "rejected", "太短", [], "Tester", now), /至少填写 10/)
  assert.throws(() => reviewBills(state, [state.bills[0].id], "confirmed", "x".repeat(501), [], "Tester", now), /最多 500/)
})
test("a draft reserves the full amount; submission keeps it reserved; duplicate creation is rejected", () => {
  const state = original()
  const { state: created, id } = createInvoice(state, draft(), "Tester", now, "2026-09-22")
  assert.equal(created.invoices[0].status, "draft")
  assert.equal(gross(created.invoices[0]), gross(state.bills[0]))
  assert.deepEqual(invoiceBalance(state.bills[0], created.invoices), { remaining: 0, reserved: gross(state.bills[0]), paid: 0, status: "processing" })
  const submitted = changeInvoice(created, id, "submit", "Tester", now)
  assert.equal(submitted.invoices[0].status, "pending")
  assert.equal(invoiceBalance(state.bills[0], submitted.invoices).remaining, 0)
  assert.throws(() => createInvoice(created, { ...draft(), number: "DIFFERENT" }, "Tester", now, "2026-09-22"), /不可开票/)
  assert.throws(() => changeInvoice(submitted, id, "submit", "Tester", now), /当前状态/)
  assert.throws(() => changeInvoice(submitted, id, "delete", "Tester", now), /当前状态/)
})
test("deleting drafts and voiding rejections release the exact reserved amount", () => {
  const { state, id } = createInvoice(original(), draft(), "Tester", now, "2026-09-22")
  const deleted = changeInvoice(state, id, "delete", "Tester", now)
  assert.equal(invoiceBalance(deleted.bills[0], deleted.invoices).remaining, gross(deleted.bills[0]))
  const rejected = original()
  const invoice = rejected.invoices.find((row) => row.status === "rejected")
  const bill = rejected.bills.find((row) => row.id === invoice.lines[0].billId)
  assert.equal(invoiceBalance(bill, rejected.invoices).remaining, 0)
  const voided = changeInvoice(rejected, invoice.id, "void", "Tester", now)
  assert.equal(invoiceBalance(bill, voided.invoices).remaining, Math.abs(gross(bill)))
  assert.throws(() => changeInvoice(voided, invoice.id, "void", "Tester", now), /当前状态/)
})
test("claim invoices have positive amounts while source claims stay negative", () => {
  const state = original()
  const id = "LP2608100093"
  const created = createInvoice(state, draft([id]), "Tester", now, "2026-09-22").state
  assert.equal(created.invoices[0].netCents, 20500)
  assert.equal(state.bills.find((row) => row.id === id).netCents, -20500)
})
test("eligibility rejects missing, duplicate, mixed-type and already-paid selections", () => {
  for (const ids of [[], ["missing"], ["AP2608310698", "AP2608310698"], ["AP2608310698", "LP2608100093"], ["AP2608240599"]]) {
    assert.throws(() => createInvoice(original(), draft(ids), "Tester", now, "2026-09-22"))
  }
  const state = original(); state.bills[0].fleet = "OTHER"
  assert.throws(() => createInvoice(state, draft(), "Tester", now, "2026-09-22"), /当前所属车队/)
})
test("invoice form checks impossible dates, future dates, phone, number and bank", () => {
  for (const invalid of [{ date: "2026-02-30" }, { date: "2026-09-23" }, { number: "" }, { number: "x".repeat(21) }, { phone: "abc" }, { bankId: "unknown" }, { note: "x".repeat(101) }]) {
    assert.throws(() => createInvoice(original(), { ...draft(), ...invalid }, "Tester", now, "2026-09-22"))
  }
})
test("attachment limits reject a fourth file, empty files, unsupported types and oversize files", () => {
  assert.doesNotThrow(() => validateAttachments([{ name: "proof.pdf", size: 100 }]))
  for (const files of [Array.from({ length: 4 }, () => ({ name: "a.pdf", size: 1 })), [{ name: "a.pdf", size: 0 }], [{ name: "a.exe", size: 100 }], [{ name: "a.pdf", size: 11 * 1024 * 1024 }]]) assert.throws(() => validateAttachments(files))
})
test("batch query supports separators, deduplication and the 1000-number boundary", () => {
  assert.deepEqual(parseBillNumbers(" ap1,AP2\nap1；AP3，AP4 "), ["AP1", "AP2", "AP3", "AP4"])
  assert.equal(parseBillNumbers(Array.from({ length: 1000 }, (_, i) => `AP${i}`).join("\n")).length, 1000)
  assert.throws(() => parseBillNumbers(Array.from({ length: 1001 }, (_, i) => `AP${i}`).join(",")), /1000/)
})
test("CSV escapes input formulas but preserves real negative numeric amounts", () => {
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"')
  assert.equal(csvCell("-123.45"), '"-123.45"')
  assert.equal(csvCell('a"b'), '"a""b"')
})
test("PDF has valid object offsets, demo marking, amounts and matching stream length", () => {
  const invoice = initialBillsState.invoices.find((row) => row.status === "approved")
  const pdf = invoicePDF(invoice)
  assert.match(pdf, /^%PDF-1\.4/)
  assert.ok(pdf.includes("NOT A TAX INVOICE"))
  const start = Number(pdf.match(/startxref\n(\d+)/)[1])
  assert.equal(pdf.slice(start, start + 4), "xref")
  const offsets = [...pdf.matchAll(/(\d{10}) 00000 n/g)].map((match) => Number(match[1]))
  offsets.forEach((offset, index) => assert.equal(pdf.slice(offset, offset + 7), `${index + 1} 0 obj`))
  const content = pdf.match(/\/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/)
  assert.equal(Number(content[1]), content[2].length)
})
