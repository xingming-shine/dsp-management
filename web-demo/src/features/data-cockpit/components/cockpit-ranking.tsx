"use client";
import { useState } from "react";
import type { EChartsOption } from "echarts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Analysis, Choices, DataGrid, comboOption, type GridColumn } from "./cockpit-widgets";
import { CockpitTimeFilter } from "./cockpit-time-filter";
import { ReadyNotice, useReadySelection } from "./ready-selection";
import { display, metric, MOCK_NOTICE, passes, periodLabel, todayISO } from "../cockpit-model";
import { rankAvailable, rankColumns, rankingRows, type ScoreRow } from "../score-model";
import type { RankMode } from "../types";
import { chartLegend } from "../chart-options";
import { renderChartTooltip } from "../chart-tooltip";
import { getDspScenario } from "../mocks";
export function CockpitRanking({ organizationId }: { organizationId: string }) {
    const scenario = getDspScenario(organizationId);
    const { selection, choose, notice, dismiss } = useReadySelection("month", "week");
    const [scope, setScope] = useState("station");
    const mode = selection.mode as RankMode, rows = rankingRows(mode, selection.value, organizationId), current = rows[0], previous = rows[1], available = rankAvailable(mode, current.id), previousAvailable = rankAvailable(mode, previous.id);
    const history = [...rows].reverse();
    const trend = comboOption(history, ["stationRank", "regionRank"].map((key, i) => ({ metric: metric(key, ["站点排名", "大区排名"][i], "名"), data: history.map((r) => rankAvailable(mode, r.id) ? r.values[key] : null) })));
    trend.yAxis = { type: "value", inverse: true, min: 1, minInterval: 1, name: "名次", nameGap: 12, axisLabel: { fontSize: 12, margin: 8 } };
    const policyIndex = history.findIndex((r) => rankAvailable(mode, r.id));
    if (policyIndex > 0 && Array.isArray(trend.series))
        trend.series = trend.series.map((s, i) => i === 0 ? { ...s, markLine: { silent: true, symbol: "none", data: [{ xAxis: policyIndex, label: { formatter: "考核调整", position: "insideEndTop", fontSize: 12 } }] } } : s) as EChartsOption["series"];
    const dimensions = [{ key: "timeliness", label: "时效", max: 50, parts: "2400妥投得分 + 4800妥投得分" }, { key: "quality", label: "质量", max: 45, parts: "断更得分 + 虚假签收得分" }, { key: "complaint", label: "客诉", max: 15, parts: "有效客诉得分" }, { key: "team", label: "团队表现", max: 50, parts: "高分司机得分 + 出勤得分" }];
    const leader = dimensions.map((d) => current.values[scope === "station" ? "stationRank" : "regionRank"] === 1 ? current.values[d.key] : Math.min(d.max, current.values[d.key] + (scope === "station" ? .08 : .12) * d.max));
    const radar: EChartsOption = { aria: { enabled: true }, tooltip: { trigger: "item", confine: true, formatter: (p) => { const item = (Array.isArray(p) ? p[0] : p) as {
                name?: string;
            }; const values = item.name === "当前DSP" ? dimensions.map((d) => current.values[d.key]) : leader; return renderChartTooltip({
                title: item.name || "",
                rows: dimensions.map((d, i) => ({
                    label: `${d.label}（${d.parts}）`,
                    value: `${display(values[i], "分")} / ${d.max}`,
                })),
            }); } }, legend: chartLegend("bottom", true), radar: { radius: "65%", indicator: dimensions.map((d) => ({ name: d.label, max: 100 })), axisName: { fontSize: 12 } }, series: [{ type: "radar", data: [{ name: "当前DSP", value: dimensions.map((d) => current.values[d.key] / d.max * 100) }, ...(available ? [{ name: scope === "station" ? "站点第一名" : "大区第一名", value: leader.map((v, i) => v / dimensions[i].max * 100) }] : [])] }] };
    const columns: GridColumn<ScoreRow>[] = rankColumns.map((m) => ({ key: m.key, label: m.label, group: m.group, numeric: m.key !== "period", value: (r) => {
            if (m.key.endsWith("Rank") && !rankAvailable(mode, r.id))
                return "—";
            if (r.text[m.key])
                return r.text[m.key];
            return <span className={m.target !== undefined && !passes(r.values[m.key], m) ? "text-destructive" : undefined}>{display(r.values[m.key], m.unit)}</span>;
        }, export: (r) => m.key.endsWith("Rank") && !rankAvailable(mode, r.id) ? "" : r.text[m.key] || display(r.values[m.key], m.unit) }));
    const exportColumns: GridColumn<ScoreRow>[] = [...columns, { key: "availability", label: "排名状态", value: (r) => r.text.availability }];
    return <div className="flex flex-col gap-4"><Card><CardHeader><CardTitle>DSP排名</CardTitle><CardDescription>每周三 / 每月7号计划更新，实际以数仓数据就绪状态为准。{MOCK_NOTICE}</CardDescription></CardHeader><CardContent><CockpitTimeFilter selection={selection} onChange={choose} modes={["week", "month"]} allowRange={false}/></CardContent></Card><ReadyNotice notice={notice} onClose={dismiss}/>
    <Alert><AlertDescription>考核调整：2026年7月起提供月排名，周排名从 W28（07/06/2026）起。更早周期保留指标及得分，排名不适用。2026年7月排名仅供参考。</AlertDescription></Alert>
    <div className="grid gap-4 sm:grid-cols-3">{["stationRank", "regionRank", "total"].map((key, i) => <Card key={key}><CardHeader><CardTitle>{["站点排名", "大区排名", "综合总分"][i]}</CardTitle><CardDescription>{periodLabel(mode, selection.value)}</CardDescription></CardHeader><CardContent className="flex flex-col gap-2"><p className="text-3xl tabular-nums">{key !== "total" && !available ? "—" : `${display(current.values[key])}${i < 2 ? i === 0 ? ` / ${scenario.stationDspCount}` : ` / ${scenario.regionDspCount}` : ""}`}</p>{key === "total" ? <Badge variant={current.values.total < 85 ? "destructive" : "success"}>{current.values.total < 85 ? "未达标" : "达标"}</Badge> : null}<p className="text-xs text-muted-foreground">{key !== "total" && (!available || !previousAvailable) ? "暂无可比排名" : `环比上${mode === "week" ? "周" : "月"} ${display(current.values[key] - previous.values[key])}`}</p>{i === 2 ? <p className="text-xs text-muted-foreground">派送难易度 {display(current.values.difficulty)} · 分数调整 {display(current.values.adjust, "分")}</p> : null}</CardContent></Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-2"><Analysis selection={selection} title="历史排名趋势" description="近12周期；名次越小排名越靠前。考核调整前的数据留空，不跨边界连线。" option={trend}/><Analysis selection={selection} title="维度得分对比" description="按50 / 45 / 15 / 50分上限归一化；悬停查看真实分数及组成。" option={radar} action={available ? <Choices value={scope} onChange={setScope} options={[["station", "站点第一名"], ["region", "大区第一名"]]} label="排名对照"/> : <Badge variant="secondary">考核调整前：仅展示当前DSP</Badge>}/></div><Analysis selection={selection} title="维度得分趋势" option={comboOption(history, dimensions.map((d) => ({ metric: metric(d.key, d.label, "分") })))} height="primary"/><DataGrid title="排名详细数据" description="总分含分数调整；权重和目标沿用原型，模拟分数并非正式计分公式。" columns={columns} exportColumns={exportColumns} rows={rows} rowKey={(r) => r.id} filename={`排名_${mode}_${selection.value}_${todayISO()}`}/></div>;
}
