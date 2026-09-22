import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

// Run the actual pure TypeScript model without adding a test framework dependency.
const source = await readFile(new URL("../src/features/withdrawal-mode/model.ts", import.meta.url), "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { transition, emptyAttachments, rowActions, nextMidnight, birthdayToISO, validateOpening } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`)
const now = "2026-09-22T14:30:00.000Z"
const draft = {
  dspName: "Test DSP", fleetName: "Test Fleet", businessType: "LLC", birthday: "1985-03-15", position: "Owner", address: "Test Address", agreed: true,
  attachments: { ...emptyAttachments(), tax: [{ id: "tax", name: "tax.pdf" }], reg: [{ id: "reg", name: "reg.pdf" }], personal: [{ id: "id", name: "id.png" }] },
}
const apply = () => transition([], { type: "open", id: "test", draft }, now, "Tester")
const audit = (rows, stage, result = "pass", reason = "") => transition(rows, { type: "audit", id: "test", stage, result, reason }, now, "Reviewer")

test("opening requires business review before finance and logs every transition", () => {
  const rows = apply()
  assert.throws(() => audit(rows, "financial"), /审核状态/)
  const business = audit(rows, "business")
  assert.equal(business[0].auditStatus, "pending_financial")
  assert.equal(business[0].modeStatus, "unopened")
  const financial = audit(business, "financial")
  assert.equal(financial[0].modeStatus, "opened")
  assert.equal(financial[0].everOpened, true)
  assert.equal(financial[0].logs.length, 3)
  assert.equal(rows[0].auditStatus, "pending_business", "transitions must not mutate the old state")
})
test("both rejection stages require a reason and allow first-opening deletion", () => {
  for (const stage of ["business", "financial"]) {
    const rows = stage === "business" ? apply() : audit(apply(), "business")
    assert.throws(() => audit(rows, stage, "reject", "   "), /驳回原因/)
    const rejected = audit(rows, stage, "reject", "Document is unclear")
    assert.equal(rowActions(rejected[0]).remove, true)
    assert.equal(transition(rejected, { type: "delete", id: "test" }, now, "Tester").length, 0)
    const resubmitted = transition(rejected, { type: "open", id: "test", existingId: "test", draft }, now, "Tester")
    assert.equal(resubmitted[0].auditStatus, "pending_business")
    assert.equal(resubmitted[0].logs[1].reason, "Document is unclear")
    assert.equal(resubmitted[0].attachments.tax[0].name, "tax.pdf")
  }
})
test("close rejection keeps the mode open; a repeated close can pass without finance", () => {
  const opened = audit(audit(apply(), "business"), "financial")
  const closing = transition(opened, { type: "close", id: "test", reason: "Fleet adjustment" }, now, "Tester")
  assert.equal(rowActions(closing[0]).close, false)
  const rejected = audit(closing, "business", "reject", "Confirm operations first")
  assert.equal(rejected[0].modeStatus, "opened")
  assert.equal(rowActions(rejected[0]).close, true)
  assert.equal(rowActions(rejected[0]).remove, false)
  const repeated = transition(rejected, { type: "close", id: "test", reason: "Confirmed" }, now, "Tester")
  const closed = audit(repeated, "business")
  assert.equal(closed[0].modeStatus, "closed")
  assert.equal(closed[0].expectedCloseTime, now, "no drivers means immediate closure")
  assert.equal(rowActions(closed[0]).reopen, true)
  assert.throws(() => audit(closed, "financial"), /审核状态/)
})
test("closing with drivers records next midnight and reopening preserves history", () => {
  const opened = audit(audit(apply(), "business"), "financial")
  opened[0] = { ...opened[0], drivers: [{ id: "driver-1" }] }
  const closing = transition(opened, { type: "close", id: "test", reason: "" }, now, "Tester")
  const closed = audit(closing, "business")
  assert.equal(closed[0].expectedCloseTime, "2026-09-23T04:00:00.000Z")
  assert.equal(closed[0].affectedDriverCount, 1)
  const reopened = transition(closed, { type: "open", id: "test", existingId: "test", draft }, now, "Tester")
  assert.equal(reopened[0].modeStatus, "closed")
  assert.equal(reopened[0].expectedCloseTime, "")
  const rejected = audit(reopened, "business", "reject", "Need new documents")
  assert.equal(rowActions(rejected[0]).remove, false)
  assert.throws(() => transition(rejected, { type: "delete", id: "test" }, now, "Tester"), /从未开通/)
})
test("required documents, real birth dates, future dates and agreement are validated", () => {
  assert.deepEqual(validateOpening(draft, now), {})
  assert.ok(validateOpening({ ...draft, attachments: emptyAttachments(), agreed: false }, now).tax)
  assert.ok(validateOpening({ ...draft, attachments: emptyAttachments(), agreed: false }, now).agreed)
  assert.equal(birthdayToISO("02/29/2023"), "")
  assert.equal(birthdayToISO("02/29/2024"), "2024-02-29")
  assert.ok(validateOpening({ ...draft, birthday: "2100-01-01" }, now).birthday)
})
test("next-midnight scheduling handles New York DST and year rollover", () => {
  assert.equal(nextMidnight("2026-03-08T06:30:00Z"), "2026-03-09T04:00:00.000Z")
  assert.equal(nextMidnight("2026-11-01T05:30:00Z"), "2026-11-02T05:00:00.000Z")
  assert.equal(nextMidnight("2026-12-31T23:30:00Z"), "2027-01-01T05:00:00.000Z")
})
