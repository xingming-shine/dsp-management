import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

// Execute the actual model without introducing a test framework or duplicating workflow logic.
const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
const dates = moduleUrl(compile(await readFile(new URL("../src/features/withdrawal-mode/model.ts", import.meta.url), "utf8")))
const source = await readFile(new URL("../src/features/driver-withdrawal-mode/model.ts", import.meta.url), "utf8")
const { reviewDriver, validateReview, filterDrivers, EMPTY_FILTERS } = await import(moduleUrl(compile(source).replace('"../withdrawal-mode/model"', JSON.stringify(dates))))
const { initialDrivers } = await import(moduleUrl(compile(await readFile(new URL("../src/features/driver-withdrawal-mode/mock-data.ts", import.meta.url), "utf8"))))
const now = "2026-09-22T14:30:00.000Z"
const approve = { result: "approve", planId: "plan1", reason: "" }
const reject = { result: "reject", planId: "", reason: "请先完成结算" }
const find = (rows, id) => rows.find((row) => row.id === id)

test("opening requires a valid quotation and records next New York midnight", () => {
  const row = find(initialDrivers, "DRV-009")
  for (const planId of ["", "missing"]) assert.ok(validateReview(row, { ...approve, planId }).planId)
  const result = reviewDriver(initialDrivers, row.id, approve, now, "Reviewer")
  const updated = find(result, row.id)
  assert.equal(updated.auditStatus, "approved")
  assert.equal(updated.modeStatus, "opened")
  assert.equal(updated.openTime, "2026-09-23T04:00:00.000Z")
  assert.equal(updated.plan, "STD-LAX-001 洛杉矶标准报价")
  assert.equal(updated.latestOperationTime, now)
  assert.equal(updated.logs[0].action, "开通审核通过")
  assert.equal(updated.logs[0].operator, "Reviewer")
  assert.equal(updated.logs.length, row.logs.length + 1)
  assert.equal(row.auditStatus, "pending", "old state must not be mutated")
})
test("closing approval keeps the quotation and records pending effectiveness", () => {
  const row = find(initialDrivers, "DRV-001")
  const updated = find(reviewDriver(initialDrivers, row.id, { ...approve, planId: "" }, now, "Reviewer"), row.id)
  assert.equal(updated.auditStatus, "approved")
  assert.equal(updated.modeStatus, "closing_pending_effective")
  assert.equal(updated.closeTime, "2026-09-23T04:00:00.000Z")
  assert.equal(updated.plan, row.plan)
  assert.equal(updated.openTime, row.openTime)
  assert.equal(updated.logs[0].effectiveTime, updated.closeTime)
})
test("rejection requires a nonblank reason of at most 500 characters", () => {
  for (const id of ["DRV-001", "DRV-009"]) {
    for (const reason of ["   ", "x".repeat(501)]) {
      assert.throws(() => reviewDriver(initialDrivers, id, { ...reject, reason }, now, "Reviewer"), /原因/)
    }
    const updated = find(reviewDriver(initialDrivers, id, reject, now, "Reviewer"), id)
    assert.equal(updated.auditStatus, "rejected")
    assert.equal(updated.modeStatus, id === "DRV-001" ? "opened" : "unopened")
    assert.equal(updated.rejectReason, reject.reason)
    assert.equal(updated.logs[0].reason, reject.reason)
  }
})
test("rejecting a reopening preserves the previously closed mode and history", () => {
  const row = { ...find(initialDrivers, "DRV-008"), auditStatus: "pending" }
  const updated = reviewDriver([row], row.id, reject, now, "Reviewer")[0]
  assert.equal(updated.modeStatus, "closed")
  assert.equal(updated.closeTime, row.closeTime)
  assert.equal(updated.plan, row.plan)
  assert.equal(updated.logs.length, row.logs.length + 1)
})
test("restricted, completed, missing and duplicate reviews cannot change data", () => {
  assert.throws(() => reviewDriver(initialDrivers, "DRV-002", approve, now, "Reviewer"), /无法查看/)
  assert.throws(() => reviewDriver(initialDrivers, "DRV-003", approve, now, "Reviewer"), /审核状态/)
  assert.throws(() => reviewDriver(initialDrivers, "missing", approve, now, "Reviewer"), /申请不存在/)
  const reviewed = reviewDriver(initialDrivers, "DRV-009", approve, now, "Reviewer")
  assert.throws(() => reviewDriver(reviewed, "DRV-009", reject, now, "Reviewer"), /审核状态/)
})
test("filters compose and compare dates in the display timezone inclusively", () => {
  const filters = { ...EMPTY_FILTERS, auditStatus: "pending", type: "open", from: "2026-07-08", to: "2026-07-08" }
  assert.deepEqual(filterDrivers(initialDrivers, filters).map((row) => row.id), ["DRV-002", "DRV-009"])
  assert.equal(filterDrivers(initialDrivers, { ...filters, modeStatus: "closed" }).length, 0)
  assert.equal(filterDrivers(initialDrivers, { ...EMPTY_FILTERS, driver: "DRV-004" })[0].id, "DRV-004")
  const midnight = { ...initialDrivers[0], latestOperationTime: "2026-07-09T03:59:59Z" }
  assert.equal(filterDrivers([midnight], { ...EMPTY_FILTERS, to: "2026-07-08" }).length, 1)
  assert.equal(filterDrivers([midnight], { ...EMPTY_FILTERS, from: "2026-07-09" }).length, 0)
  const rows = filterDrivers(initialDrivers, EMPTY_FILTERS)
  assert.ok(rows.every((row, i) => !i || Date.parse(rows[i - 1].latestOperationTime) >= Date.parse(row.latestOperationTime)))
})
test("effective midnight handles daylight saving time and year boundaries", () => {
  for (const [at, expected] of [["2026-03-08T06:30:00Z", "2026-03-09T04:00:00.000Z"], ["2026-11-01T05:30:00Z", "2026-11-02T05:00:00.000Z"], ["2026-12-31T23:30:00Z", "2027-01-01T05:00:00.000Z"]]) {
    assert.equal(find(reviewDriver(initialDrivers, "DRV-001", approve, at, "Reviewer"), "DRV-001").closeTime, expected)
  }
})
