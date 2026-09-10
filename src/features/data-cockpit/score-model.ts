import { aggregate, defaultSelection, hash, metric, mockDrivers, periodLabel, recordsFor, round, shiftPeriod, type Metric, type RecordRow, type Values } from "./cockpit-model";
import type { RankMode } from "./types";
export type ScoreRow = RecordRow & {
    text: Record<string, string>;
};
export const driverScoreColumns: Metric[] = [
    ...[metric("index", "序号"), metric("name", "司机"), metric("tenure", "在职时长"), metric("active", "是否活跃"), metric("star", "星级", "★"), metric("total", "总分", "分"), metric("redline", "红线行为量")].map((m) => ({ ...m, group: "基本信息" })),
    ...[metric("picked", "领件量"), metric("vol2400", "2400妥投量"), metric("raw2400", "2400妥投率", "%"), metric("score2400", "2400得分（15分）", "分"), metric("vol4800", "4800妥投量"), metric("raw4800", "4800妥投率", "%"), metric("score4800", "4800得分（10分）", "分"), metric("completed72", "72H完结量"), metric("rate7200", "72H完结率", "%"), metric("score72", "72H得分（5分）", "分"), metric("service", "服务分合计（30分）", "分"), metric("serviceLevel", "服务等级")].map((m) => ({ ...m, group: "服务分" })),
    ...[metric("broken", "断更/丢失量"), metric("breakRate", "断更/丢失率", "%"), metric("scoreBreak", "断更/丢失得分（10分）", "分"), metric("fake", "虚假签收量"), metric("fakeRate", "虚假签收率", "%"), metric("scoreFake", "虚假签收得分（10分）", "分"), metric("complaint", "司机客诉量"), metric("complaintRate", "司机客诉率", "%"), metric("scoreComplaint", "司机客诉得分（10分）", "分"), metric("quality", "质量分合计（30分）", "分"), metric("qualityLevel", "质量等级")].map((m) => ({ ...m, group: "质量分" })),
    ...[metric("dailyVolume", "日均妥投量"), metric("scoreVolume", "日均妥投得分（20分）", "分"), metric("attendance", "出勤天数", "天"), metric("scoreAttendance", "出勤得分（20分）", "分"), metric("efficiency", "效率分合计（40分）", "分"), metric("efficiencyLevel", "效率等级")].map((m) => ({ ...m, group: "效率分" })),
    ...[metric("dspRank", "DSP排名"), metric("stationRank", "全站点排名")].map((m) => ({ ...m, group: "排名" })),
];
export const driverOverallColumns = ["index", "name", "tenure", "active", "star", "total", "service", "serviceLevel", "quality", "qualityLevel", "efficiency", "efficiencyLevel", "redline", "dspRank", "stationRank"].map((key) => driverScoreColumns.find((m) => m.key === key)!);
export function driverLevel(score: number, max: number) {
    const thresholds = max === 40 ? [38, 36, 28, 20] : [28.5, 27, 21, 15];
    return ["优秀", "良好", "一般", "关注"][thresholds.findIndex((n) => score >= n)] || "重点关注";
}
export function driverMonth(month: string): ScoreRow[] {
    const data = recordsFor({ mode: "month", value: month });
    const rows = mockDrivers.map((driver, i) => {
        const v = aggregate(data.filter((r) => r.driver.id === driver.id)), n = hash(month + driver.id);
        const component = (max: number, seed: number) => round(max * (.55 + (seed % 45) / 100), 1);
        Object.assign(v, { score2400: component(15, n), score4800: component(10, n >>> 1), score72: component(5, n >>> 2), scoreBreak: component(10, n >>> 3), scoreFake: component(10, n >>> 4), scoreComplaint: component(10, n >>> 5), scoreVolume: component(20, n >>> 6), scoreAttendance: component(20, n >>> 7), attendance: v.driverDays, dailyVolume: v.driverDays ? round(v.delivered / v.driverDays) : 0, redline: n % 4, index: i + 1 });
        v.service = round(v.score2400 + v.score4800 + v.score72, 1);
        v.quality = round(v.scoreBreak + v.scoreFake + v.scoreComplaint, 1);
        v.efficiency = round(v.scoreVolume + v.scoreAttendance, 1);
        v.total = round(v.service + v.quality + v.efficiency, 1);
        v.star = v.total >= 90 ? 5 : v.total >= 80 ? 4 : v.total >= 70 ? 3 : v.total >= 60 ? 2 : 1;
        return { id: driver.id, label: driver.name, period: month, values: v, text: { name: driver.name, tenure: driver.tenure, active: i < 8 ? "是" : "否", serviceLevel: driverLevel(v.service, 30), qualityLevel: driverLevel(v.quality, 30), efficiencyLevel: driverLevel(v.efficiency, 40), month } };
    }).sort((a, b) => b.values.total - a.values.total);
    return rows.map((r, i) => ({ ...r, values: { ...r.values, index: i + 1, dspRank: i + 1, stationRank: (i + 1) * 3 }, text: { ...r.text, dspRank: `${i + 1}/${rows.length}`, stationRank: `${(i + 1) * 3}/87` } }));
}
export function driverSummary(rows: ScoreRow[]): Values {
    return { drivers: rows.length, active: rows.filter((r) => r.text.active === "是").length, star: rows.length ? round(rows.reduce((s, r) => s + r.values.star, 0) / rows.length, 1) : 0, total: rows.length ? round(rows.reduce((s, r) => s + r.values.total, 0) / rows.length, 1) : 0 };
}
export const driverSummaryMetrics = [metric("drivers", "派件司机人数", "人"), metric("active", "活跃司机人数", "人"), metric("star", "派件司机平均星级", "★"), metric("total", "派件司机平均分数", "分")];
export const rankInputs = [metric("pod2400", "2400妥投率", "%", 97), metric("pod4800", "4800妥投率", "%", 98), metric("breakRate", "断更率", "%", .04, true), metric("fakeSignRate", "虚假签收率", "%", .05, true), metric("complaintRate", "有效客诉率", "%", .1, true), metric("starDriverPct", "高分司机占比", "%", 70), metric("starDriverRet", "3/4/5星司机出勤率", "%", 70)];
export const rankWeights = [.25, .1, .15, .15, .1, .1, .15];
export const rankGroups = ["时效", "时效", "质量", "质量", "客诉", "团队表现", "团队表现"];
export const rankColumns: Metric[] = [metric("period", "日期"), metric("difficulty", "派送难易度"), ...rankInputs.flatMap((m, i) => [{ ...m, group: rankGroups[i], label: `${m.label}（权重${rankWeights[i]} / ${m.lower ? "≤" : "≥"}${m.target}%）` }, { ...metric(`${m.key}Score`, `${m.label}得分`, "分"), group: rankGroups[i] }]), metric("adjust", "分数调整", "分"), metric("total", "总分（＜85不达标）", "分", 85), metric("stationRank", "站点排名"), metric("regionRank", "大区排名")];
export function rankAvailable(mode: RankMode, period: string) { return mode === "week" ? period.slice(0, 10) >= "2026-07-06" : period >= "2026-07"; }
export function rankingRows(mode: RankMode, value = defaultSelection(mode).value): ScoreRow[] {
    return Array.from({ length: 12 }, (_, i) => {
        const period = shiftPeriod(mode, value, -i), n = hash(period), values: Values = { difficulty: round(1 + (n % 15) / 100, 3), pod2400: 94 + n % 500 / 100, pod4800: 97 + n % 270 / 100, breakRate: (n % 8) / 100, fakeSignRate: (n % 9) / 100, complaintRate: (n % 16) / 100, starDriverPct: 60 + n % 30, starDriverRet: 60 + (n >>> 1) % 35, adjust: n % 5 - 2, stationRank: 1 + n % 12, regionRank: 1 + n % 18 };
        // Scores are supplied fixture fields, deliberately not presented as a production formula.
        const maxima = [35, 15, 22.5, 22.5, 15, 20, 30];
        rankInputs.forEach((m, j) => { values[`${m.key}Score`] = round(maxima[j] * (.35 + ((n >>> j) % 65) / 100), 1); });
        values.total = round(rankInputs.reduce((s, m) => s + values[`${m.key}Score`], values.adjust), 1);
        values.timeliness = values.pod2400Score + values.pod4800Score;
        values.quality = values.breakRateScore + values.fakeSignRateScore;
        values.complaint = values.complaintRateScore;
        values.team = values.starDriverPctScore + values.starDriverRetScore;
        return { id: period, label: periodLabel(mode, period), period, values, text: { period: periodLabel(mode, period), availability: rankAvailable(mode, period) ? "可用" : "考核调整前暂无排名" } };
    });
}
