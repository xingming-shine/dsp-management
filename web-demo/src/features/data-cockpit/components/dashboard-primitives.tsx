"use client"

import type { ReactNode } from "react"
import { DownloadIcon, ExternalLinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { metricTooltip } from "@/features/data-cockpit/mock-data"
import type { KpiMetric } from "@/features/data-cockpit/types"
import { cn } from "@/lib/utils"

export interface TableColumn<Row> {
  key: keyof Row | string
  label: string
  tooltip?: string
  render?: (row: Row) => ReactNode
  exportValue?: (row: Row) => unknown
}

export function MetricCard({
  metric,
  onDetail,
}: {
  metric: KpiMetric
  onDetail?: (metric: KpiMetric) => void
}) {
  const card = (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
        {metric.status ? (
          <CardAction>
            <Badge
              variant={metric.status === "未达标" ? "destructive" : metric.status === "更新中" ? "warning" : "success"}
            >
              {metric.status}
            </Badge>
          </CardAction>
        ) : null}
        {metric.target ? <CardDescription>{metric.target}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {metric.value}
        </p>
        {metric.change ? (
          <p className="mt-1 text-xs text-muted-foreground">{metric.change}</p>
        ) : null}
      </CardContent>
      {onDetail && metric.detailType ? (
        <CardFooter className="border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDetail(metric)}
          >
            查看详情
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent>{metric.tooltip ?? metricTooltip}</TooltipContent>
    </Tooltip>
  )
}

export function MetricGrid({
  metrics,
  onDetail,
  className,
}: {
  metrics: KpiMetric[]
  onDetail?: (metric: KpiMetric) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} onDetail={onDetail} />
      ))}
    </div>
  )
}

export function ChartPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className={cn(action && "grid-cols-1 sm:grid-cols-[1fr_auto]")}>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction className="col-start-1 row-start-3 row-span-1 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  )
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`
}

export function downloadCsv<Row>(
  filename: string,
  columns: TableColumn<Row>[],
  rows: Row[]
) {
  const header = columns.map((column) => csvCell(column.label)).join(",")
  const body = rows
    .map((row) =>
      columns
        .map((column) => csvCell(column.exportValue ? column.exportValue(row) : (row as Record<string, unknown>)[String(column.key)]))
        .join(",")
    )
    .join("\n")
  const blob = new Blob([`\uFEFF${header}\n${body}`], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function DataTableCard<Row extends object>({
  title,
  description,
  columns,
  rows,
  filename,
  variant = "default",
  onRowClick,
}: {
  title: string
  description?: string
  columns: TableColumn<Row>[]
  rows: Row[]
  filename?: string
  variant?: "default" | "grid"
  onRowClick?: (row: Row) => void
}) {
  return (
    <Card>
      <CardHeader className={cn(filename && "grid-cols-1 sm:grid-cols-[1fr_auto]")}>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {filename ? (
          <CardAction className="col-start-1 row-start-3 row-span-1 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(filename, columns, rows)}
            >
              <DownloadIcon data-icon="inline-start" />
              导出
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="-mx-(--card-spacing) -mb-(--card-spacing)">
        <Table variant={variant}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)} className="whitespace-pre-line">
                  {column.tooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild><span tabIndex={0}>{column.label}</span></TooltipTrigger>
                      <TooltipContent>{column.tooltip}</TooltipContent>
                    </Tooltip>
                  ) : column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={index}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  onRowClick &&
                    "cursor-pointer focus-visible:bg-muted focus-visible:outline-none"
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    className={cn(index > -1 && typeof (row as Record<string, unknown>)[String(column.key)] === "number" && "tabular-nums")}
                  >
                    {column.render
                      ? column.render(row)
                      : String(
                          (row as Record<string, unknown>)[String(column.key)] ?? ""
                        )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
