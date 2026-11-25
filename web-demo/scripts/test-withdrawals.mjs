import assert from "node:assert/strict"
import { test, after } from "node:test"
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { createRequire } from "node:module"
import ts from "typescript"
const directory = mkdtempSync(join(tmpdir(), "dsp-withdrawals-test-"))
const require = createRequire(import.meta.url)
const files = { fleet: "features/withdrawal-mode/model", driver: "features/driver-withdrawal-mode/model", model: "features/withdrawals/model", seed: "features/withdrawals/mock-data", "fleet-data": "features/withdrawal-mode/mock-data", "driver-data": "features/driver-withdrawal-mode/mock-data", session: "mocks/session" }
const aliases = { "../withdrawal-mode/model": "./fleet", "../driver-withdrawal-mode/model": "./driver", "../withdrawal-mode/mock-data": "./fleet-data", "../driver-withdrawal-mode/mock-data": "./driver-data", "@/mocks/session": "./session" }
for (const [name, path] of Object.entries(files)) {
  let source = readFileSync(resolve(`src/${path}.ts`), "utf8")
  for (const [alias, target] of Object.entries(aliases)) source = source.replaceAll(`"${alias}"`, `"${target}"`)
  writeFileSync(join(directory, `${name}.js`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)
}
after(() => rmSync(directory, { recursive: true, force: true }))
const { initialWithdrawalState } = require(join(directory, "seed.js"))
const { settleWithdrawals, applyFleetAction, applyDriverReview, activeDrivers } = require(join(directory, "model.js"))
const now = "2026-09-23T14:30:00Z"
const midnight = "2026-09-24T04:00:00.000Z"
const fresh = () => settleWithdrawals(structuredClone(initialWithdrawalState), now)
const approve = { result: "approve", planId: "plan1", reason: "" }
const reject = { result: "reject", planId: "", reason: "请先完成结算" }
const findDriver = (state, id) => state.drivers.find((row) => row.id === id)
const findFleet = (state) => state.applications.find((row) => row.organizationId === "org-1")
const close = (state) => applyFleetAction(state, { type: "close", id: findFleet(state).id, reason: "调整车队结算" }, now, "Tester")
const auditClose = (state) => applyFleetAction(state, { type: "audit", id: findFleet(state).id, stage: "business", result: "pass", reason: "" }, now, "Reviewer")

test("opening approval stays pending until New York midnight and settles only once", () => {
  const state = fresh()
  const approved = applyDriverReview(state, "DRV-009", approve, now, "Reviewer")
  assert.equal(findDriver(approved, "DRV-009").modeStatus, "opening_pending_effective")
  assert.equal(findDriver(approved, "DRV-009").openTime, midnight)
  assert.equal(activeDrivers(approved.drivers, "org-1").length, 4)
  assert.equal(settleWithdrawals(approved, "2026-09-24T03:59:59Z"), approved)
  const effective = settleWithdrawals(approved, midnight)
  assert.equal(findDriver(effective, "DRV-009").modeStatus, "opened")
  assert.equal(activeDrivers(effective.drivers, "org-1").length, 5)
  assert.equal(settleWithdrawals(effective, midnight), effective)
  assert.equal(findDriver(state, "DRV-009").auditStatus, "pending")
})
test("fleet close retains opening history, snapshots affected drivers and prevents duplicates", () => {
  const original = fresh()
  const pending = close(original)
  assert.equal(findFleet(pending).affectedDriverCount, 4)
  assert.equal(findFleet(pending).auditStatus, "pending_business")
  const history = pending.history.filter((row) => row.organizationId === "org-1")
  assert.equal(history.length, 2)
  assert.equal(history[0].applicationType, "close")
  assert.equal(history[1].applicationType, "open")
  assert.throws(() => close(pending), /不能申请关闭/)
  assert.throws(() => applyDriverReview(pending, "DRV-009", approve, now, "Reviewer"), /车队/)
})
test("fleet approval closes only its drivers at T+1 and cancels pending openings", () => {
  const initial = fresh()
  const next = auditClose(close(initial))
  assert.equal(findFleet(next).modeStatus, "closing_pending_effective")
  assert.equal(findFleet(next).expectedCloseTime, midnight)
  for (const id of ["DRV-001", "DRV-004", "DRV-006", "DRV-007"]) {
    assert.equal(findDriver(next, id).modeStatus, "closing_pending_effective")
    assert.equal(findDriver(next, id).closeTime, midnight)
  }
  assert.equal(findDriver(next, "DRV-009").auditStatus, "rejected")
  assert.deepEqual(next.drivers.filter((row) => row.organizationId === "org-3"), initial.drivers.filter((row) => row.organizationId === "org-3"))
  const final = settleWithdrawals(next, midnight)
  assert.equal(findFleet(final).modeStatus, "closed")
  assert.equal(activeDrivers(final.drivers, "org-1").length, 0)
  assert.equal(final.history.find((row) => row.requestId === findFleet(final).requestId).modeStatus, "closed")
})
test("rejecting fleet closure leaves driver status intact and permits a new request", () => {
  const pending = close(fresh())
  const rejected = applyFleetAction(pending, { type: "audit", id: findFleet(pending).id, stage: "business", result: "reject", reason: "需完成账单确认" }, now, "Reviewer")
  assert.equal(findFleet(rejected).modeStatus, "opened")
  assert.deepEqual(rejected.drivers, pending.drivers)
  const again = applyFleetAction(rejected, { type: "close", id: findFleet(rejected).id, reason: "已确认账单" }, "2026-09-23T15:00:00Z", "Tester")
  assert.equal(again.history.filter((row) => row.organizationId === "org-1").length, 3)
})
test("review validation, restricted access and double submission are enforced", () => {
  const state = fresh()
  assert.throws(() => applyDriverReview(state, "DRV-009", { ...approve, planId: "" }, now, "Reviewer"), /报价方案/)
  assert.throws(() => applyDriverReview(state, "DRV-009", { ...reject, reason: " " }, now, "Reviewer"), /原因/)
  assert.throws(() => applyDriverReview(state, "DRV-002", approve, now, "Reviewer"), /无法查看/)
  const next = applyDriverReview(state, "DRV-009", reject, now, "Reviewer")
  assert.equal(findDriver(next, "DRV-009").modeStatus, "unopened")
  assert.throws(() => applyDriverReview(next, "DRV-009", approve, now, "Reviewer"), /审核状态/)
})
test("fleet closure also cancels a scheduled opening before it can become active", () => {
  const opening = applyDriverReview(fresh(), "DRV-009", approve, now, "Reviewer")
  const final = settleWithdrawals(auditClose(close(opening)), midnight)
  assert.equal(findDriver(final, "DRV-009").modeStatus, "closed")
  assert.equal(activeDrivers(final.drivers, "org-1").length, 0)
})
test("new fleet opening shares its organization through business and financial approval", () => {
  const initial = fresh()
  const reference = findFleet(initial)
  const draft = { dspName: reference.dspName, fleetName: "JAM-SS", businessType: "LLC", birthday: "1985-03-15", position: "Owner", address: "1200 Example Road", attachments: reference.attachments, agreed: true }
  const opening = applyFleetAction(initial, { type: "open", id: "FLEET-org-2", draft }, now, "Tester", "org-2")
  const business = applyFleetAction(opening, { type: "audit", id: "FLEET-org-2", stage: "business", result: "pass", reason: "" }, now, "Business")
  assert.equal(business.applications.find((row) => row.organizationId === "org-2").auditStatus, "pending_financial")
  const approved = applyFleetAction(business, { type: "audit", id: "FLEET-org-2", stage: "financial", result: "pass", reason: "" }, now, "Finance")
  assert.equal(approved.applications.find((row) => row.organizationId === "org-2").modeStatus, "opened")
  assert.equal(approved.history.filter((row) => row.organizationId === "org-2").length, 1)
  assert.throws(() => applyFleetAction(approved, { type: "open", id: "duplicate", draft }, now, "Tester", "org-2"), /已有申请/)
})
test("a fleet with no active drivers closes immediately and retains the prior request", () => {
  const initial = fresh()
  initial.drivers = initial.drivers.filter((row) => row.organizationId !== "org-1")
  const closed = auditClose(close(initial))
  assert.equal(findFleet(closed).modeStatus, "closed")
  assert.equal(findFleet(closed).expectedCloseTime, now)
  assert.equal(closed.history.filter((row) => row.organizationId === "org-1").length, 2)
})
