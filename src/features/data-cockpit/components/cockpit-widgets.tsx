"use client";
import { Fragment, useId, useState, type ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, InfoIcon } from "lucide-react";
import type { EChartsOption } from "echarts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DataPagination } from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EChartsChart } from "./echarts-chart";
import { cn } from "@/lib/utils";
import { display, isUpdating, passes, rawKeys, selectionLabel, periodLabel, serializeCSV, type Metric, type Selection, type Values, type RecordRow } from "../cockpit-model";
export function Choices({ value, onChange, options, label }: {
    value: string;
    onChange: (value: string) => void;
    options: readonly (readonly [
        string,
        string
    ])[];
    label: string;
}) {
    return <ToggleGroup type="single" variant="outline" spacing={0} value={value} onValueChange={(v) => v && onChange(v)} aria-label={label} className="flex-wrap justify-start">{options.map(([key, text]) => <ToggleGroupItem key={key} value={key}>{text}</ToggleGroupItem>)}</ToggleGroup>;
}
export function Pick({ value, onChange, options, label, disabled }: {
    value: string;
    onChange: (value: string) => void;
    options: {
        value: string;
        label: string;
    }[];
    label: string;
    disabled?: boolean;
}) {
    const id = useId();
    return <Field data-disabled={disabled}><FieldLabel htmlFor={id}>{label}</FieldLabel><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>;
}
export function TargetFilter({ metrics, target, filter, onTarget, onFilter }: {
    metrics: Metric[];
    target: string;
    filter: string;
    onTarget: (v: string) => void;
    onFilter: (v: string) => void;
}) {
    return <FieldGroup className="grid gap-3 sm:grid-cols-2"><Pick label="目标线" value={target} onChange={(v) => { onTarget(v); if (v === "none")
        onFilter("all"); }} options={[...metrics.map((m) => ({ value: m.key, label: `${m.label} ${m.lower ? "≤" : "≥"}${m.target}%` })), { value: "none", label: "不展示" }]}/><Pick label="达标筛选" value={filter} onChange={onFilter} disabled={target === "none"} options={[{ value: "all", label: "全部" }, { value: "pass", label: "仅已达标" }, { value: "fail", label: "仅未达标" }]}/></FieldGroup>;
}
export function Kpis({ metrics, values, selection, onDetail, onExclusion, comparison, raw = false }: {
    metrics: Metric[];
    values: Values;
    selection: Selection;
    onDetail?: (m: Metric) => void;
    onExclusion?: (m: Metric) => void;
    comparison?: {
        previous: Values;
        week?: Values;
    };
    raw?: boolean;
}) {
    return <div className={cn("grid gap-4 sm:grid-cols-2", metrics.length === 3 ? "xl:grid-cols-3" : metrics.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4")}>{metrics.map((m) => {
            const valueKey = raw && rawKeys[m.key] ? rawKeys[m.key] : m.key;
            const value = values[valueKey];
            const updating = isUpdating(m.key, selection.mode, selection.range?.end || selection.value);
            const dual = !raw && ["rate2400", "rate4800"].includes(m.key) && Boolean(onExclusion);
            return <Card key={m.key}><CardHeader><CardTitle>{m.label}</CardTitle><CardDescription className="min-h-5">{m.target !== undefined ? `目标 ${m.lower ? "≤" : "≥"} ${m.target}${m.unit}` : ""}</CardDescription></CardHeader><CardContent className="flex flex-1 flex-col gap-2"><div className="flex flex-wrap items-center gap-2"><p className={cn("text-3xl tabular-nums", m.unit === "min" && "text-xl")}>{display(value, m.unit)}</p>{updating ? <Badge variant="warning">更新中</Badge> : m.target !== undefined && !raw ? <Badge variant={passes(value, m) ? "success" : "destructive"}>{passes(value, m) ? "达标" : "未达标"}</Badge> : null}</div>
      {m.unit === "min" && values[`avg${m.key}`] !== undefined ? <p className="text-xs text-muted-foreground">人均 {display(values[`avg${m.key}`], "min")}</p> : null}
      {dual ? <p className="text-xs text-muted-foreground">原始值 {display(values[rawKeys[m.key]], "%")} · 剔除后差异 {display(value - values[rawKeys[m.key]], "pp")}</p> : null}
      {comparison && !updating ? <div className="flex flex-col gap-1 text-xs text-muted-foreground">{[[comparison.previous, selection.mode === "day" ? "环比昨日" : selection.mode === "week" ? "环比上周" : "环比上月"], ...(comparison.week ? [[comparison.week, "同比上周"]] : [])].map(([data, text]) => { const d = value - (data as Values)[valueKey]; const direction = d === 0 ? "持平" : m.target !== undefined && !raw ? ((m.lower ? d < 0 : d > 0) ? "改善" : "需关注") : ""; return <p key={text as string} className={direction === "改善" ? "text-success" : direction === "需关注" ? "text-destructive" : undefined}>{d > 0 ? "↑" : d < 0 ? "↓" : "→"} {display(Math.abs(d), m.unit === "%" ? "pp" : m.unit)} {text as string} {direction}</p>; })}</div> : null}
      <p className="text-xs text-muted-foreground">{selectionLabel(selection)}</p></CardContent>{onDetail ? <CardFooter className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" onClick={() => onDetail(m)}>查看详情</Button>{dual ? <Button variant="ghost" size="sm" onClick={() => onExclusion?.(m)}>剔除明细</Button> : null}</CardFooter> : null}</Card>;
        })}</div>;
}
export type GridColumn<T> = {
    key: string;
    label: string;
    group?: string;
    numeric?: boolean;
    stickyLeft?: number;
    width?: number;
    value: (row: T) => ReactNode;
    export?: (row: T) => string | number;
    action?: boolean;
};
export function exportRows<T>(name: string, columns: GridColumn<T>[], rows: T[]) {
    const active = columns.filter((c) => !c.action);
    const csv = serializeCSV(active.map((c) => [c.group, c.label].filter(Boolean).join(" · ")), rows.map((r) => active.map((c) => c.export ? c.export(r) : String(c.value(r) ?? ""))));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[\\/:*?"<>|]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
export function DataGrid<T>({ title, description, columns, rows, rowKey, childrenOf, summary, filename = title, extra, childColumns, exportColumns, childExportLabel = "导出司机明细", parentExportLabel = "导出周期汇总" }: {
    title: string;
    description?: string;
    columns: GridColumn<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    childrenOf?: (row: T) => T[] | undefined;
    summary?: T;
    filename?: string;
    extra?: ReactNode;
    childColumns?: GridColumn<T>[];
    exportColumns?: GridColumn<T>[];
    childExportLabel?: string;
    parentExportLabel?: string;
}) {
    const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [expanded, setExpanded] = useState<Set<string>>(new Set());
    const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
    const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const groups: {
        label: string;
        count: number;
    }[] = [];
    for (const c of columns) {
        const label = c.group || "基本信息";
        if (groups.at(-1)?.label === label)
            groups[groups.length - 1].count++;
        else
            groups.push({ label, count: 1 });
    }
    function renderRow(row: T, child = false, total = false) {
        const id = rowKey(row), children = childrenOf?.(row), open = expanded.has(id);
        const cols = child ? childColumns || columns : columns;
        return <Fragment key={id}><TableRow data-state={total ? "selected" : undefined}>{cols.map((c, i) => <TableCell key={c.key} className={cn(c.numeric && "tabular-nums", (i === 0 || c.stickyLeft !== undefined) && "sticky bg-card z-10", c.action && "sticky right-0 bg-card")} style={{ left: c.stickyLeft ?? (i === 0 ? 0 : undefined), minWidth: c.width, width: c.width }}>
      {i === 0 && children?.length ? <Button variant="ghost" size="sm" aria-expanded={open} aria-label={`${open ? "收起" : "展开"}${String(c.value(row))}`} onClick={() => setExpanded((prev) => { const next = new Set(prev); if (next.has(id))
                next.delete(id);
            else
                next.add(id); return next; })}>{open ? <ChevronDownIcon data-icon="inline-start"/> : <ChevronRightIcon data-icon="inline-start"/>}{c.value(row)}</Button> : <span className={cn(child && i === 0 && "pl-6")}>{c.value(row)}</span>}
    </TableCell>)}</TableRow>{open ? children?.map((r) => renderRow(r, true)) : null}</Fragment>;
    }
    return <Table variant="grid" viewportClassName="max-h-[36rem]" toolbar={<div className="flex flex-col gap-3"><div><h3 className="text-base font-medium">{title}</h3>{description ? <p className="text-xs text-muted-foreground">{description}</p> : null}</div>{extra}<p className="text-xs text-muted-foreground">当前显示 {rows.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, rows.length)} 条，共 {rows.length} 条</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportRows(filename, exportColumns || columns, summary ? [summary, ...rows] : rows)}><DownloadIcon data-icon="inline-start"/>{childrenOf ? parentExportLabel : "导出"}</Button>{childrenOf ? <Button variant="outline" size="sm" disabled={!rows.length} onClick={() => exportRows(`${filename}_${childExportLabel.replace("导出", "")}`, childColumns || columns, rows.flatMap((r) => childrenOf(r) || []))}>{childExportLabel}</Button> : null}</div></div>} footer={<DataPagination page={currentPage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}/>}>
    <TableHeader>{groups.length > 1 ? <TableRow>{groups.map((g, i) => <TableHead key={i} colSpan={g.count}>{g.label}</TableHead>)}</TableRow> : null}<TableRow>{columns.map((c, i) => <TableHead key={c.key} className={cn((i === 0 || c.stickyLeft !== undefined) && "sticky bg-muted z-20", c.action && "sticky right-0 bg-muted")} style={{ left: c.stickyLeft ?? (i === 0 ? 0 : undefined), minWidth: c.width, width: c.width }}>{c.label}</TableHead>)}</TableRow></TableHeader><TableBody>{summary ? renderRow(summary, false, true) : null}{visible.length ? visible.map((r) => renderRow(r)) : <TableRow><TableCell colSpan={columns.length}><Empty><EmptyHeader><EmptyTitle>暂无数据</EmptyTitle><EmptyDescription>请调整时间或筛选条件。</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>}</TableBody>
  </Table>;
}
export function MetricTable({ title = "数据明细", metrics, rows, summary, selection, rawCompare = false, quality = false }: {
    title?: string;
    metrics: Metric[];
    rows: RecordRow[];
    summary?: RecordRow;
    selection: Selection;
    rawCompare?: boolean;
    quality?: boolean;
}) {
    function columns(child: boolean): GridColumn<RecordRow>[] {
        return [{ key: "label", label: child ? "周期 / 司机" : "日期 / 周 / 月", value: (r) => r.label, export: (r) => child ? `${r.period ? periodLabel(selection.mode, r.period) : ""} / ${r.label}` : r.label }, ...metrics.map((m): GridColumn<RecordRow> => {
                const missing = child && quality && ["dnrRate", "complaintRate", "validComplaintRate"].includes(m.key);
                const avg = child && m.key.startsWith("avg");
                const value = (r: RecordRow) => missing ? "—" : avg && selection.mode === "day" ? "/" : display(r.values[avg ? m.key.replace("avg", "daily") : m.key], m.unit);
                return { key: m.key, label: m.label, numeric: true, value: (r) => <span className="inline-flex flex-col items-end gap-1 py-2">{r.period && isUpdating(m.key, selection.mode, r.period) ? <Badge variant="warning">更新中</Badge> : null}{value(r)}{avg && selection.mode !== "day" ? <span className="text-muted-foreground">日均 · 有效{r.values.driverDays}天</span> : null}{rawCompare && rawKeys[m.key] ? <span className="text-muted-foreground">原始 {display(r.values[rawKeys[m.key]], m.unit)}{m.unit === "%" ? ` · ${display(r.values[m.key] - r.values[rawKeys[m.key]], "pp")}` : ""}</span> : null}</span>, export: (r) => `${r.period && isUpdating(m.key, selection.mode, r.period) ? "更新中 " : ""}${m.unit === "min" && !missing && !(avg && selection.mode === "day") ? display(r.values[avg ? m.key.replace("avg", "daily") : m.key]) : value(r)}` };
            }), ...(rawCompare ? metrics.filter((m) => rawKeys[m.key]).map((m): GridColumn<RecordRow> => ({ key: `raw-${m.key}`, label: `${m.label}（原始值）`, numeric: true, value: (r) => display(r.values[rawKeys[m.key]], m.unit) })) : [])];
    }
    const cols = columns(false);
    const exportCols = cols.map((c) => metrics.find((m) => m.key === c.key)?.unit === "min" ? { ...c, label: `${c.label}（min）` } : c);
    return <DataGrid key={`${selectionLabel(selection)}/${rawCompare}`} title={title} description={quality ? "司机维度不提供DNR率、客诉率、有效客诉率。" : "点击周期展开司机；汇总与明细同源。"} columns={cols} exportColumns={exportCols} childColumns={columns(true).map((c) => metrics.find((m) => m.key === c.key)?.unit === "min" ? { ...c, label: `${c.label}（min）` } : c)} rows={[...rows].reverse()} rowKey={(r) => r.id} childrenOf={(r) => r.children} summary={summary} filename={`${title}_${selectionLabel(selection)}${rawCompare ? "_含原始值" : ""}`}/>;
}
export type ChartSeries = {
    metric: Metric;
    type?: "line" | "bar";
    stack?: string;
    hidden?: boolean;
    data?: (number | null)[];
};
const escape = (s: unknown) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export function comboOption(rows: RecordRow[], series: ChartSeries[], target?: Metric, range = false, highlight = false): EChartsOption {
    const units = [...new Set(series.map((s) => s.metric.unit || "件"))];
    return { aria: { enabled: true, label: { description: `${series.map((s) => s.metric.label).join("、")}，${rows.length}个对象或周期；完整数据见下方明细。` } }, textStyle: { fontSize: 12 }, legend: { top: 0, type: "scroll", textStyle: { fontSize: 12 }, selected: Object.fromEntries(series.map((s) => [s.metric.label, !s.hidden])) },
        tooltip: { trigger: "axis", confine: true, borderWidth: 0, padding: 12, extraCssText: "max-width:260px", formatter: (parameters) => {
                const items = (Array.isArray(parameters) ? parameters : [parameters]) as {
                    name: string;
                    seriesName: string;
                    dataIndex: number;
                    marker?: string;
                }[];
                const r = rows[items[0]?.dataIndex || 0];
                const mode = r?.period?.includes("~") ? "week" : r?.period?.length === 7 ? "month" : "day";
                const stackTotals = new Map<string, number>();
                const body = items.map((p) => {
                    const s = series.find((s) => s.metric.label === p.seriesName), m = s?.metric;
                    const value = s?.data ? s.data[p.dataIndex] ?? undefined : r?.values[m?.key || ""];
                    const updating = Boolean(r?.period && m && isUpdating(m.key, mode, r.period));
                    if (s?.stack && value !== undefined)
                        stackTotals.set(s.stack, (stackTotals.get(s.stack) || 0) + value);
                    const status = updating ? " 更新中" : m?.target !== undefined && value !== undefined ? passes(value, m) ? " 达标" : " 未达标" : "";
                    const raw = m && /^rate(2400|4800)$/.test(m.key) && r ? `<div><span>原始 / 考核差值</span><span>${escape(display(r.values[rawKeys[m.key]], "%"))} / ${escape(display((value || 0) - r.values[rawKeys[m.key]], "pp"))}</span></div>` : "";
                    return `<div><span>${p.marker || ""}${escape(p.seriesName)}</span><span>${escape(display(value, m?.unit))}${status}</span></div>${raw}`;
                }).join("");
                return `<div class="cockpit-chart-tooltip"><strong>${escape(items[0]?.name || "")}</strong>${body}${units.includes("min") && r ? `<div><span>派件司机 / 有效人天</span><span>${r.values.drivers}人 / ${r.values.driverDays}人天</span></div>` : ""}${Array.from(stackTotals, ([key, value]) => `<div><span>合计</span><span>${escape(display(value, key === "hours" ? "min" : key === "score" ? "分" : "件"))}</span></div>`).join("")}</div>`;
            } }, grid: { top: 60, left: 60, right: units.length > 1 ? 60 : 24, bottom: 55, containLabel: true },
        xAxis: { type: "category", data: rows.map((r) => r.label), axisLabel: { fontSize: 12, hideOverlap: true } },
        yAxis: units.map((unit, i) => ({ type: "value" as const, name: unit === "min" ? "分钟" : unit, position: i ? "right" as const : "left" as const, splitLine: { show: i === 0 }, axisLabel: { fontSize: 12 } })),
        series: series.map((s, i) => ({ name: s.metric.label, type: s.type || "line", stack: s.stack, yAxisIndex: units.indexOf(s.metric.unit || "件"), data: s.data || rows.map((r) => r.values[s.metric.key]), connectNulls: false, symbolSize: 6, barMaxWidth: 28, areaStyle: range && i < 4 && s.type !== "bar" ? { opacity: .08 } : undefined,
            markLine: (target && target.key === s.metric.key) || (highlight && i === 0 && rows.length) ? { silent: true, symbol: "none", data: [...(target && target.key === s.metric.key ? [{ yAxis: target.target, label: { position: "insideEndTop", formatter: `目标 ${target.target}%`, fontSize: 12 } }] : []), ...(highlight && i === 0 && rows.length ? [{ xAxis: rows.length - 1, label: { show: false }, lineStyle: { type: "dashed", opacity: .4 } }] : [])] } : undefined,
            markPoint: highlight && rows.length && s.type !== "bar" ? { symbol: "circle", symbolSize: 9, label: { show: false }, data: [{ coord: [rows.length - 1, rows.at(-1)?.values[s.metric.key] || 0] }] } : undefined,
        })) as EChartsOption["series"] };
}
export function Analysis({ title, description, option, action, onClick, centerAction, selection }: {
    title: string;
    description?: string;
    option: EChartsOption;
    action?: ReactNode;
    onClick?: (name: string) => void;
    centerAction?: ReactNode;
    selection?: Selection;
}) {
    return <Card className="min-w-0"><CardHeader><CardTitle>{title}</CardTitle>{selection ? <CardDescription>{selectionLabel(selection)}{title.includes("趋势") && !selection.range ? ` · 截至所选期近${selection.mode === "day" ? 30 : 12}期` : ""}</CardDescription> : null}{description ? <CardDescription>{description}</CardDescription> : null}{action}</CardHeader><CardContent><div className="relative"><EChartsChart option={option} ariaLabel={title} onChartClick={onClick ? (event) => onClick(event.name) : undefined}/>{centerAction ? <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2">{centerAction}</div> : null}</div></CardContent></Card>;
}
export function MetricHelp() { return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="模拟口径说明"><InfoIcon /></Button></TooltipTrigger><TooltipContent>字段沿用原型；模拟计算仅用于展示，不代表正式数仓考核公式。</TooltipContent></Tooltip>; }
