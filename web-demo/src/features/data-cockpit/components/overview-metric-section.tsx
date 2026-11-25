"use client";

import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date-time";
import { cn } from "@/lib/utils";
import {
  display,
  isUpdating,
  passes,
  rawKeys,
  selectionLabel,
  type Metric,
  type Selection,
  type Values,
} from "../cockpit-model";
import type { CockpitView } from "../types";
import type { ReactNode } from "react";

type MetricSection = {
  title: string;
  view: CockpitView;
  metrics: Metric[];
};

type DailyTrendPoint = { date: string; values?: Values };
type SparkPoint = { x: number; y: number };

function smoothPath(points: SparkPoint[]) {
  if (points.length < 2) return "";
  return points.slice(0, -1).reduce((path, point, index) => {
    const next = points[index + 1];
    const previous = points[index - 1] || point;
    const following = points[index + 2] || next;
    const third = (next.x - point.x) / 3;
    const firstControlY = Math.max(8, Math.min(56, point.y + (next.y - previous.y) / 6));
    const secondControlY = Math.max(8, Math.min(56, next.y - (following.y - point.y) / 6));
    return `${path} C ${point.x + third} ${firstControlY} ${next.x - third} ${secondControlY} ${next.x} ${next.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function MetricSparkline({ metric, valueKey, dailyTrend }: { metric: Metric; valueKey: string; dailyTrend: DailyTrendPoint[] }) {
  const series = dailyTrend.map(({ date, values }) => {
    const pending = isUpdating(metric.key, "day", date);
    return { date, pending, value: values && !pending ? values[valueKey] : undefined };
  });
  const available = series.map((point) => point.value).filter((value): value is number => value !== undefined && Number.isFinite(value));
  const low = Math.min(...available);
  const high = Math.max(...available);
  const spread = high - low || Math.max(Math.abs(high) * 0.02, 1);
  const lowerBound = low - spread * 0.25;
  const upperBound = high + spread * 0.25;
  const segments: SparkPoint[][] = [];
  const markers: SparkPoint[] = [];

  series.forEach((point, index) => {
    if (point.value === undefined || !Number.isFinite(point.value)) return;
    const coordinate = {
      x: 5 + index * 35,
      y: 8 + (1 - (point.value - lowerBound) / (upperBound - lowerBound)) * 48,
    };
    markers.push(coordinate);
    if (index > 0 && series[index - 1].value !== undefined) segments[segments.length - 1].push(coordinate);
    else segments.push([coordinate]);
  });

  const description = series.map(({ date, pending, value }) => `${formatDate(date)} ${value === undefined ? pending ? "更新中" : "暂无数据" : display(value, metric.unit)}`).join("；");

  return (
    <div className="flex min-w-0 flex-col justify-between gap-2">
      <span className="text-xs font-medium text-foreground">近7天趋势</span>
      {markers.length ? (
        <svg viewBox="0 0 220 68" className="h-20 w-full" role="img" aria-label={`${metric.label}近7天趋势：${description}`} preserveAspectRatio="none">
          {segments.map((segment, index) => {
            if (segment.length < 2) return null;
            const line = smoothPath(segment);
            return <g key={index}>
              <path d={`${line} L ${segment[segment.length - 1].x} 68 L ${segment[0].x} 68 Z`} fill="var(--brand)" opacity="0.025" />
              <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2" opacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
            </g>;
          })}
          {markers.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="1.8" fill="var(--brand)" opacity="0.55" />)}
        </svg>
      ) : <div className="flex h-20 items-center text-xs text-muted-foreground">暂无趋势数据</div>}
      <div className="flex justify-between gap-2 text-xs tabular-nums text-muted-foreground">
        <span>{dailyTrend[0] ? formatDate(dailyTrend[0].date).slice(0, 5) : "—"}</span>
        <span>{dailyTrend.at(-1) ? formatDate(dailyTrend[dailyTrend.length - 1].date).slice(0, 5) : "—"}</span>
      </div>
    </div>
  );
}

function OverviewMetric({
  metric,
  values,
  previous,
  week,
  dailyTrend,
  selection,
  raw,
}: {
  metric: Metric;
  values: Values;
  previous: Values;
  week?: Values;
  dailyTrend: DailyTrendPoint[];
  selection: Selection;
  raw: boolean;
}) {
  const valueKey = raw && rawKeys[metric.key] ? rawKeys[metric.key] : metric.key;
  const value = values[valueKey];
  const updating = isUpdating(metric.key, selection.mode, selection.range?.end || selection.value);
  const comparisons = [
    { data: previous, label: selection.mode === "day" ? "环比昨日" : selection.mode === "week" ? "环比上周" : "环比上月" },
    ...(week ? [{ data: week, label: "同比上周" }] : []),
  ];

  return <Card size="sm" className="@container/metric-card min-w-0 border-border/45 bg-card/45">
    <CardContent className="grid min-w-0 flex-1 gap-4 @xs/metric-card:grid-cols-[minmax(0,1fr)_minmax(7rem,.85fr)]">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <span className="text-sm font-medium text-foreground">{metric.label}</span>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("font-heading text-2xl font-semibold tabular-nums text-foreground", metric.unit === "min" && "text-xl")}>
            {display(value, metric.unit)}
          </span>
          {updating ? <Badge size="sm" variant="warning">更新中</Badge> : metric.target !== undefined && !raw && value !== undefined ? (
            <Badge size="sm" variant={passes(value, metric) ? "success" : "destructive"}>{passes(value, metric) ? "达标" : "未达标"}</Badge>
          ) : null}
        </div>
        {metric.target !== undefined ? <span className="text-xs text-muted-foreground">目标 {metric.lower ? "≤" : "≥"} {metric.target}{metric.unit}</span> : null}
        {metric.unit === "min" && values[`avg${metric.key}`] !== undefined ? <span className="text-xs text-muted-foreground">人均 {display(values[`avg${metric.key}`], "min")}</span> : null}
        {!updating ? <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
          {comparisons.map(({ data, label }) => {
            if (value === undefined || data[valueKey] === undefined) return null;
            const difference = value - data[valueKey];
            const direction = difference > 0 ? "↑" : difference < 0 ? "↓" : "→";
            const favorable = metric.target !== undefined && !raw && (metric.lower ? difference < 0 : difference > 0);
            const adverse = metric.target !== undefined && !raw && difference !== 0 && !favorable;
            return <span key={label} className={cn("tabular-nums", favorable && "text-success", adverse && "text-destructive")}>
              {direction} {display(Math.abs(difference), metric.unit === "%" ? "pp" : metric.unit)} {label}
            </span>;
          })}
        </div> : null}
      </div>
      <MetricSparkline metric={metric} valueKey={valueKey} dailyTrend={dailyTrend} />
    </CardContent>
  </Card>;
}

export function OverviewMetricSection({
  section,
  selection,
  metrics,
  values,
  previous,
  week,
  dailyTrend,
  raw = false,
  action,
  onNavigate,
}: {
  section: MetricSection;
  selection: Selection;
  metrics: Metric[];
  values: Values;
  previous: Values;
  week?: Values;
  dailyTrend: DailyTrendPoint[];
  raw?: boolean;
  action?: ReactNode;
  onNavigate: (view: CockpitView, selection: Selection) => void;
}) {
  return (
    <section aria-labelledby={`overview-${section.view}-title`} className="flex min-w-0 flex-col gap-3 rounded-lg bg-muted p-3">
      <div className="flex flex-row flex-wrap items-center justify-between gap-3 px-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`overview-${section.view}-title`} className="text-base font-medium">{section.title}</h3>
          <Badge size="sm" variant="secondary" className="tabular-nums">{selectionLabel(selection)}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {action}
          <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate(section.view, selection)}>
            查看详情 <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
      <div className={cn(
        "grid gap-3",
        section.view === "capacity" && metrics.length > 1 && "sm:grid-cols-2 xl:grid-cols-3",
        section.view === "efficiency" && "sm:grid-cols-2",
        section.view === "timeliness" && "sm:grid-cols-2 xl:grid-cols-3",
        section.view === "quality" && "sm:grid-cols-2",
        section.view === "quality" && metrics.length > 2 && "xl:grid-cols-4"
      )}>
        {metrics.map((metric) => (
          <OverviewMetric
            key={metric.key}
            metric={metric}
            values={values}
            previous={previous}
            week={week}
            dailyTrend={dailyTrend}
            selection={selection}
            raw={raw}
          />
        ))}
      </div>
    </section>
  );
}
