"use client";
import { useId, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Choices, Pick } from "./cockpit-widgets";
import { defaultSelection, dayDate, periodLabel, selectionLabel, shiftDay, shiftMonth, shiftPeriod, todayISO, validateSelection, weekOf, weekNumber, type Selection } from "../cockpit-model";
import { formatDate, formatMonth } from "@/lib/date-time";
import { cn } from "@/lib/utils";
export function CockpitTimeFilter({ selection, onChange, allowRange = true, modes = ["day", "week", "month"] }: {
    selection: Selection;
    onChange: (s: Selection) => void;
    allowRange?: boolean;
    modes?: Selection["mode"][];
}) {
    const [open, setOpen] = useState(false), [draft, setDraft] = useState(selection), [rangeMode, setRangeMode] = useState(Boolean(selection.range)), [cursor, setCursor] = useState(selection.value.slice(0, 7)), [anchor, setAnchor] = useState<string>(), [hover, setHover] = useState<string>();
    const id = useId(), today = todayISO(), mode = selection.mode;
    const start = draft.range?.start || draft.value, end = draft.range?.end || draft.value;
    const error = anchor ? "请选择结束周期" : validateSelection(mode, start, end);
    const setValue = (v: string, edge: "start" | "end") => setDraft((d) => rangeMode ? { ...d, range: { start: edge === "start" ? v : d.range?.start || d.value, end: edge === "end" ? v : d.range?.end || d.value } } : { ...d, value: v, range: undefined });
    const options = Array.from({ length: mode === "week" ? 104 : 24 }, (_, i) => { const value = shiftPeriod(mode, defaultSelection(mode).value, -i); return { value, label: periodLabel(mode, value) }; });
    const choose = (v: string) => {
        if (!rangeMode) {
            setDraft({ mode, value: v });
            return;
        }
        if (!anchor) {
            setAnchor(v);
            setDraft({ mode, value: v, range: { start: v, end: v } });
        }
        else {
            setDraft({ mode, value: v, range: { start: v < anchor ? v : anchor, end: v < anchor ? anchor : v } });
            setAnchor(undefined);
            setHover(undefined);
        }
    };
    const previewStart = anchor && hover ? anchor < hover ? anchor : hover : start;
    const previewEnd = anchor && hover ? anchor < hover ? hover : anchor : end;
    function calendarKeys(event: React.KeyboardEvent<HTMLDivElement>, columns: number) {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (["PageUp", "PageDown"].includes(event.key)) {
            event.preventDefault();
            setCursor(shiftMonth(cursor, (event.key === "PageUp" ? -1 : 1) * (mode === "month" ? 12 : 1)));
            const container = event.currentTarget;
            requestAnimationFrame(() => container.querySelectorAll<HTMLButtonElement>("button")[Math.max(0, index)]?.focus());
            return;
        }
        const move = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns, Home: columns === 1 ? -index : -(index % columns), End: columns === 1 ? buttons.length - 1 - index : columns - 1 - (index % columns) } as Record<string, number>)[event.key];
        if (move !== undefined) {
            event.preventDefault();
            const target = buttons[Math.max(0, Math.min(buttons.length - 1, index + move))];
            if (target && !target.disabled)
                target.focus();
        }
    }
    function calendar(month: string) {
        if (mode === "month") {
            const year = month.slice(0, 4);
            return <div className="grid grid-cols-3 gap-1" onKeyDown={(e) => calendarKeys(e, 3)}>{Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`).map((v) => <Button key={v} variant="ghost" size="sm" className={cn(v >= previewStart && v <= previewEnd && "bg-brand-selected")} onMouseEnter={() => anchor && setHover(v)} onFocus={() => anchor && setHover(v)} disabled={v > today.slice(0, 7)} aria-pressed={v >= start && v <= end} onClick={() => choose(v)}>{formatMonth(v)}</Button>)}</div>;
        }
        const first = `${month}-01`, offset = (dayDate(first).getUTCDay() + 6) % 7;
        const days = Array.from({ length: 42 }, (_, i) => shiftDay(first, i - offset));
        if (mode === "week")
            return <div className="flex flex-col gap-1" onKeyDown={(e) => calendarKeys(e, 1)}><div className="grid grid-cols-8 gap-1 text-center text-xs text-muted-foreground">{["周", "一", "二", "三", "四", "五", "六", "日"].map((d) => <span key={d}>{d}</span>)}</div>{Array.from({ length: 6 }, (_, i) => {
                    const row = days.slice(i * 7, i * 7 + 7), value = weekOf(row[0]), selected = value >= previewStart && value <= previewEnd;
                    return <Button key={value} variant="ghost" className={cn("grid h-9 grid-cols-8 gap-1 px-1", selected && "bg-brand-selected")} disabled={value > defaultSelection("week").value} aria-label={periodLabel("week", value)} aria-pressed={selected} onClick={() => choose(value)} onMouseEnter={() => anchor && setHover(value)} onFocus={() => anchor && setHover(value)}><span className="text-xs">W{weekNumber(row[0])}</span>{row.map((d) => <span key={d} className={cn("text-xs", d.slice(0, 7) !== month && "text-muted-foreground")}>{dayDate(d).getUTCDate()}</span>)}</Button>;
                })}</div>;
        return <div className="grid grid-cols-7 gap-1" onKeyDown={(e) => calendarKeys(e, 7)}>
      {["一", "二", "三", "四", "五", "六", "日"].map((d) => <span key={d} className="text-center text-xs text-muted-foreground">{d}</span>)}
      {days.map((d) => { const value = d; const selected = value >= previewStart && value <= previewEnd; return <Button key={d} variant="ghost" size="icon-sm" className={cn(selected && "bg-brand-selected", d.slice(0, 7) !== month && "text-muted-foreground")} disabled={value > defaultSelection(mode).value} aria-label={formatDate(d)} aria-pressed={selected} onMouseEnter={() => anchor && setHover(value)} onFocus={() => anchor && setHover(value)} onClick={() => choose(value)}>{dayDate(d).getUTCDate()}</Button>; })}
    </div>;
    }
    return <FieldGroup className="grid gap-3 md:grid-cols-4"><Field><FieldLabel>统计粒度</FieldLabel><Choices value={mode} onChange={(v) => { onChange(defaultSelection(v as Selection["mode"])); setOpen(false); }} options={modes.map((v) => [v, v === "day" ? "日" : v === "week" ? "周" : "月"])} label="统计粒度"/></Field><Field className="md:col-span-2"><FieldLabel htmlFor={id}>数据时间</FieldLabel><Popover open={open} onOpenChange={(v) => { if (v) {
        setDraft(selection);
        setRangeMode(Boolean(selection.range));
        setCursor((selection.range?.start || selection.value).slice(0, 7));
        setAnchor(undefined);
    } setOpen(v); }}><PopoverTrigger asChild><Button id={id} variant="outline" className="w-full justify-start whitespace-normal text-left"><CalendarIcon data-icon="inline-start"/>{selectionLabel(selection)}</Button></PopoverTrigger><PopoverContent className="w-auto max-w-[calc(100vw-2rem)]" align="start"><div className="flex max-h-[75dvh] flex-col gap-4 overflow-auto">
      {allowRange ? <Choices value={rangeMode ? "range" : "single"} onChange={(v) => { setRangeMode(v === "range"); if (v === "range")
        setCursor(shiftMonth(selection.value.slice(0, 7), mode === "month" ? 0 : -1)); setAnchor(undefined); setDraft({ mode, value: selection.value }); }} options={[["single", `单${mode === "day" ? "日" : mode === "week" ? "周" : "月"}`], ["range", "时间范围"]]} label="时间选择方式"/> : null}
      <div className="flex items-center justify-between gap-4"><Button variant="ghost" size="icon-sm" aria-label="上一周期" onClick={() => setCursor(shiftMonth(cursor, mode === "month" ? -12 : -1))}><ChevronLeftIcon /></Button><span>{mode === "month" ? cursor.slice(0, 4) : formatMonth(cursor)}</span><Button variant="ghost" size="icon-sm" aria-label="下一周期" onClick={() => setCursor(shiftMonth(cursor, mode === "month" ? 12 : 1))}><ChevronRightIcon /></Button></div>
      <div className={cn("grid gap-4", rangeMode && "sm:grid-cols-2")}><div>{rangeMode ? <p className="mb-2 text-center text-sm">{mode === "month" ? cursor.slice(0, 4) : formatMonth(cursor)}</p> : null}{calendar(cursor)}</div>{rangeMode ? <div><p className="mb-2 text-center text-sm">{mode === "month" ? String(Number(cursor.slice(0, 4)) + 1) : formatMonth(shiftMonth(cursor, 1))}</p>{calendar(shiftMonth(cursor, mode === "month" ? 12 : 1))}</div> : null}</div>
      <FieldGroup className="grid gap-3 sm:grid-cols-2">{mode === "day" ? <>{["start", ...(rangeMode ? ["end"] : [])].map((edge) => <Field key={edge} data-invalid={Boolean(error)}><FieldLabel htmlFor={`${id}-${edge}`}>{rangeMode ? edge === "start" ? "开始日期" : "结束日期" : "日期"}</FieldLabel><Input id={`${id}-${edge}`} type="date" value={edge === "start" ? start : end} max={today} aria-invalid={Boolean(error)} onInput={(e) => { setAnchor(undefined); setValue(e.currentTarget.value, edge as "start" | "end"); }}/></Field>)}</> : <><Pick label={rangeMode ? "开始周期" : "周期"} value={start} onChange={(v) => { setAnchor(undefined); setValue(v, "start"); }} options={options}/>{rangeMode ? <Pick label="结束周期" value={end} onChange={(v) => { setAnchor(undefined); setValue(v, "end"); }} options={options}/> : null}</>}</FieldGroup>
      {rangeMode ? <div className="flex flex-wrap gap-2">{(mode === "day" ? [7, 14, 31] : mode === "week" ? [4, 8, 12] : [3, 6, 12]).map((n) => <Button key={n} variant="outline" size="sm" onClick={() => { const end = defaultSelection(mode).value; setDraft({ mode, value: end, range: { start: shiftPeriod(mode, end, 1 - n), end } }); setAnchor(undefined); }}>近{n}{mode === "day" ? "天" : mode === "week" ? "周" : "个月"}</Button>)}</div> : null}
      <FieldError>{error}</FieldError><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>取消</Button><Button disabled={Boolean(error)} onClick={() => { onChange(rangeMode ? { ...draft, value: end, range: { start, end } } : { mode, value: start }); setOpen(false); }}>应用</Button></div>
    </div></PopoverContent></Popover></Field>{selection.range ? <div className="flex items-end justify-end"><Button variant="outline" onClick={() => onChange({ ...selection, range: undefined })}>清除范围</Button></div> : null}</FieldGroup>;
}
