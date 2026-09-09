import type { MonitorWaybill } from "./driver-monitor-data"

export type PodPhoto = { id: string; url: string; label: string }
export type PodSubmission = { id: string; photoIds: string[] }
export type PodAudit = { id: string; at: string; reviewer: string; passed: boolean; reason: string | null; submissionId: string }
export type PodRecord = { recipient: string; recipientType: string; signedAt: string | null; photos: PodPhoto[]; submissions: PodSubmission[]; latestSubmissionId: string; audits: PodAudit[] }

// Isolated deterministic fixtures; replace this adapter with the POD service when available.
// Never derive the recipient from the courier identity or expose server-only addresses here.
export function getDemoPodRecord(row: MonitorWaybill): PodRecord {
  const noncompliant = row.alerts.includes("pod")
  const empty = !noncompliant && row.sequence % 17 === 0
  const photos: PodPhoto[] = row.podImages.length
    ? row.podImages.map((photo, index) => ({ ...photo, id: `photo-${index + 1}` }))
    : empty ? [] : [
      { id: "photo-1", url: "/assets/live-dashboard/pod/parcel-label.png", label: "包裹面单" },
      { id: "photo-2", url: "/assets/live-dashboard/pod/doorstep.png", label: "妥投环境" },
      { id: "photo-3", url: "/assets/live-dashboard/pod/parcel-side.png", label: "包裹外观" },
    ]
  const at = (minutes: number) => new Date(Date.parse(row.signedAt ?? row.actionAt) + minutes * 60_000).toISOString()
  // Reuse the same three assets, but keep submission identity separate from asset identity.
  const latestSubmissionId = "submission-latest"
  const submissions: PodSubmission[] = [
    { id: latestSubmissionId, photoIds: photos.map((photo) => photo.id) },
    { id: "submission-review", photoIds: photos.slice(0, 2).map((photo) => photo.id) },
    { id: "submission-first", photoIds: photos.slice(0, 1).map((photo) => photo.id) },
  ]
  const audits: PodAudit[] = !photos.length ? [] : [
    { id: "audit-latest", at: at(8), reviewer: "AI", passed: !noncompliant, reason: noncompliant ? "面单关键信息不清晰" : null, submissionId: latestSubmissionId },
    { id: "audit-review", at: at(5), reviewer: "质检", passed: !noncompliant, reason: noncompliant ? "面单信息无法完整核验" : null, submissionId: "submission-review" },
    { id: "audit-first", at: at(2), reviewer: "AI", passed: !noncompliant && row.sequence % 3 !== 0, reason: noncompliant || row.sequence % 3 === 0 ? "关键画面信息缺失，需复核" : null, submissionId: "submission-first" },
  ]
  return {
    recipient: ["Alex Morgan", "Taylor Reed", "Jordan Parker", "Casey Brooks"][row.sequence % 4],
    recipientType: ["本人签收", "家人代收", "前台代收"][row.sequence % 3],
    signedAt: row.signedAt,
    photos,
    submissions,
    latestSubmissionId,
    audits,
  }
}
