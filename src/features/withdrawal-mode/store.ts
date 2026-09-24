"use client"

import { dispatchFleetAction, useFinanceWithdrawals } from "../withdrawals/store"
import { withAffectedDrivers } from "../withdrawals/model"
export function useWithdrawalApplications() {
  const state = useFinanceWithdrawals()
  return state.applications.map((row) => row.modeStatus === "opened" && row.applicationType !== "close" ? withAffectedDrivers(row, state.drivers) : row)
}
export const dispatchWithdrawal = dispatchFleetAction
