"use client";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Analysis, Choices, DataGrid, Kpis, comboOption, type GridColumn, type ChartSeries } from "./cockpit-widgets";
import { aggregate, byPerspective, capacityColumns, efficiencyColumns, exclusionReasons, exclusionsFor, metric, periodLabel, weekOf, parcelsFor, qualityGroups, rawKeys, recordsFor, selectionLabel, timelinessMetrics, type Daily, type Metric, type Parcel, type Selection } from "../cockpit-model";
import { formatDate, formatDateTime } from "@/lib/date-time";
export function DetailShell({ title, description, onClose, children }: {
    title: string;
    description: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return <Sheet open onOpenChange={(v) => !v && onClose()}><SheetContent className="cockpit-detail data-[side=right]:w-full data-[side=right]:sm:max-w-4xl"><SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader><div className="cockpit-detail-body flex flex-col gap-6">{children}</div></SheetContent></Sheet>;
}
export function ParcelDetail({ records, type, selection }: {
    records: Daily[];
    type: Metric;
    selection: Selection;
}) {
    const common: [
        string,
        string
    ][] = [["waybill", "运单号"], ["driver", "司机"], ["status", "运单状态"], ["route", "路区"], ["postal", "邮编"], ["pickupAt", "领件时间"]];
    const operation: [
        string,
        string
    ][] = [["operation", "最后操作"], ["operationAt", "最后操作时间"], ["operator", "最后操作人"], ["organization", "最后操作机构"]];
    const fields: [
        string,
        string
    ][] = [...common, ...(type.key === "podBad" ? [["signedAt", "签收时间"]] as [
            string,
            string
        ][] : operation), ...(["fake", "suspected", "broken"].includes(type.key) ? [...(type.key === "fake" ? [["signedAt", "签收时间"]] : []), ["problem", "问题类型"]] as [
            string,
            string
        ][] : []), ...(["dnr", "complaint", "validComplaint"].includes(type.key) ? [["ticket", "客诉单号"], ["complaintAt", "客诉时间"], ["complaintType", "客诉类型"], ["complaintSubtype", "客诉子类型"]] as [
            string,
            string
        ][] : [])];
    const columns = fields.map(([key, label]): GridColumn<Parcel> => ({ key, label, numeric: key.endsWith("At"), value: (r) => key.endsWith("At") ? formatDateTime(r[key]) : r[key] }));
    return <DataGrid title={`${type.label}运单明细`} description="时间按 America/New_York 展示；导出包含当前周期全部运单，不仅是当前页。" columns={columns} rows={parcelsFor(records, type.key)} rowKey={(r) => r.waybill} filename={`${type.label}_${selectionLabel(selection)}`}/>;
}
export function MetricDetail({ type, selection, organizationId, onClose }: {
    type: Metric;
    selection: Selection;
    organizationId: string;
    onClose: () => void;
}) {
    const [perspective, setPerspective] = useState<"driver" | "route">("driver"), [timeView, setTimeView] = useState("total");
    const records = recordsFor(selection, organizationId), rows = byPerspective(records, perspective);
    const parcel = ["unfinished", "fake", "suspected", "broken", "dnr", "complaint", "validComplaint", "podBad"].includes(type.key);
    const hours = type.unit === "min", complaint = ["dnrRate", "complaintRate", "validComplaintRate"].includes(type.key);
    let series: ChartSeries[] = [{ metric: type }];
    if (["pickupRate", "delivered"].includes(type.key))
        series = capacityColumns.slice(0, 5).map((m) => ({ metric: m, type: m.unit === "%" ? "line" : "bar" }));
    if (type.key === "should")
        series = [metric("delivered", "妥投量"), metric("exception", "派送异常量")].map((m) => ({ metric: m, type: "bar", stack: "total" }));
    if (hours)
        series = efficiencyColumns.slice(2, 5).map((m) => ({ metric: { ...m, key: timeView === "total" ? m.key : `${perspective === "driver" ? "daily" : "avg"}${m.key}` }, type: "bar", stack: "hours" }));
    if (rawKeys[type.key])
        series = [{ metric: type }, { metric: metric(rawKeys[type.key], `${type.label}（原始值）`, "%") }];
    if (type.key === "fakeRate")
        series = [{ metric: metric("fake", "虚假签收量"), type: "bar" }, { metric: type }];
    if (type.key === "podRate")
        series = [metric("podChecked", "POD抽查量"), metric("podGood", "POD合规量"), metric("podBad", "POD不合规量")].map((m) => ({ metric: m, type: "bar" }));
    if (type.key === "podRate")
        series.push({ metric: type });
    if (["breakRate", "suspectedRate"].includes(type.key))
        series = qualityGroups[1].metrics.map((m) => ({ metric: m, type: m.unit === "%" ? "line" : "bar" }));
    if (complaint)
        series = qualityGroups[2].metrics.slice(3).map((m) => ({ metric: m, type: "bar" }));
    const chartRows = perspective === "driver"
        ? [...rows].sort((a, b) => (b.values[type.key] || 0) - (a.values[type.key] || 0))
        : rows;
    const dailyAllowed = selection.mode !== "day" || Boolean(selection.range && selection.range.start !== selection.range.end);
    return <DetailShell title={`${type.label}详情`} description={selectionLabel(selection)} onClose={onClose}>{parcel ? <ParcelDetail records={records} type={type} selection={selection}/> : <>
    <FieldGroup><Choices value={perspective} onChange={(v) => { setPerspective(v as typeof perspective); setTimeView("total"); }} options={[["driver", "司机视角"], ["route", "路区视角"]]} label="对比视角"/>{hours && (perspective === "route" || dailyAllowed) ? <Choices value={timeView} onChange={setTimeView} options={[["total", "总时长"], ["average", perspective === "driver" ? "日均时长" : "人均时长"]]} label="时长口径"/> : null}</FieldGroup>
    {complaint ? <Alert><AlertDescription>暂无司机和路区维度的DNR率、客诉率、有效客诉率；以下保留对应数量分布。</AlertDescription></Alert> : null}
    {hours ? <p className="text-xs text-muted-foreground">司机日均按有效派件天数，路区人均按去重派件司机数。当前为演示口径。</p> : null}
    <Analysis title={`${type.label} · ${perspective === "driver" ? "司机" : "路区"}对比`} option={comboOption(chartRows, series, type.target === undefined ? undefined : type)} height="detail" scrollable categoryLabelMode="entity"/>
    <DataGrid title="对比数据" columns={[{ key: "label", label: perspective === "driver" ? "司机" : "路区", value: (r) => r.label }, ...series.map((s): GridColumn<typeof rows[number]> => ({ key: s.metric.key, label: `${s.metric.label}${s.metric.unit ? `（${s.metric.unit}）` : ""}`, numeric: true, value: (r) => Math.round(r.values[s.metric.key] * 1000) / 1000 }))]} rows={rows} rowKey={(r) => r.id} filename={`${type.label}_${perspective}_${selectionLabel(selection)}`}/>
  </>}</DetailShell>;
}
export function ExclusionTables({ selection, organizationId, initialMetric = "all", embedded = false }: {
    selection: Selection;
    organizationId: string;
    initialMetric?: string;
    embedded?: boolean;
}) {
    const [filter, setFilter] = useState(initialMetric);
    const records = recordsFor(selection, organizationId), all = exclusionsFor(records), filtered = all.filter((r) => filter === "all" || r.metric === filter);
    const options = [["all", "全部"], ["2400", "2400妥投率"], ["4800", "4800妥投率"]] as const;
    const groups = new Map<string, typeof filtered>();
    for (const r of filtered) {
        const period = selection.mode === "month" ? r.date.slice(0, 7) : selection.mode === "week" ? weekOf(r.date) : r.date;
        const key = `${period}/${r.metric}`;
        groups.set(key, [...(groups.get(key) || []), r]);
    }
    const reasons = Array.from(groups, ([id, entries]) => {
        const unique = new Set(entries.map((r) => r.waybill)).size, duplicate = entries.reduce((s, r) => s + r.duplicate, 0), kind = entries[0].metric;
        const dates = new Set(entries.map((r) => r.date)), a = aggregate(records.filter((r) => dates.has(r.date)));
        return exclusionReasons.map((reason) => ({ id: `${id}/${reason}`, label: id.slice(0, id.lastIndexOf("/")), metric: `${kind}妥投率`, reason, count: entries.filter((r) => r.reason.split(" / ").includes(reason)).length, unique, duplicate, delta: `${(a[`delta${kind}`] || 0).toFixed(2)}pp` })).filter((r) => r.count);
    }).flat().sort((a, b) => b.label.localeCompare(a.label) || a.metric.localeCompare(b.metric) || b.count - a.count);
    const reasonColumns: GridColumn<typeof reasons[number]>[] = [
        { key: "label", label: selection.mode === "month" ? "剔除月份" : selection.mode === "week" ? "剔除周期" : "剔除日期", value: (r) => periodLabel(selection.mode, r.label) },
        ...([["metric", "指标"], ["delta", "剔除影响"], ["reason", "剔除原因"], ["count", "剔除量"], ["duplicate", "重复剔除量"], ["unique", "去重后剔除量"]] as const).map(([key, label]) => ({ key, label, numeric: ["count", "duplicate", "unique"].includes(key), value: (r: typeof reasons[number]) => r[key] })),
    ];
    const waybillColumns: GridColumn<typeof filtered[number]>[] = ([["date", "剔除日期"], ["metric", "指标"], ["waybill", "运单号"], ["reason", "剔除原因"], ["status", "运单状态"], ["route", "路区"], ["postal", "邮编"], ["driver", "司机"]] as const).map(([key, label]) => ({ key, label, value: (r) => key === "date" ? formatDate(r.date) : r[key] }));
    const controls = <div className="py-3"><Choices value={filter} onChange={setFilter} options={options} label="剔除指标"/></div>;
    const content = <><TabsContent value="reason">{controls}<DataGrid key={`reason/${filter}/${selectionLabel(selection)}`} title="剔除原因汇总" description="重复量和去重量是同周期、同指标的组统计，不应跨原因重复相加。" columns={reasonColumns} rows={reasons} rowKey={(r) => r.id} filename={`剔除原因_${filter}_${selectionLabel(selection)}`}/></TabsContent><TabsContent value="waybill">{controls}<DataGrid key={`waybill/${filter}/${selectionLabel(selection)}`} title="剔除运单明细" description="同一运单的多条原因已合并；不同指标分别展示。导出包含全部筛选结果。" columns={waybillColumns} rows={filtered.sort((a, b) => b.date.localeCompare(a.date))} rowKey={(r) => `${r.date}/${r.metric}/${r.waybill}`} filename={`剔除运单_${filter}_${selectionLabel(selection)}`}/></TabsContent></>;
    return embedded ? content : <Tabs defaultValue="reason"><TabsList variant="line"><TabsTrigger value="reason">剔除原因汇总</TabsTrigger><TabsTrigger value="waybill">剔除运单明细</TabsTrigger></TabsList>{content}</Tabs>;
}
export function AssessmentDetail({ type, selection, organizationId, onClose }: {
    type: Metric;
    selection: Selection;
    organizationId: string;
    onClose: () => void;
}) {
    const values = aggregate(recordsFor(selection, organizationId)), kind = type.key.includes("4800") ? "4800" : "2400";
    values.exclusionRate = values.should ? values.excluded / values.should * 100 : 0;
    return <DetailShell title={`${type.label}考核明细`} description={selectionLabel(selection)} onClose={onClose}><Kpis metrics={[metric(`raw${kind}`, "原始值", "%"), timelinessMetrics[kind === "2400" ? 0 : 1], metric("excluded", "去重后剔除量"), metric("exclusionRate", "剔除占比", "%")]} values={values} selection={selection}/><Alert><AlertDescription>模拟计算：原始妥投 {values[`vol${kind}`]} / 应派 {values.should}；考核妥投 {values[`assessed${kind}`]} / 考核应派 {values.assessedShould}。剔除后差异 {values[`delta${kind}`].toFixed(2)}pp。正式口径以数仓结果为准。</AlertDescription></Alert><ExclusionTables selection={selection} organizationId={organizationId} initialMetric={kind}/></DetailShell>;
}
