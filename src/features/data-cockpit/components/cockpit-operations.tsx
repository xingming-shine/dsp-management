"use client";
import { useState } from "react";
import type { EChartsOption } from "echarts";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Analysis, Choices, DataGrid, Kpis, MetricHelp, MetricTable, TargetFilter, comboOption, type ChartSeries, type GridColumn } from "./cockpit-widgets";
import { CockpitTimeFilter } from "./cockpit-time-filter";
import { AssessmentDetail, ExclusionTables, MetricDetail } from "./cockpit-details";
import { aggregate, buckets, byPerspective, capacityColumns, capacityMetrics, complaintTypes, defaultSelection, display, efficiencyColumns, efficiencyMetrics, metric, MOCK_NOTICE, mockAvailability, passes, periodLabel, periodRows, qualityColumns, qualityGroups, recordsFor, resolveReadyPeriod, selectedPeriods, selectionLabel, shiftPeriod, timelinessColumns, timelinessMetrics, isUpdating, type Daily, type Metric, type RecordRow, type Selection } from "../cockpit-model";
import { driverMonth, driverSummary, driverSummaryMetrics } from "../score-model";
import type { CockpitView, Perspective } from "../types";
export function donutOption(items: {
    name: string;
    value: number;
}[], unit = "件", selected?: string): EChartsOption {
    const total = items.reduce((s, r) => s + r.value, 0);
    return { aria: { enabled: true }, textStyle: { fontSize: 12 }, tooltip: { trigger: "item", confine: true, formatter: (p) => { const item = (Array.isArray(p) ? p[0] : p) as {
                name?: string;
                value?: number;
                percent?: number;
            }; return `<div class="cockpit-chart-tooltip"><strong>${item.name}</strong><div><span>数量 / 占比</span><span>${display(item.value, unit)} · ${item.percent}%</span></div></div>`; } }, legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 12 } }, title: { show: selected === undefined, text: display(total, unit === "min" ? "min" : ""), subtext: unit === "min" ? "工作时长" : `总${unit === "人" ? "人数" : "量"}`, left: "center", top: "38%", textStyle: { fontSize: 20 }, subtextStyle: { fontSize: 12 } }, series: [{ type: "pie", radius: ["48%", "68%"], center: ["50%", "45%"], data: items.map((item) => ({ ...item, selected: item.name === selected })), label: { show: false, fontSize: 12 }, selectedMode: "single", emphasis: { scale: true } }] };
}
function Distribution({ records, selection, complaint = false }: {
    records: Daily[];
    selection: Selection;
    complaint?: boolean;
}) {
    const [kind, setKind] = useState("complaint"), [category, setCategory] = useState("all"), [perspective, setPerspective] = useState<Perspective>("driver"), [listPerspective, setListPerspective] = useState<Perspective>("driver");
    const names = complaint ? complaintTypes : buckets;
    const key = (i: number) => complaint ? `${kind}${i}` : `bucket${i}`;
    const totalKey = complaint ? kind : "delivered";
    const values = aggregate(records), chartRows = byPerspective(records, perspective);
    const m = metric(category === "all" ? totalKey : key(names.indexOf(category)), category === "all" ? "全部" : category);
    const metrics = [metric(totalKey, "总量"), ...names.map((name, i) => metric(key(i), name))];
    const rows: RecordRow[] = byPerspective(records, listPerspective).map((r) => ({ ...r, children: selectedPeriods(selection).map((period) => {
            const current = byPerspective(recordsFor({ mode: selection.mode, value: period }), listPerspective).find((x) => x.id === r.id);
            return { id: `${r.id}/${period}`, label: periodLabel(selection.mode, period), values: current?.values || {}, period };
        }) }));
    const columns: GridColumn<RecordRow>[] = [{ key: "label", label: listPerspective === "driver" ? "司机" : listPerspective === "route" ? "路区" : "邮编", value: (r) => r.label }, ...metrics.map((m) => ({ key: m.key, label: m.label, numeric: true, value: (r: RecordRow) => display(r.values[m.key]) }))];
    return <div className="flex flex-col gap-4">{complaint ? <Choices value={kind} onChange={(v) => { setKind(v); setCategory("all"); }} options={[["complaint", "客诉"], ["validComplaint", "有效客诉"]]} label="客诉类型"/> : null}<div className="grid gap-4 xl:grid-cols-2"><Analysis selection={selection} title={complaint ? "客诉类型分布" : "妥投时效分布"} description="点击分类联动右侧分布，恢复全部可取消筛选。" option={donutOption(names.map((name, i) => ({ name, value: values[key(i)] || 0 })), "件", category)} centerAction={<Button variant="ghost" className="h-auto flex-col gap-1 px-2 py-2" onClick={() => setCategory("all")} aria-label="恢复全部分类"><span className="text-xl tabular-nums">{display(values[totalKey])}</span><span className="text-xs text-muted-foreground">总量 · 全部</span></Button>} onClick={setCategory} action={<Button variant="outline" size="sm" onClick={() => setCategory("all")}>恢复全部</Button>}/><Analysis selection={selection} title={`${category === "all" ? "全部" : category} · ${perspective === "driver" ? "司机" : "路区"}分布`} action={<Choices value={perspective} onChange={(v) => setPerspective(v as Perspective)} options={[["driver", "司机"], ["route", "路区"]]} label="分布图视角"/>} option={comboOption(chartRows, [{ metric: m, type: "bar" }])}/></div>{!complaint ? <DataGrid key={`${listPerspective}/${selectionLabel(selection)}`} title="妥投分布明细" extra={<Choices value={listPerspective} onChange={(v) => setListPerspective(v as Perspective)} options={[["driver", "司机"], ["postal", "邮编"], ["route", "路区"]]} label="分布列表视角"/>} columns={columns} rows={rows} rowKey={(r) => r.id} childrenOf={(r) => r.children} parentExportLabel="导出对象汇总" childExportLabel="导出周期明细" childColumns={columns.map((c, i) => i === 0 ? { ...c, export: (r: RecordRow) => `${r.id.slice(0, r.id.indexOf("/"))} / ${r.label}` } : c)} filename={`妥投分布_${listPerspective}_${selectionLabel(selection)}`}/> : null}</div>;
}
function FilteredTrend({ title, rows, series, targets, selection }: {
    title: string;
    rows: RecordRow[];
    series: ChartSeries[];
    targets: Metric[];
    selection: Selection;
}) {
    const [target, setTarget] = useState(targets[0]?.key || "none"), [filter, setFilter] = useState("all");
    const active = targets.find((m) => m.key === target);
    const filtered = active && filter !== "all" ? rows.filter((r) => !isUpdating(active.key, selection.mode, r.period || selection.value) && passes(r.values[active.key], active) === (filter === "pass")) : rows;
    return <Analysis selection={selection} title={title} description={`${selectionLabel(selection)} · ${selection.range ? "所选范围" : "截至所选周期"}，${rows.length}个周期；未成熟数据不计入达标筛选。`} action={<TargetFilter metrics={targets} target={target} filter={filter} onTarget={setTarget} onFilter={setFilter}/>} option={comboOption(filtered, series, active, Boolean(selection.range), !selection.range)}/>;
}
export function OperationalTab({ view, selection: initial }: {
    view: "capacity" | "efficiency" | "timeliness" | "quality";
    selection: Selection;
}) {
    const [selection, setSelection] = useState(initial), [detail, setDetail] = useState<Metric>(), [assessment, setAssessment] = useState<Metric>(), [raw, setRaw] = useState("off"), [trendHours, setTrendHours] = useState("total"), [pieHours, setPieHours] = useState("total"), [anchor, setAnchor] = useState("0");
    const records = recordsFor(selection), values = aggregate(records), rows = periodRows(selection);
    const summary: RecordRow = { id: "summary", label: "总汇总", period: selection.range?.end || selection.value, values: aggregate(recordsFor(selection, true)) };
    const selectedMetrics = view === "capacity" ? capacityMetrics : view === "efficiency" ? efficiencyMetrics : timelinessMetrics;
    return <div className="flex flex-col gap-4"><Card><CardHeader><CardTitle>{({ capacity: "产能", efficiency: "人效", timeliness: "时效", quality: "质量" })[view]}分析</CardTitle><CardDescription>{MOCK_NOTICE}</CardDescription></CardHeader><CardContent><CockpitTimeFilter selection={selection} onChange={setSelection}/></CardContent></Card>
    {view !== "quality" ? <Kpis metrics={selectedMetrics} values={values} selection={selection} onDetail={setDetail} onExclusion={view === "timeliness" ? setAssessment : undefined}/> : null}
    {view === "capacity" ? <><FilteredTrend title="领件趋势" rows={rows} series={capacityColumns.slice(0, 5).map((m) => ({ metric: m, type: m.unit === "%" ? "line" : "bar" }))} targets={[capacityMetrics[0]]} selection={selection}/><Analysis selection={selection} title="派送构成趋势" option={comboOption(rows, [metric("delivered", "妥投量"), metric("exception", "派送异常量")].map((m) => ({ metric: m, type: "bar", stack: "total" })), undefined, Boolean(selection.range), !selection.range)}/><Distribution records={records} selection={selection}/><MetricTable metrics={capacityColumns} rows={rows} summary={summary} selection={selection}/></> : null}
    {view === "efficiency" ? <><Analysis selection={selection} title="PPH趋势" option={comboOption(rows, [{ metric: efficiencyMetrics[0], type: "bar" }, { metric: { ...efficiencyMetrics[1], unit: "件/小时" } }], undefined, Boolean(selection.range), !selection.range)}/><div className="grid gap-4 xl:grid-cols-2"><Analysis selection={selection} title="工时趋势" action={<Choices value={trendHours} onChange={setTrendHours} options={[["total", "总时长"], ["average", "人均时长"]]} label="工时趋势口径"/>} option={comboOption(rows, efficiencyColumns.slice(2, 5).map((m) => ({ metric: { ...m, key: trendHours === "total" ? m.key : `avg${m.key}` } })), undefined, Boolean(selection.range), !selection.range)}/><Analysis selection={selection} title="工时结构" description={`派件司机 ${values.drivers} 人；工作时长为分拣、首单、派件时长合计。`} action={<Choices value={pieHours} onChange={setPieHours} options={[["total", "总时长"], ["average", "人均时长"]]} label="工时结构口径"/>} option={donutOption(efficiencyColumns.slice(2, 5).map((m) => ({ name: m.label, value: values[pieHours === "total" ? m.key : `avg${m.key}`] })), "min")}/></div><MetricTable metrics={efficiencyColumns} rows={rows} summary={summary} selection={selection}/></> : null}
    {view === "timeliness" ? <><FilteredTrend title="时效趋势" rows={rows} series={[{ metric: timelinessMetrics[0] }, { metric: metric("raw2400", "2400妥投率（原始值）", "%"), hidden: true }, { metric: timelinessMetrics[1] }, { metric: metric("raw4800", "4800妥投率（原始值）", "%"), hidden: true }, { metric: timelinessMetrics[2] }]} targets={timelinessMetrics.slice(0, 3)} selection={selection}/><Tabs defaultValue="data"><TabsList variant="line"><TabsTrigger value="data">数据明细</TabsTrigger><TabsTrigger value="reason">剔除原因汇总</TabsTrigger><TabsTrigger value="waybill">剔除运单明细</TabsTrigger></TabsList><TabsContent value="data" className="flex flex-col gap-4"><Choices value={raw} onChange={setRaw} options={[["off", "仅考核值"], ["on", "对比原始值"]]} label="数据明细口径"/><MetricTable metrics={timelinessColumns} rows={rows} summary={summary} selection={selection} rawCompare={raw === "on"}/></TabsContent><ExclusionTables selection={selection} embedded/></Tabs></> : null}
    {view === "quality" ? <><Choices value={anchor} onChange={(v) => { setAnchor(v); document.getElementById(`quality-section-${v}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} options={qualityGroups.map((g, i) => [String(i), g.title])} label="质量分析章节"/>{qualityGroups.map((g, i) => <section key={g.title} id={`quality-section-${i}`} className="flex scroll-mt-20 flex-col gap-4"><h2 className="text-lg font-medium">{g.title}</h2><Kpis metrics={g.metrics} values={values} selection={selection} onDetail={setDetail}/>{i < 2 ? <FilteredTrend title={`${g.title}趋势`} rows={rows} series={(i === 0 ? [g.metrics[3], g.metrics[0], g.metrics[1]] : g.metrics).map((m) => ({ metric: m, type: m.unit === "%" ? "line" : "bar" }))} targets={g.metrics.filter((m) => m.target !== undefined)} selection={selection}/> : <><Analysis selection={selection} title="客诉趋势" option={comboOption(rows, g.metrics.map((m) => ({ metric: m, type: m.unit === "%" ? "line" : "bar" })), undefined, Boolean(selection.range), !selection.range)}/><Distribution records={records} selection={selection} complaint/></>}</section>)}<MetricTable metrics={qualityColumns} rows={rows} summary={summary} selection={selection} quality/></> : null}
    {detail ? <MetricDetail key={detail.key} type={detail} selection={selection} onClose={() => setDetail(undefined)}/> : null}{assessment ? <AssessmentDetail type={assessment} selection={selection} onClose={() => setAssessment(undefined)}/> : null}
  </div>;
}
export function OverviewOperations({ onNavigate }: {
    onNavigate: (view: CockpitView, selection?: Selection) => void;
}) {
    const [selection, setSelection] = useState(defaultSelection()), [filter, setFilter] = useState("all"), [scope, setScope] = useState("assessment"), [detail, setDetail] = useState<Metric>();
    const values = aggregate(recordsFor(selection)), previous = aggregate(recordsFor({ ...selection, value: shiftPeriod(selection.mode, selection.value, -1) })), week = selection.mode === "day" ? aggregate(recordsFor({ mode: "day", value: shiftPeriod("day", selection.value, -7) })) : undefined;
    const sections: {
        title: string;
        view: CockpitView;
        metrics: Metric[];
    }[] = [{ title: "产能", view: "capacity", metrics: capacityMetrics }, { title: "人效", view: "efficiency", metrics: efficiencyMetrics.slice(1, 3) }, { title: "时效", view: "timeliness", metrics: timelinessMetrics.slice(0, 3) }, { title: "质量", view: "quality", metrics: [qualityGroups[0].metrics[0], qualityGroups[1].metrics[1], qualityGroups[0].metrics[1], qualityGroups[0].metrics[2], qualityGroups[1].metrics[0], ...qualityGroups[2].metrics.slice(0, 3)] }];
    const month = resolveReadyPeriod(selection.value.slice(0, 7), mockAvailability("driver"));
    return <><Card><CardHeader><CardTitle>运营指标</CardTitle><CardDescription>{MOCK_NOTICE}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><CockpitTimeFilter selection={selection} onChange={setSelection} allowRange={false}/><Choices value={filter} onChange={setFilter} options={[["all", "全部指标"], ["assessment", "仅考核指标"]]} label="指标筛选"/>{sections.filter((s) => filter === "all" || s.metrics.some((m) => m.assessment)).map((s) => <section key={s.view} className="flex flex-col gap-4 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">{s.title}</h3>{s.view === "timeliness" ? <div className="flex items-center gap-2">{filter === "all" ? <Choices value={scope} onChange={setScope} options={[["assessment", "考核口径"], ["raw", "原始口径"]]} label="时效口径"/> : <span className="text-xs text-muted-foreground">考核口径</span>}<MetricHelp /></div> : null}<Button variant="ghost" size="sm" onClick={() => onNavigate(s.view, selection)}>查看详情<ArrowRightIcon data-icon="inline-end"/></Button></div><Kpis metrics={s.metrics.filter((m) => filter === "all" || m.assessment)} values={values} selection={selection} onDetail={setDetail} comparison={{ previous, week }} raw={s.view === "timeliness" && filter !== "assessment" && scope === "raw"}/></section>)}</CardContent></Card><Card><CardHeader><CardTitle>司机表现</CardTitle><CardDescription>月度数据 · 每月5号计划更新 · {periodLabel("month", month)}</CardDescription><Button variant="ghost" size="sm" onClick={() => onNavigate("driver", { mode: "month", value: month })}>查看详情<ArrowRightIcon data-icon="inline-end"/></Button></CardHeader><CardContent className="flex flex-col gap-4">{month !== selection.value.slice(0, 7) ? <Alert><AlertDescription>所选周期所属月份尚未就绪，展示最近已就绪月份。</AlertDescription></Alert> : null}<Kpis metrics={driverSummaryMetrics} values={driverSummary(driverMonth(month))} selection={{ mode: "month", value: month }} comparison={{ previous: driverSummary(driverMonth(shiftPeriod("month", month, -1))) }}/></CardContent></Card>{detail ? <MetricDetail key={detail.key} type={detail} selection={selection} onClose={() => setDetail(undefined)}/> : null}</>;
}
