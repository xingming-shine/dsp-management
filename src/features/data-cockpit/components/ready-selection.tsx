"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { mockSession } from "@/mocks/session";
import { mockAvailability, periodLabel, resolveReadyPeriod, todayISO, type Selection } from "../cockpit-model";
export function useReadySelection(kind: "driver" | "month", initialMode: "week" | "month" = "month", initial?: Selection) {
    const response = mockAvailability(initialMode === "week" ? "week" : kind);
    const [selection, setSelection] = useState<Selection>({ mode: initialMode, value: initial ? resolveReadyPeriod(initial.value, response) : response.latestReadyPeriod });
    const [notice, setNotice] = useState("");
    function choose(s: Selection) {
        const available = mockAvailability(s.mode === "week" ? "week" : kind);
        const requested = s.range?.end || s.value, ready = resolveReadyPeriod(requested, available);
        // Always apply the fallback, regardless of whether today's notice has been dismissed.
        setSelection(ready === requested ? s : { mode: s.mode, value: ready });
        if (requested !== ready) {
            const key = `dsp-cockpit:notice:${mockSession.user.id}:${todayISO()}:${kind}:${s.mode}`;
            let seen = false;
            try {
                seen = localStorage.getItem(key) === "1";
                localStorage.setItem(key, "1");
            }
            catch { /* Private storage may be unavailable; selection still works. */ }
            if (!seen)
                setNotice(`所选周期数据尚未就绪，已展示最近可用的${periodLabel(s.mode, ready)}。计划更新时间仅供参考，最终以数仓返回的就绪周期为准。`);
        }
    }
    return { selection, choose, notice, dismiss: () => setNotice("") };
}
export function ReadyNotice({ notice, onClose }: {
    notice: string;
    onClose: () => void;
}) {
    return <Dialog open={Boolean(notice)} onOpenChange={(v) => !v && onClose()}><DialogContent><DialogHeader><DialogTitle>数据更新提示</DialogTitle><DialogDescription>{notice}</DialogDescription></DialogHeader><DialogFooter><Button onClick={onClose}>知道了</Button></DialogFooter></DialogContent></Dialog>;
}
