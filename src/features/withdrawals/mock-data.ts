import { mockSession } from "@/mocks/session"
import { initialDrivers } from "../driver-withdrawal-mode/mock-data"
import { initialApplications } from "../withdrawal-mode/mock-data"
import { emptyAttachments, type Application } from "../withdrawal-mode/model"
import { withAffectedDrivers, type WithdrawalState } from "./model"

export const DSP_NAME = "PNS CARGO LLC"
export function emptyFleet(organizationId: string, name: string): Application {
  return { id: `FLEET-${organizationId}`, organizationId, dspName: DSP_NAME, fleetName: name, businessType: "LLC", applicationType: "open", latestOperationDate: "", firstOpenApplyDate: "", auditStatus: "pass", modeStatus: "unopened", position: "", address: "", birthday: "", closeReason: "", expectedCloseTime: "", affectedDriverCount: 0, everOpened: false, firstOpenRejected: false, attachments: emptyAttachments(), logs: [], drivers: [] }
}
const drivers = [0, 2].flatMap((index) => initialDrivers.map((row) => ({ ...row,
  id: index === 0 ? row.id : `DRV-${Number(row.id.slice(4)) + 100}`, organizationId: mockSession.organizations[index].id,
  fleet: mockSession.organizations[index].name,
})))
const fleets = [0, 2, 3].map((index): Application => {
  const org = mockSession.organizations[index]
  const closed = index === 3
  return withAffectedDrivers({ ...initialApplications[0], ...emptyFleet(org.id, org.name),
    requestId: `FLT-${org.id}-001`, birthday: "1985-03-15", position: "Owner", address: "1200 Rosa L Parks Blvd, Nashville, TN 37208",
    latestOperationDate: closed ? "2026-08-31" : "2026-04-30", firstOpenApplyDate: "2026-04-28",
    modeStatus: closed ? "closed" : "opened", applicationType: closed ? "close" : "open", everOpened: true,
    openedAt: "2026-05-01T00:00:00-04:00", expectedCloseTime: closed ? "2026-09-01T00:00:00-04:00" : "",
    attachments: Object.fromEntries(Object.keys(emptyAttachments()).map((key) => [key, [{ id: `${org.id}-${key}`, name: `${key}-document.pdf` }]])) as Application["attachments"],
    logs: [
      ...(closed ? [{ time: "2026-08-31T10:00:00-04:00", status: "审核通过", operator: "GOFO业务", action: "关闭申请业务审核通过" }] : []),
      { time: "2026-04-30T14:20:00-04:00", status: "审核通过", operator: "GOFO财务", action: "财务审核通过" },
      { time: "2026-04-29T10:10:00-04:00", status: "财务审核中", operator: "GOFO业务", action: "业务审核通过" },
      { time: "2026-04-28T09:00:00-04:00", status: "业务审核中", operator: "John Smith", action: "提交开户材料并签署付款协议" },
    ],
  }, drivers)
})
export const initialWithdrawalState: WithdrawalState = { applications: [...fleets, ...initialApplications], drivers, history: fleets }
