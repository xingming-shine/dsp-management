import { CheckIcon, Clock3Icon, FileTextIcon, ArrowDownIcon, SmartphoneIcon, Columns3Icon, XIcon, UserRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatDateTime, formatTime } from "@/lib/date-time"

type Event = { time: string; title: string; operator: string; tone: "success" | "pending" | "neutral" | "error"; note?: string }
const submitted: Event = { time: "2026-07-07T17:40:00Z", title: "提交开启申请", operator: "陈主管", tone: "neutral" }
const reviewed: Event = { time: "2026-07-08T14:20:00Z", title: "业务审核通过", operator: "李主管", tone: "success" }
const scenarios: Record<string, Event[]> = {
  normal: [
    { time: "2026-07-08T15:10:00Z", title: "财务审核通过", operator: "赵财务", tone: "success", note: "开户材料核验完成，已开通车队提现模式。" },
    reviewed,
    submitted,
  ],
  rejected: [
    { time: "2026-07-08T15:10:00Z", title: "财务审核驳回", operator: "赵财务", tone: "error", note: "银行账户持有人姓名与营业执照上的企业名称不一致。请重新上传清晰、完整的开户证明，并确认银行账户信息与企业主体一致后再次提交。" },
    reviewed,
    submitted,
  ],
  pending: [
    { time: "2026-07-08T14:20:00Z", title: "转交财务审核", operator: "李主管", tone: "pending", note: "业务审核已通过，等待财务核验开户材料。" },
    submitted,
  ],
}
const options = [
  { id: "a", title: "简洁线型", tag: "已选定 · 项目默认", description: "细线串联，标题先行。信息轻，适合大多数审核记录。", summary: "8px 节点 / 24px 记录间距 / 时间与人员同行" },
  { id: "b", title: "分组记录型", tag: "记录多时更清楚", description: "日期分组，图标区分动作。适合跨日、记录较多的场景。", summary: "按日分组 / 24px 图标节点 / 备注独立浅底" },
  { id: "c", title: "左右对齐型", tag: "时间检索更高效", description: "左侧时间，右侧事件。适合宽详情页和精确时间追溯。", summary: "88px 时间列 / 双列对齐 / 窄屏自动重排" },
]

function Node({ event, style }: { event: Event; style: string }) {
  const Icon = event.tone === "error" ? XIcon : event.tone === "pending" ? Clock3Icon : event.tone === "success" ? CheckIcon : FileTextIcon
  return <span className="tl-node" data-tone={event.tone} aria-hidden="true">{style !== "a" && <Icon />}</span>
}

function Entry({ event, style, latest }: { event: Event; style: string; latest: boolean }) {
  return <li className="tl-entry" data-latest={latest}>
    {style === "c" && <time className="tl-time-column" dateTime={event.time}><span>{formatTime(event.time, { includeSeconds: false })}</span><span>{formatDate(event.time)}</span></time>}
    <div className="tl-track"><Node event={event} style={style} /></div>
    <div className="tl-event">
      <div className="tl-event-heading"><h4>{event.title}</h4>{latest && <Badge variant="secondary" size="sm">最新</Badge>}</div>
      <div className="tl-meta">
        {style !== "c" && <time dateTime={event.time}>{style === "b" ? formatTime(event.time, { includeSeconds: false }) : formatDateTime(event.time)}</time>}
        {style !== "c" && <span aria-hidden="true">·</span>}
        <span className="tl-operator">{style === "c" && <UserRoundIcon aria-hidden="true" />}<span>操作人：{event.operator}</span></span>
      </div>
      {event.note && <p className="tl-note" data-tone={event.tone}>{event.tone === "error" && <span className="tl-note-label">驳回原因</span>}{event.note}</p>}
    </div>
  </li>
}

function Timeline({ events, style }: { events: Event[]; style: string }) {
  if (style === "b") {
    const dates = [...new Set(events.map(event => formatDate(event.time)))]
    return <div className="tl-day-groups">{dates.map(date => <section className="tl-day-group" key={date}>
      <h4 className="tl-date-heading">{date}<span>{events.filter(event => formatDate(event.time) === date).length} 条记录</span></h4>
      <ol aria-label={`${date} 审核记录`} className="tl-list">{events.filter(event => formatDate(event.time) === date).map(event => <Entry key={event.time} event={event} style={style} latest={event === events[0]} />)}</ol>
    </section>)}</div>
  }
  return <ol aria-label="审核记录时间线，最新记录在前" className="tl-list">{events.map((event, index) => <Entry key={event.time} event={event} style={style} latest={index === 0} />)}</ol>
}

export function TimelineOptions() {
  return <main className="timeline-lab" data-view="all" data-width="desktop">
    <header className="tl-page-header">
      <div className="flex flex-col gap-3"><div className="flex items-center gap-2"><span className="tl-brand">GOFO</span><span className="text-xs text-muted-foreground">DSP 管理系统 / 组件方案</span></div>
        <h1 className="text-2xl font-medium">审核时间线，三种更清晰的表达</h1>
        <p className="text-sm text-muted-foreground">同一组审核记录，比较信息层级、留白与时间的呈现方式。</p>
      </div>
      <Badge variant="outline" size="md">A 方案已定稿</Badge>
    </header>
    <section className="tl-toolbar" aria-label="预览设置">
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">示例场景</span>
        {[["normal", "审核通过"], ["rejected", "驳回 · 长文本"], ["pending", "审核中"]].map(([value, label]) => <Button key={value} variant="outline" size="sm" data-scenario-button={value} aria-pressed={value === "normal"}>{label}</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" data-action="overview"><Columns3Icon data-icon="inline-start" />全部对比</Button>
        <Button variant="outline" size="sm" data-action="width" aria-pressed="false"><SmartphoneIcon data-icon="inline-start" /><span data-width-label>窄屏预览</span></Button>
        <Button variant="outline" size="sm" data-action="theme" aria-pressed="false"><span data-theme-label>深色预览</span></Button>
      </div>
    </section>
    <div className="tl-options">
      {options.map(option => <article key={option.id} className="tl-option" data-option={option.id}>
        <header className="tl-option-header"><div className="flex items-center gap-3"><span className="tl-letter">{option.id.toUpperCase()}</span><h2 className="text-lg font-medium">{option.title}</h2></div><p className="text-xs text-muted-foreground">{option.tag}</p></header>
        <div className="tl-surface">
          <div className="tl-surface-header"><div className="flex items-center justify-between gap-2"><h3 className="text-base font-medium">审核记录</h3><span className="tl-order"><ArrowDownIcon aria-hidden="true" />最新在前</span></div><p className="text-xs text-muted-foreground">America/New_York · 示例数据</p></div>
          {Object.entries(scenarios).map(([scenario, events]) => <div key={scenario} data-scenario={scenario} hidden={scenario !== "normal"}><Timeline events={events} style={option.id} /></div>)}
        </div>
        <footer className="tl-option-footer"><p className="text-sm">{option.description}</p><p className="text-xs text-muted-foreground">{option.summary}</p><Button variant="outline" data-focus-option={option.id}>单独查看 {option.id.toUpperCase()}</Button></footer>
      </article>)}
    </div>
    <footer className="tl-page-footer"><p><strong>A 已选定为项目默认时间线。</strong> 规则已写入项目 UI 规范，并用于 DSP 提现模式管理的审核记录。</p><p>本页保留 B、C 作为设计比较，正式规则以 ui-standards.md 的“时间线”章节为准。</p><p className="sr-only" role="status" aria-live="polite" data-announcement /></footer>
  </main>
}
