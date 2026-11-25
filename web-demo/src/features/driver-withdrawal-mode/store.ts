"use client"

import { dispatchDriverReview, useFinanceWithdrawals } from "../withdrawals/store"
export function useDriverWithdrawals() { return useFinanceWithdrawals().drivers }
export const submitDriverReview = dispatchDriverReview
