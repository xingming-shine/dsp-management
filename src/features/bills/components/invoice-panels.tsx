"use client"

import { useState } from "react"
import { DownloadIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PeriodPicker } from "@/components/ui/period-picker"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmAction, WorkflowPanel, type Confirmation } from "@/features/withdrawal-mode/components/withdrawal-parts"
import { useTimezone } from "@/features/preferences/timezone-store"
import { formatDate, formatDateTime } from "@/lib/date-time"
import { mockSession } from "@/mocks/session"
import { BANKS, COMPANY, changeInvoice, createInvoice, gross, invoiceBalance, money, todayISO, type Bank, type Bill, type Company, type Invoice } from "../model"
import { useBills, updateBills } from "../store"
import { downloadInvoice } from "../export"
import { Amount, FilterSelect, History, Info, InvoiceBadge, NoResults, Notice, Section, unavailable } from "./bill-parts"

function CompanyInfo({ company, bank }: { company: Company; bank?: Bank }) {
  const [reveal, setReveal] = useState(false)
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2"><Info label="公司名称">{company.name}</Info><Info label="公司注册地址">{company.address}</Info><Info label="税务登记号 / 联邦税号 EIN"><span className="flex items-center gap-2"><span>{reveal ? company.ein : "8*-***4102"}</span><Button type="button" variant="ghost" size="icon-xs" aria-label={reveal ? "隐藏税号" : "显示税号"} onClick={() => setReveal(!reveal)}>{reveal ? <EyeOffIcon /> : <EyeIcon />}</Button></span></Info><Info label="公司注册号/商业许可证">{company.registration}</Info><Info label="邮箱">{company.email}</Info><Info label="付款条件">{company.terms}</Info>{bank && <><Info label="银行账号">{bank.label}</Info><Info label="账户名称">{bank.accountName}</Info><Info label="银行">{bank.bank}</Info><Info label="Swift Code / BIC">{bank.swift}</Info><Info label="本地清算号(ACH)">{bank.ach}</Info><Info label="本地清算号(Wire)">{bank.wire}</Info></>}</dl>
}
export function InvoiceBills({ lines, bills, invoices, onRemove, onOpen }: { lines: Invoice["lines"]; bills: Bill[]; invoices: Invoice[]; onRemove?: (id: string) => void; onOpen?: (id: string) => void }) {
  return <Table variant="grid" aria-label="关联账单"><TableHeader><TableRow>{["序号", "账单号", "本次开票金额", "待开票金额", "账单金额_未税", "账单金额_含税", "税率", "币种"].map((label) => <TableHead key={label}>{label}</TableHead>)}{onRemove && <TableHead sticky="right" className="text-center">操作</TableHead>}</TableRow></TableHeader><TableBody>{lines.map((line, index) => {
    const bill = bills.find((row) => row.id === line.billId)
    return <TableRow key={line.billId}><TableCell className="tabular-nums">{index + 1}</TableCell><TableCell>{onOpen ? <Button variant="link" size="xs" onClick={() => onOpen(line.billId)}>{line.billId}</Button> : line.billId}</TableCell><TableCell><Amount cents={gross(line)} /></TableCell><TableCell><Amount cents={bill ? invoiceBalance(bill, invoices).remaining : 0} /></TableCell><TableCell>{bill ? <Amount cents={bill.netCents} /> : "—"}</TableCell><TableCell>{bill ? <Amount cents={gross(bill)} /> : "—"}</TableCell><TableCell>{bill?.taxRate ?? 0}%</TableCell><TableCell>USD</TableCell>{onRemove && <TableCell sticky="right" className="text-center"><Button variant="link" size="xs" aria-label={`移除账单 ${line.billId}`} onClick={() => onRemove(line.billId)}>移除</Button></TableCell>}</TableRow>
  })}{!lines.length && <TableRow><TableCell colSpan={onRemove ? 9 : 8}><NoResults title="尚未选择账单" description="请从左侧选择未开票账单。" /></TableCell></TableRow>}</TableBody></Table>
}
export function InvoiceForm({ bills, kind, onRemove, onClose, onCreated }: { bills: Bill[]; kind: Bill["kind"]; onRemove: (id: string) => void; onClose: () => void; onCreated: (id: string) => void }) {
  const state = useBills()
  const timezone = useTimezone()
  const [number, setNumber] = useState("")
  const [date, setDate] = useState(() => todayISO(timezone))
  const [phone, setPhone] = useState(COMPANY.phone)
  const [note, setNote] = useState("")
  const [bankId, setBankId] = useState(BANKS[0].id)
  const [error, setError] = useState("")
  const [initialIds] = useState(() => bills.map((bill) => bill.id).join(","))
  const bank = BANKS.find((row) => row.id === bankId)!
  const lines = bills.map((bill) => ({ billId: bill.id, netCents: Math.abs(bill.netCents), taxCents: Math.abs(bill.taxCents) }))
  const net = lines.reduce((sum, line) => sum + line.netCents, 0)
  const tax = lines.reduce((sum, line) => sum + line.taxCents, 0)
  function submit() {
    try {
      let id = ""
      updateBills((current) => { const created = createInvoice(current, { number, date, phone, note, bankId, billIds: bills.map((bill) => bill.id) }, mockSession.user.name, new Date().toISOString(), todayISO(timezone)); id = created.id; return created.state })
      toast.success("开票申请单已生成", { description: "请核对后提交，生成申请单不会自动提交审核。" }); onCreated(id)
    } catch (error) { setError(error instanceof Error ? error.message : "生成失败，请重试"); document.getElementById(!number.trim() ? "invoice-number" : !phone.trim() ? "invoice-phone" : "invoice-error")?.focus() }
  }
  return <WorkflowPanel title={`申请开票 · ${kind === "delivery" ? "派费发票" : "理赔发票"}`} description={`已选 ${bills.length} 张 · 待开票全额 ${money(net + tax)} USD`} onClose={onClose} dirty={Boolean(number || note || phone !== COMPANY.phone || bankId !== BANKS[0].id || date !== todayISO(timezone) || initialIds !== bills.map((bill) => bill.id).join(","))} footer={(close) => <><Button variant="outline" onClick={close}>取消</Button><Button onClick={submit} disabled={!bills.length}>生成申请单</Button></>}>
    <Notice>发票金额由关联账单自动汇总，按待开票全额申请。生成后进入“待提交”，需在申请单中另行提交。</Notice>
    <Section title="发票信息"><FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field data-invalid={Boolean(error && (!number.trim() || error.includes("发票号")))}><FieldLabel htmlFor="invoice-number">供应商发票号（必填）</FieldLabel><Input id="invoice-number" maxLength={20} value={number} aria-invalid={Boolean(error && (!number.trim() || error.includes("发票号")))} onChange={(event) => { setNumber(event.target.value); setError("") }} placeholder="请输入，最多20个字符" /></Field><PeriodPicker triggerClassName="max-w-none" allowRange={false} label="开票日期（必填）" selection={{ mode: "day", value: date }} onChange={(selection) => { setDate(selection.value); setError("") }} modes={["day"]} showGranularity={false} /><Field data-invalid={Boolean(error && error.includes("电话"))}><FieldLabel htmlFor="invoice-phone">联系电话（必填）</FieldLabel><Input id="invoice-phone" type="tel" maxLength={30} value={phone} aria-invalid={Boolean(error && error.includes("电话"))} onChange={(event) => { setPhone(event.target.value); setError("") }} /></Field><FilterSelect id="invoice-bank" label="银行账号（必填）" all={false} value={bankId} options={Object.fromEntries(BANKS.map((bank) => [bank.id, bank.label]))} onChange={setBankId} /><Field className="sm:col-span-2"><FieldLabel htmlFor="invoice-note">备注（选填） · {note.length}/100</FieldLabel><Textarea id="invoice-note" maxLength={100} value={note} onChange={(event) => setNote(event.target.value)} rows={3} /></Field></FieldGroup></Section>
    <Section title="公司与银行信息"><div><Button variant="outline" size="sm" onClick={() => unavailable("公司及银行资料维护")}><ExternalLinkIcon data-icon="inline-start" />去个人中心维护</Button></div><CompanyInfo company={COMPANY} bank={bank} /></Section>
    <Section title="发票金额"><dl className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Info label="发票金额_未税"><Amount cents={net} /> USD</Info><Info label="发票税额"><Amount cents={tax} /> USD</Info><Info label="发票金额_含税"><Amount cents={net + tax} /> USD</Info></dl></Section>
    <Section title="关联账单"><InvoiceBills lines={lines} bills={state.bills} invoices={state.invoices} onRemove={onRemove} /></Section>
    {error && <FieldError id="invoice-error" tabIndex={-1} role="alert">{error}</FieldError>}
  </WorkflowPanel>
}
export function InvoiceDetail({ invoice, onClose, onBill, onRelated, onDeleted }: { invoice: Invoice; onClose: () => void; onBill: (id: string) => void; onRelated: (id: string) => void; onDeleted: () => void }) {
  const state = useBills()
  const zone = useTimezone()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  function act(action: "submit" | "delete" | "void") {
    const label = action === "submit" ? "提交申请单" : action === "delete" ? "删除申请单" : "作废申请单"
    setConfirmation({ title: `${label}？`, description: action === "submit" ? "提交后进入财务审核，当前DSP端将只读跟踪处理结果。" : "关联账单将释放开票金额，可重新申请。此操作不可撤销。", label, destructive: action !== "submit", onConfirm: () => {
      try { updateBills((state) => changeInvoice(state, invoice.id, action, mockSession.user.name, new Date().toISOString())); setConfirmation(null); toast.success(`${label}成功`); if (action === "delete") onDeleted() } catch (error) { toast.error(error instanceof Error ? error.message : "操作失败") }
    } })
  }
  return <><WorkflowPanel title={`开票申请单 · ${invoice.id}`} description={`${invoice.kind === "delivery" ? "派费发票" : "理赔发票"}${invoice.originalId ? "（冲销）" : ""} · ${invoice.company.name}`} onClose={onClose} footer={invoice.status === "draft" || invoice.status === "rejected" || invoice.status === "approved" ? () => <>{invoice.status === "draft" && <><Button variant="outline" onClick={() => act("delete")}>删除</Button><Button onClick={() => act("submit")}>提交申请单</Button></>}{invoice.status === "rejected" && <Button variant="destructive" onClick={() => act("void")}>作废申请单</Button>}{invoice.status === "approved" && <Button onClick={() => { downloadInvoice(invoice); toast.success("模拟发票PDF已下载") }}><DownloadIcon data-icon="inline-start" />下载发票</Button>}</> : undefined}>
    <div><InvoiceBadge status={invoice.status} /></div>
    {invoice.status === "rejected" && <Notice><span className="whitespace-pre-wrap break-words">驳回原因：{invoice.reason} 请作废后重新申请。</span></Notice>}
    {(invoice.status === "reversing" || invoice.status === "reversed") && <Notice>冲销由财务发起，DSP端只读跟踪。{invoice.originalId && <Button variant="link" size="xs" onClick={() => onRelated(invoice.originalId!)}>查看原票 {invoice.originalId}</Button>}{invoice.reversalId && <Button variant="link" size="xs" onClick={() => onRelated(invoice.reversalId!)}>查看冲销单 {invoice.reversalId}</Button>}</Notice>}
    {invoice.status === "draft" && <Notice>申请单尚未提交。请核对发票信息及关联账单后点击“提交申请单”。</Notice>}
    {invoice.status === "void" && <Notice>申请单已作废，关联账单可重新申请开票。</Notice>}
    <Section title="发票信息"><dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2"><Info label="供应商发票号">{invoice.number}</Info><Info label="开票日期">{formatDate(invoice.date)}</Info><Info label="创建时间">{formatDateTime(invoice.createdAt, { timeZone: zone })} · {zone}</Info><Info label="创建人">{invoice.createdBy}</Info><Info label="币种 / 税率">{invoice.currency} / {invoice.taxRate}%</Info><Info label="联系电话">{invoice.phone}</Info><Info label="备注">{invoice.note || "—"}</Info></dl></Section>
    <Section title="公司与银行信息"><p className="text-xs text-muted-foreground">生成申请单时的档案快照 · 只读</p><CompanyInfo company={invoice.company} bank={invoice.bank} /></Section>
    <Section title="关联账单"><InvoiceBills lines={invoice.lines} bills={state.bills} invoices={state.invoices} onOpen={onBill} /></Section>
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Info label="发票金额_未税"><Amount cents={invoice.netCents} /> USD</Info><Info label="发票税额"><Amount cents={invoice.taxCents} /> USD</Info><Info label="发票金额_含税"><Amount cents={gross(invoice)} /> USD</Info></dl><History logs={invoice.logs} />
  </WorkflowPanel><ConfirmAction confirmation={confirmation} onClose={() => setConfirmation(null)} /></>
}
