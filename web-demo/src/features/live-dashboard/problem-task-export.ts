import { formatDateTime } from "@/lib/date-time"
import { statusLabels } from "./driver-monitor-data"
import { remainingProblemTime, type ProblemTask } from "./problem-task-data"

export function buildProblemTasksCsv(rows: ProblemTask[], columns: string[], now: number) {
  const values = rows.map((task) => {
    const cells: Record<string, string> = {
      运单编号: task.waybill.id,
      运单状态: statusLabels[task.waybill.status],
      问题件上报时间: formatDateTime(task.reportedAt),
      问题件结束时间: task.endedAt ? formatDateTime(task.endedAt) : "—",
      问题件类型: task.type,
      问题件状态: task.status,
      是否虚假问题件: task.fake ? "是" : "否",
      处理指令: task.instruction,
      剩余处理时长: remainingProblemTime(task.deadline, now),
      处理结果: task.result ?? "—",
      责任机构: task.responsibleOrg,
      当前处理机构: task.currentOrg,
      司机: task.driver,
      路区: task.route,
      邮编: task.waybill.postalCode,
      最新操作: task.latestAction,
      操作时间: formatDateTime(task.actionAt),
      操作人: task.operator,
    }
    return columns.map((column) => cells[column] ?? "—")
  })
  const escapeCell = (value: string) => {
    const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value
    return `"${safe.replaceAll('"', '""')}"`
  }
  return `\uFEFF${[columns, ...values].map((row) => row.map(escapeCell).join(",")).join("\r\n")}`
}
