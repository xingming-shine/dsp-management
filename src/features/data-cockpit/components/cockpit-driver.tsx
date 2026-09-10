"use client";
import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Analysis, DataGrid, Kpis, comboOption, type GridColumn, type ChartSeries } from "./cockpit-widgets";
import { CockpitTimeFilter } from "./cockpit-time-filter";
import { DetailShell } from "./cockpit-details";
import { ReadyNotice, useReadySelection } from "./ready-selection";
import { donutOption } from "./cockpit-operations";
import { display, metric, MOCK_NOTICE, mockAvailability, mockDrivers, periodLabel, selectedPeriods, selectionLabel, shiftMonth, type Metric, type Selection } from "../cockpit-model";
import { driverMonth, driverOverallColumns, driverScoreColumns, driverSummary, driverSummaryMetrics, type ScoreRow } from "../score-model";
const dimensions = [
    { key: "service", label: "服务分", max: 30, metrics: [metric("raw2400", "2400妥投率", "%"), metric("raw4800", "4800妥投率", "%"), metric("rate7200", "72H完结率", "%")] },
    { key: "quality", label: "质量分", max: 30, metrics: [metric("breakRate", "断更/丢失率", "%"), metric("fakeRate", "虚假签收率", "%"), metric("complaintRate", "司机客诉率", "%")] },
    { key: "efficiency", label: "效率分", max: 40, metrics: [metric("dailyVolume", "日均妥投量", "件"), metric("attendance", "出勤天数", "天")] },
];
function scoreColumns(metrics: Metric[]): GridColumn<ScoreRow>[] {
    return metrics.map((m) => ({ key: m.key, label: m.label, group: m.group, stickyLeft: m.key === "index" ? 0 : m.key === "name" && metrics[0]?.key === "index" ? 64 : undefined, width: m.key === "index" ? 64 : m.key === "name" ? 180 : undefined, numeric: !["month", "name", "tenure", "active"].includes(m.key), value: (r) => r.text[m.key] || display(r.values[m.key], m.unit), export: (r) => r.text[m.key] || display(r.values[m.key], m.unit) }));
}
function DimensionDetail({ dimension, rows, month, onClose }: {
    dimension: typeof dimensions[number];
    rows: ScoreRow[];
    month: string;
    onClose: () => void;
}) {
    const selection: Selection = { mode: "month", value: month };
    const sorted = [...rows].sort((a, b) => b.values[dimension.key] - a.values[dimension.key]);
    const scores = comboOption(sorted, [{ metric: metric(dimension.key, dimension.label, "分"), type: "bar" }]);
    scores.xAxis = { type: "value", max: dimension.max, name: "分" };
    scores.yAxis = { type: "category", inverse: true, data: sorted.map((r) => r.label), axisLabel: { fontSize: 12 } };
    return <DetailShell title={`${dimension.label}详情`} description={`${periodLabel("month", month)} · 满分${dimension.max}分 · ${MOCK_NOTICE}`} onClose={onClose}><Tabs defaultValue="score"><TabsList variant="line"><TabsTrigger value="score">分数趋势</TabsTrigger><TabsTrigger value="details">详情趋势</TabsTrigger></TabsList><TabsContent value="score"><Analysis selection={selection} title={`${dimension.label} · 司机分数对比`} description="此图比较所选月的司机得分，不是跨月趋势。" option={scores}/></TabsContent><TabsContent value="details"><Analysis selection={selection} title={`${dimension.label} · 原始指标对比`} option={comboOption(sorted, dimension.metrics.map((m) => ({ metric: m, type: dimension.key === "efficiency" ? "bar" : "line" })))}/></TabsContent></Tabs><DataGrid title="维度详情" columns={scoreColumns([metric("name", "司机"), metric(dimension.key, dimension.label, "分"), metric(`${dimension.key}Level`, "等级"), ...dimension.metrics])} rows={sorted} rowKey={(r) => r.id} filename={`${dimension.label}_${month}`}/></DetailShell>;
}
function DriverHistory({ initial, onClose }: {
    initial: ScoreRow;
    onClose: () => void;
}) {
    const [query, setQuery] = useState(initial.label), [search, setSearch] = useState(initial.label);
    const { selection, choose, notice, dismiss } = useReadySelection("driver");
    const lookup = search.trim().toLowerCase();
    const driver = mockDrivers.find((d) => d.id.toLowerCase() === lookup || d.name.toLowerCase() === lookup) || (lookup ? mockDrivers.find((d) => d.id.toLowerCase().includes(lookup) || d.name.toLowerCase().includes(lookup)) : undefined);
    const latestMonth = mockAvailability("driver").latestReadyPeriod;
    const latest = useMemo(() => driver ? driverMonth(latestMonth).find((r) => r.id === driver.id) : undefined, [driver, latestMonth]);
    const rows = useMemo(() => driver ? selectedPeriods(selection, true).map((month) => { const r = driverMonth(month).find((row) => row.id === driver.id)!; return { ...r, id: `${r.id}/${month}`, label: `${periodLabel("month", month)} · ${r.values.star}★`, text: { ...r.text, month: periodLabel("month", month) } }; }) : [], [driver, selection]);
    const historyColumns = (metrics: Metric[]) => scoreColumns([metric("month", "月份"), ...metrics.filter((m) => !["index", "name", "tenure"].includes(m.key))]);
    const overall = comboOption(rows, [{ metric: metric("total", "总分", "分") }, { metric: metric("dspRank", "DSP排名", "名") }, { metric: metric("stationRank", "全站点排名", "名") }]);
    overall.yAxis = [{ type: "value", name: "分", min: 0, max: 100 }, { type: "value", name: "名次", inverse: true, min: 1, minInterval: 1, splitLine: { show: false } }];
    return <DetailShell title="司机历史表现" description="单月表示截至该月近12个月；自定义范围含首尾最多12个月。" onClose={onClose}><form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(query); }}><Field><FieldLabel htmlFor="history-driver-query">司机姓名 / ID</FieldLabel><Input id="history-driver-query" value={query} onChange={(e) => { setQuery(e.target.value); if (!e.target.value.trim())
        setSearch(""); }} placeholder="输入姓名或DRV-1001"/></Field><Button type="submit"><SearchIcon data-icon="inline-start"/>查询</Button></form>
    {!latest ? <Empty><EmptyHeader><EmptyTitle>{lookup ? "未找到司机" : "请输入司机姓名或ID"}</EmptyTitle><EmptyDescription>支持大小写不敏感、精确匹配优先和模糊查找。</EmptyDescription></EmptyHeader></Empty> : <><Card><CardHeader><CardTitle>{latest.label}</CardTitle><CardDescription>最新可用概况 · {periodLabel("month", latestMonth)}，不随下方历史选期变化。</CardDescription></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-3">{[["在职时长", latest.text.tenure], ["最近派件月", periodLabel("month", latestMonth)], ["活跃", latest.text.active], ["星级", `${latest.values.star}★`], ["总分", display(latest.values.total, "分")], ["DSP排名", latest.text.dspRank], ["日均妥投", display(latest.values.dailyVolume, "件")], ["出勤", display(latest.values.attendance, "天")]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm tabular-nums">{value}</dd></div>)}</dl></CardContent></Card><CockpitTimeFilter selection={selection} onChange={choose} modes={["month"]}/><ReadyNotice notice={notice} onClose={dismiss}/><Analysis selection={selection} title="综合历史趋势" option={overall}/><Analysis selection={selection} title="多维度历史趋势" option={comboOption(rows, [...dimensions.map((d): ChartSeries => ({ metric: metric(d.key, d.label, "分"), type: "bar", stack: "score" })), { metric: metric("redline", "红线行为量", "次") }])}/><Tabs defaultValue="service"><TabsList variant="line">{dimensions.map((d) => <TabsTrigger key={d.key} value={d.key}>{d.label.replace("分", "")}</TabsTrigger>)}</TabsList>{dimensions.map((d) => <TabsContent key={d.key} value={d.key}><Analysis selection={selection} title={`${d.label}详情趋势`} option={comboOption(rows, d.metrics.map((m) => ({ metric: m, type: d.key === "efficiency" ? "bar" : "line" })))}/></TabsContent>)}</Tabs><Tabs defaultValue="overall"><TabsList variant="line"><TabsTrigger value="overall">综合表现</TabsTrigger><TabsTrigger value="score">分数明细</TabsTrigger></TabsList><TabsContent value="overall"><DataGrid key={`overall/${driver?.id}/${selectionLabel(selection)}`} title="历史综合表现" columns={historyColumns(driverOverallColumns)} rows={[...rows].reverse()} rowKey={(r) => r.id} filename={`${driver?.name}_历史综合_${selectionLabel(selection)}`}/></TabsContent><TabsContent value="score"><DataGrid key={`score/${driver?.id}/${selectionLabel(selection)}`} title="历史分数明细" columns={historyColumns(driverScoreColumns)} rows={[...rows].reverse()} rowKey={(r) => r.id} filename={`${driver?.name}_历史评分_${selectionLabel(selection)}`}/></TabsContent></Tabs></>}
  </DetailShell>;
}
export function CockpitDriver({ initial }: {
    initial?: Selection;
}) {
    const { selection, choose, notice, dismiss } = useReadySelection("driver", "month", initial);
    const [dimension, setDimension] = useState<typeof dimensions[number]>(), [history, setHistory] = useState<ScoreRow>();
    const month = selection.value, rows = useMemo(() => driverMonth(month), [month]), summary = driverSummary(rows);
    const trend = useMemo(() => Array.from({ length: 12 }, (_, i) => { const m = shiftMonth(month, i - 11); return { id: m, label: periodLabel("month", m), values: driverSummary(driverMonth(m)) }; }), [month]);
    function columns(metrics: Metric[]): GridColumn<ScoreRow>[] { return [...scoreColumns(metrics), { key: "history", label: "操作", action: true, value: (r) => <Button variant="ghost" size="sm" onClick={() => setHistory(r)}>司机历史表现</Button> }]; }
    return <div className="flex flex-col gap-4"><Card><CardHeader><CardTitle>司机表现</CardTitle><CardDescription>月度数据 · 每月5号计划更新，实际以数仓返回为准。{MOCK_NOTICE}</CardDescription></CardHeader><CardContent><CockpitTimeFilter selection={selection} onChange={choose} modes={["month"]} allowRange={false}/></CardContent></Card><ReadyNotice notice={notice} onClose={dismiss}/><Kpis metrics={driverSummaryMetrics} values={summary} selection={selection}/>
    <div className="grid gap-4 xl:grid-cols-4"><Analysis selection={selection} title="司机星级分布" option={donutOption(Array.from({ length: 5 }, (_, i) => ({ name: `${i + 1}星`, value: rows.filter((r) => r.values.star === i + 1).length })), "人")}/>{dimensions.map((d) => <Card key={d.key}><CardHeader><CardTitle>{d.label} Top5</CardTitle><CardDescription>满分{d.max}分</CardDescription><Button variant="ghost" size="sm" onClick={() => setDimension(d)}>查看详情</Button></CardHeader><CardContent><ol className="flex flex-col gap-4">{[...rows].sort((a, b) => b.values[d.key] - a.values[d.key]).slice(0, 5).map((r, i) => <li key={r.id}><Button variant="ghost" className="h-auto w-full justify-between gap-2 whitespace-normal px-0 py-2" onClick={() => setDimension(d)}><span>{i + 1}. {r.label}</span><span className="flex flex-col items-end gap-1"><span className="tabular-nums">{display(r.values[d.key], "分")}</span><Badge variant="secondary">{r.text[`${d.key}Level`]}</Badge></span></Button></li>)}</ol></CardContent></Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-2"><Analysis selection={selection} title="司机人数趋势" option={comboOption(trend, driverSummaryMetrics.slice(0, 2).map((m) => ({ metric: m })))}/><Analysis selection={selection} title="平均星级 / 平均分趋势" option={comboOption(trend, driverSummaryMetrics.slice(2).map((m) => ({ metric: m })))}/></div><Tabs defaultValue="overall"><TabsList variant="line"><TabsTrigger value="overall">综合表现</TabsTrigger><TabsTrigger value="score">分数明细</TabsTrigger></TabsList><TabsContent value="overall"><DataGrid key={`overall/${month}`} title="司机综合表现" columns={columns(driverOverallColumns)} rows={rows} rowKey={(r) => r.id} filename={`司机综合表现_${month}`}/></TabsContent><TabsContent value="score"><DataGrid key={`score/${month}`} title="司机分数明细" description="服务/质量：优秀≥28.5、良好≥27、一般≥21、关注≥15；效率：优秀≥38、良好≥36、一般≥28、关注≥20，其余重点关注。" columns={columns(driverScoreColumns)} rows={rows} rowKey={(r) => r.id} filename={`司机评分_${month}`}/></TabsContent></Tabs>{dimension ? <DimensionDetail dimension={dimension} rows={rows} month={month} onClose={() => setDimension(undefined)}/> : null}{history ? <DriverHistory initial={history} onClose={() => setHistory(undefined)}/> : null}</div>;
}
