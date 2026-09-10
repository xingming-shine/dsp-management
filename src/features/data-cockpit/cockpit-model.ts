import { DEFAULT_TIME_ZONE, formatDate, formatDateRange, formatMonth } from "@/lib/date-time";
import type { PeriodMode, Perspective } from "./types";
// Presentation fixtures, NOT warehouse KPI/score definitions. All views derive from these records.
export const MOCK_NOTICE = "演示数据 · 指标口径及评分由数仓提供，当前仅展示模拟结果";
export type Selection = {
    mode: PeriodMode;
    value: string;
    range?: {
        start: string;
        end: string;
    };
};
export type Values = Record<string, number>;
export type RecordRow = {
    id: string;
    label: string;
    values: Values;
    children?: RecordRow[];
    period?: string;
};
export type Metric = {
    key: string;
    label: string;
    unit?: string;
    target?: number;
    lower?: boolean;
    assessment?: boolean;
    group?: string;
};
export const round = (n: number, digits = 2) => Number(n.toFixed(digits));
export const ratio = (a: number, b: number) => b ? a / b * 100 : 0;
export function hash(value: string) {
    let n = Array.from(value).reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
    n = Math.imul(n ^ n >>> 16, 2246822507);
    n = Math.imul(n ^ n >>> 13, 3266489909);
    return (n ^ n >>> 16) >>> 0;
}
export const iso = (date: Date) => date.toISOString().slice(0, 10);
export const dayDate = (day: string) => new Date(`${day.slice(0, 10)}T00:00:00Z`);
export const shiftDay = (day: string, n: number) => iso(new Date(dayDate(day).getTime() + n * 86400000));
export const shiftMonth = (month: string, n: number) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);
export function todayISO(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    return `${p.year}-${p.month}-${p.day}`;
}
export function weekOf(day: string) {
    const offset = (dayDate(day).getUTCDay() + 6) % 7;
    const start = shiftDay(day, -offset);
    return `${start}~${shiftDay(start, 6)}`;
}
export function weekNumber(day: string) {
    const date = dayDate(day);
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    return Math.ceil(((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}
export function periodLabel(mode: PeriodMode, value: string) {
    if (mode === "month")
        return formatMonth(value);
    if (mode === "week") {
        const [a, b] = value.split("~");
        return `W${weekNumber(a)}（${formatDateRange(a, b || shiftDay(a, 6))}）`;
    }
    return formatDate(value);
}
export function shiftPeriod(mode: PeriodMode, value: string, n: number) {
    return mode === "month" ? shiftMonth(value, n) : mode === "week" ? weekOf(shiftDay(value, n * 7)) : shiftDay(value, n);
}
export function defaultSelection(mode: PeriodMode = "day", today = todayISO()): Selection {
    return { mode, value: mode === "month" ? today.slice(0, 7) : mode === "week" ? weekOf(today) : today };
}
export function selectedPeriods(selection: Selection, trend = false) {
    const { mode, value, range } = selection;
    const end = range?.end || value;
    const start = range?.start || (trend ? shiftPeriod(mode, end, mode === "day" ? -29 : -11) : end);
    const result: string[] = [];
    for (let cursor = start; cursor <= end && result.length < 366; cursor = shiftPeriod(mode, cursor, 1))
        result.push(cursor);
    return result;
}
export function periodDays(mode: PeriodMode, value: string, today = todayISO()) {
    const start = mode === "month" ? `${value}-01` : value.slice(0, 10);
    const end = mode === "month" ? shiftDay(`${shiftMonth(value, 1)}-01`, -1) : mode === "week" ? value.split("~")[1] : value;
    const days: string[] = [];
    for (let day = start; day <= end && day <= today; day = shiftDay(day, 1))
        days.push(day);
    return days;
}
export function selectionLabel(s: Selection) {
    return s.range ? `${periodLabel(s.mode, s.range.start)} – ${periodLabel(s.mode, s.range.end)}` : `${periodLabel(s.mode, s.value)} 单${s.mode === "day" ? "日" : s.mode === "week" ? "周" : "月"}`;
}
export function validateSelection(mode: PeriodMode, start: string, end: string, today = todayISO()) {
    if (!start || !end)
        return "请选择完整的起止时间";
    if (!Number.isFinite(dayDate(mode === "month" ? `${start}-01` : start).getTime()) || !Number.isFinite(dayDate(mode === "month" ? `${end}-01` : end).getTime()))
        return "时间格式无效";
    if (end < start)
        return "结束时间不能早于开始时间";
    if (end > defaultSelection(mode, today).value)
        return "不能选择未来周期";
    const count = mode === "month" ? (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(end.slice(5, 7)) - Number(start.slice(5, 7)) + 1 : Math.round((dayDate(end).getTime() - dayDate(start).getTime()) / 86400000 / (mode === "week" ? 7 : 1)) + 1;
    const max = mode === "day" ? 31 : 12;
    return count > max ? `最多选择${max}${mode === "day" ? "天" : mode === "week" ? "周" : "个月"}，当前已选择${count}` : "";
}
export type Availability = {
    latestReadyPeriod: string;
    status: "ready" | "processing";
    scheduledDay: number;
};
// Backend adapter boundary: replace this fixture with the warehouse's latest ready period.
// The scheduled date is only a hint; consumers must use latestReadyPeriod, never date alone.
export function mockAvailability(kind: "driver" | "week" | "month", today = todayISO(), pending = false): Availability {
    const date = dayDate(today);
    if (kind === "week") {
        const ready = (date.getUTCDay() || 7) >= 3;
        return { latestReadyPeriod: shiftPeriod("week", weekOf(today), ready && !pending ? -1 : -2), status: pending ? "processing" : "ready", scheduledDay: 3 };
    }
    const scheduledDay = kind === "driver" ? 5 : 7;
    return { latestReadyPeriod: shiftMonth(today.slice(0, 7), date.getUTCDate() >= scheduledDay && !pending ? -1 : -2), status: pending ? "processing" : "ready", scheduledDay };
}
export function resolveReadyPeriod(requested: string, response: Availability) { return requested > response.latestReadyPeriod ? response.latestReadyPeriod : requested; }
export function isUpdating(key: string, mode: PeriodMode, value: string, today = todayISO()) {
    const days = key.includes("4800") ? 2 : /7200|72h|unfinished/.test(key) ? 3 : 0;
    if (!days)
        return false;
    const end = mode === "month" ? shiftDay(`${shiftMonth(value, 1)}-01`, -1) : mode === "week" ? value.split("~")[1] : value;
    return (dayDate(today).getTime() - dayDate(end).getTime()) / 86400000 < days;
}
export const mockDrivers = ["John Smith", "Mike Torres", "Lisa Kim", "David Lee", "Sarah Wang", "Anna Chen", "Tom Yang", "Jim Brown", "Eva Wilson", "Ray Zhang"].map((name, i) => ({ id: `DRV-${1001 + i}`, name, route: `A-${i % 4 + 1}`, postal: ["31405", "30318", "28208", "31406", "30309", "28212"][i % 6], tenure: `${i % 4 + 1}年${i * 3 % 12}月` }));
export const buckets = ["2400妥投", "4800妥投", "7200妥投", "final妥投", "其他时效"];
export const complaintTypes = ["轨迹断更", "签收未收到（疑似虚假签收）", "包裹破损缺件", "服务质量"];
export const exclusionReasons = ["道路封闭；极端天气", "平台系统故障", "收件方临时管制", "偏远区域临时封控", "恶劣天气二次影响", "场站设备异常", "临时交通管制"];
export type Daily = {
    date: string;
    driver: typeof mockDrivers[number];
    values: Values;
};
export function dailyRecord(date: string, driver: typeof mockDrivers[number]): Daily {
    const n = hash(`${date}/${driver.id}`);
    const expected = 100 + n % 61, picked = expected - n % 4, finalPicked = Math.min(expected, picked + 1);
    const should = finalPicked, unfinished = n % 3, completed72 = should - unfinished, final = Math.min(should, completed72 + 1);
    const delivered = final - 1, exception = should - delivered;
    const vol4800 = Math.max(0, Math.min(delivered, completed72 - (n % 3))), vol2400 = Math.max(0, vol4800 - (n % 8));
    const excluded = 1 + n % 3, excludedDelivered = Math.min(excluded - 1, vol2400);
    const sortMinutes = 70 + n % 31, firstMinutes = 90 + n % 41, deliveryMinutes = 240 + n % 121;
    const podChecked = should, podBad = 1 + n % 4, fake = n % 9 === 0 ? 1 : 0, suspected = n % 4 === 0 ? 1 : 0, broken = n % 7 === 0 ? 1 : 0;
    const complaint = n % 3, validComplaint = complaint && n % 2 ? 1 : 0, dnr = n % 6 === 0 ? 1 : 0;
    const values: Values = { expected, picked, finalPicked, should, delivered, exception, vol2400, vol4800, completed72, unfinished, final, excluded, excludedDelivered, sortMinutes, firstMinutes, deliveryMinutes, workMinutes: sortMinutes + firstMinutes + deliveryMinutes, podChecked, podBad, podGood: podChecked - podBad, fake, suspected, broken, dnr, complaint, validComplaint, driverDays: 1,
        bucket0: vol2400, bucket1: vol4800 - vol2400, bucket2: Math.max(0, delivered - vol4800 - 1), bucket3: delivered > vol4800 ? 1 : 0, bucket4: 0,
    };
    values.bucket4 = delivered - values.bucket0 - values.bucket1 - values.bucket2 - values.bucket3;
    for (let i = 0; i < 4; i++) {
        values[`complaint${i}`] = i === n % 4 ? complaint : 0;
        values[`validComplaint${i}`] = i === n % 4 ? validComplaint : 0;
    }
    return { date, driver, values };
}
export function recordsFor(s: Selection, trend = false, today = todayISO()): Daily[] {
    return selectedPeriods(s, trend).flatMap((period) => periodDays(s.mode, period, today).flatMap((day) => mockDrivers.map((driver) => dailyRecord(day, driver))));
}
export function aggregate(records: Daily[]): Values {
    const v: Values = Object.fromEntries(Object.keys(dailyRecord("2026-01-01", mockDrivers[0]).values).map((key) => [key, 0]));
    for (const record of records)
        for (const [key, value] of Object.entries(record.values))
            v[key] = (v[key] || 0) + value;
    const get = (key: string) => v[key] || 0;
    const drivers = new Set(records.map((r) => r.driver.id)).size;
    Object.assign(v, { drivers, pickupRate: ratio(get("picked"), get("expected")), finalPickupRate: ratio(get("finalPicked"), get("expected")), pph: get("deliveryMinutes") ? get("should") / (get("deliveryMinutes") / 60) : 0,
        assessedShould: get("should") - get("excluded"), assessed2400: get("vol2400") - get("excludedDelivered"), assessed4800: get("vol4800") - get("excludedDelivered"),
        raw2400: ratio(get("vol2400"), get("should")), raw4800: ratio(get("vol4800"), get("should")), rate7200: ratio(get("completed72"), get("should")),
        podRate: ratio(get("podGood"), get("podChecked")), fakeRate: ratio(get("fake"), get("should")), suspectedRate: ratio(get("suspected"), get("should")), breakRate: ratio(get("broken"), get("should")), dnrRate: ratio(get("dnr"), get("should")), complaintRate: ratio(get("complaint"), get("should")), validComplaintRate: ratio(get("validComplaint"), get("should")),
    });
    v.rate2400 = ratio(v.assessed2400, v.assessedShould);
    v.rate4800 = ratio(v.assessed4800, v.assessedShould);
    v.delta2400 = v.rate2400 - v.raw2400;
    v.delta4800 = v.rate4800 - v.raw4800;
    for (const key of ["sortMinutes", "firstMinutes", "deliveryMinutes", "workMinutes"]) {
        v[`avg${key}`] = drivers ? get(key) / drivers : 0;
        v[`daily${key}`] = get("driverDays") ? get(key) / get("driverDays") : 0;
    }
    return v;
}
export function periodRows(s: Selection, trend = true): RecordRow[] {
    return selectedPeriods(s, trend).map((period) => {
        const records = recordsFor({ mode: s.mode, value: period });
        return { id: period, label: periodLabel(s.mode, period), period, values: aggregate(records), children: mockDrivers.map((driver) => ({ id: `${period}/${driver.id}`, label: driver.name, period, values: aggregate(records.filter((r) => r.driver.id === driver.id)) })) };
    });
}
export function byPerspective(records: Daily[], perspective: Perspective): RecordRow[] {
    const groups = new Map<string, Daily[]>();
    for (const r of records) {
        const key = perspective === "driver" ? r.driver.name : r.driver[perspective];
        groups.set(key, [...(groups.get(key) || []), r]);
    }
    return Array.from(groups, ([label, group]) => ({ id: label, label, values: aggregate(group) }));
}
export function duration(minutes: number) { const n = Math.round(minutes); return `${Math.floor(n / 60)}小时${n % 60}分钟`; }
export function display(value: number | undefined, unit = "") {
    if (value === undefined || !Number.isFinite(value))
        return "—";
    return unit === "min" ? duration(value) : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: unit === "%" ? 3 : 2 }).format(round(value, unit === "%" ? 3 : 2))}${unit}`;
}
export function serializeCSV(headers: string[], rows: (string | number)[][]) {
    const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    return `\uFEFF${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
}
export const metric = (key: string, label: string, unit = "", target?: number, lower = false, assessment = target !== undefined): Metric => ({ key, label, unit, target, lower, assessment });
export const capacityMetrics = [metric("pickupRate", "领件率", "%", 98.5), metric("should", "派送总量"), metric("delivered", "妥投量")];
export const efficiencyMetrics = [metric("should", "派送总量"), metric("pph", "PPH"), metric("deliveryMinutes", "派件时长", "min"), metric("sortMinutes", "分拣时长", "min"), metric("firstMinutes", "首单时长", "min")];
export const timelinessMetrics = [metric("rate2400", "2400妥投率", "%", 96), metric("rate4800", "4800妥投率", "%", 98.5), metric("rate7200", "72H完结率", "%", 98.5), metric("unfinished", "72H未完结量")];
export const qualityGroups: {
    title: string;
    metrics: Metric[];
}[] = [
    { title: "诚信与妥投质量", metrics: [metric("fakeRate", "虚假签收率", "%", .1, true), metric("podRate", "POD合规率", "%"), metric("podBad", "POD不合规量"), metric("fake", "虚假签收量")] },
    { title: "安全", metrics: [metric("suspectedRate", "DSP疑似断更率", "%"), metric("breakRate", "DSP断更率", "%", .5, true), metric("suspected", "DSP疑似断更量"), metric("broken", "DSP断更量")] },
    { title: "客诉", metrics: [metric("dnrRate", "DNR率", "%"), metric("complaintRate", "客诉率", "%"), metric("validComplaintRate", "有效客诉率", "%"), metric("dnr", "DNR量"), metric("complaint", "客诉量"), metric("validComplaint", "有效客诉量")] },
];
export const capacityColumns = [metric("expected", "应领件量"), metric("picked", "当日领件量"), capacityMetrics[0], metric("finalPicked", "final领件量"), metric("finalPickupRate", "final领件率", "%"), ...capacityMetrics.slice(1), metric("exception", "派送异常量")];
export const efficiencyColumns = [efficiencyMetrics[0], efficiencyMetrics[1], ...["sortMinutes", "firstMinutes", "deliveryMinutes", "workMinutes"].map((key, i) => metric(key, ["分拣时长", "首单时长", "派件时长", "司机工作时长"][i], "min")), ...["sortMinutes", "firstMinutes", "deliveryMinutes", "workMinutes"].map((key, i) => metric(`avg${key}`, ["人均分拣时长", "人均首单时长", "人均派件时长", "人均工作时长"][i], "min"))];
export const timelinessColumns = [metric("assessedShould", "当期应派量"), metric("assessed2400", "2400妥投量"), timelinessMetrics[0], metric("assessed4800", "4800妥投量"), timelinessMetrics[1], metric("completed72", "72H完结量"), timelinessMetrics[3], timelinessMetrics[2], metric("final", "final完结量")];
export const rawKeys: Record<string, string> = { assessedShould: "should", assessed2400: "vol2400", assessed4800: "vol4800", rate2400: "raw2400", rate4800: "raw4800" };
export const qualityColumns = [metric("podChecked", "POD抽查量"), metric("podBad", "POD不合规量"), metric("podGood", "POD合规量"), metric("podRate", "POD合规率", "%"), ...["fake", "suspected", "broken", "dnr", "complaint", "validComplaint"].flatMap((key, i) => [metric(key, ["虚假签收量", "DSP疑似断更量", "DSP断更量", "DNR量", "客诉量", "有效客诉量"][i]), metric(["fakeRate", "suspectedRate", "breakRate", "dnrRate", "complaintRate", "validComplaintRate"][i], ["虚假签收率", "DSP疑似断更率", "DSP断更率", "DNR率", "客诉率", "有效客诉率"][i], "%")])];
export function passes(value: number, m: Metric) { return m.target === undefined || (m.lower ? value <= m.target : value >= m.target); }
export type Parcel = Record<string, string>;
export function parcelsFor(records: Daily[], key: string): Parcel[] {
    return records.flatMap((record) => Array.from({ length: record.values[key] || 0 }, (_, index) => ({
        waybill: `GF${record.date.replaceAll("-", "")}${record.driver.id.slice(-4)}${key.slice(0, 3)}${String(index + 1).padStart(3, "0")}`,
        driver: record.driver.name, status: key === "unfinished" ? "运输中" : "已妥投", route: record.driver.route, postal: record.driver.postal,
        pickupAt: `${record.date}T13:00:00Z`, signedAt: `${record.date}T21:00:00Z`, operation: key === "unfinished" ? "派送中" : "签收", operationAt: `${record.date}T21:00:00Z`, operator: record.driver.name, organization: "JAM-JJ",
        problem: ({ fake: "签收未收到", suspected: "轨迹疑似断更", broken: "轨迹断更" } as Record<string, string>)[key] || "待复核",
        ticket: `CS-${record.date}-${record.driver.id}-${index + 1}`, complaintAt: `${record.date}T22:00:00Z`, complaintType: complaintTypes[hash(`${record.date}/${record.driver.id}`) % 4], complaintSubtype: key === "validComplaint" ? "有效客诉" : "待核实",
    })));
}
export type Exclusion = {
    metric: string;
    reason: string;
    date: string;
    duplicate: number;
    waybill: string;
    status: string;
    route: string;
    postal: string;
    driver: string;
};
export function exclusionsFor(records: Daily[]): Exclusion[] {
    return records.flatMap((r) => ["2400", "4800"].flatMap((kind) => Array.from({ length: r.values.excluded }, (_, i) => {
        const reasons = [exclusionReasons[hash(r.date + r.driver.id) % 7]];
        if (i === 0)
            reasons.push(exclusionReasons[(hash(r.date + r.driver.id) + 1) % 7]);
        return { date: r.date, metric: kind, waybill: `EX${r.date.replaceAll("-", "")}${r.driver.id}-${i}`, reason: reasons.join(" / "), status: i < r.values.excludedDelivered ? "已妥投" : "运输中", route: r.driver.route, postal: r.driver.postal, driver: r.driver.name, duplicate: reasons.length - 1 };
    })));
}
