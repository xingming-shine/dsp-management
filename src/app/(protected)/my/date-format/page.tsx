"use client"

import { useState, type FormEvent } from "react"
import Image from "next/image"
import { CalendarDaysIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { DateFormat } from "@/features/preferences/types"
import { saveDateFormat, useSavedDateFormat } from "@/features/preferences/date-format-store"
import { useTimezone } from "@/features/preferences/timezone-store"
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatTime,
} from "@/lib/date-time"

const dateFormatOptions: Array<{ value: DateFormat; label: string }> = [
  { value: "HH:mm:ss dd/MM/yyyy", label: "HH:mm:ss dd/MM/yyyy" },
  { value: "HH:mm:ss MM/dd/yyyy", label: "HH:mm:ss MM/dd/yyyy" },
  { value: "MM/dd/yyyy HH:mm:ss", label: "MM/dd/yyyy HH:mm:ss" },
  { value: "dd/MM/yyyy HH:mm:ss", label: "dd/MM/yyyy HH:mm:ss" },
  { value: "yyyy/MM/dd HH:mm:ss", label: "yyyy/MM/dd HH:mm:ss" },
]

const previewDate = "2026-08-21"
const previewEndDate = "2026-08-27"
const previewInstant = "2026-08-21T16:42:18-04:00"

export default function DateFormatPage() {
  const savedFormat = useSavedDateFormat()
  return <DateFormatEditor key={savedFormat} savedFormat={savedFormat} />
}

function DateFormatEditor({ savedFormat }: { savedFormat: DateFormat }) {
  const timezone = useTimezone()
  const [dateFormat, setDateFormat] = useState<DateFormat>(savedFormat)
  const [isSaving, setIsSaving] = useState(false)

  async function savePreference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    try {
      await saveDateFormat(dateFormat)
      toast.success("日期格式已保存")
    } catch {
      toast.error("保存失败，请重试")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="relative isolate mb-4 flex w-full flex-1 flex-col gap-3 pt-0 md:gap-6 md:px-5 md:pt-4 xl:px-12 xl:pt-8 [@media(max-height:800px)]:mb-2 [@media(max-height:800px)]:gap-3 [@media(max-height:800px)]:pt-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-14 -z-10 hidden h-[260px] w-[min(800px,60%)] overflow-hidden opacity-80 xl:block dark:hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 32%), linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
          maskComposite: "intersect",
        }}
      >
        <Image src="/images/profile-page-arc.png" alt="" fill sizes="800px" priority unoptimized className="object-cover object-top" />
      </div>

      <div className="flex flex-col gap-3 [@media(max-height:620px)]:min-[640px]:flex-row [@media(max-height:620px)]:min-[640px]:items-baseline">
        <h1 className="text-2xl font-semibold md:text-3xl">个性化设置</h1>
        <p className="text-sm text-muted-foreground md:text-base">设置系统的日期时间展示格式，时间使用 24 小时制。</p>
      </div>

      <Card className="min-h-max min-w-0 flex-1 gap-0 py-0 lg:max-h-[620px]">
        <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-4 gap-y-0 px-5 pt-5 md:px-9 md:pt-8 [@media(max-height:800px)]:pt-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-brand-selected text-brand-ink">
            <CalendarDaysIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col gap-1 md:gap-2">
            <CardTitle className="text-lg leading-normal md:text-2xl">展示偏好</CardTitle>
            <CardDescription className="text-sm md:text-base">选择日期时间格式，查看实时预览。</CardDescription>
          </div>
        </CardHeader>

        <form className="flex flex-1 flex-col" onSubmit={savePreference}>
          <CardContent className="grid flex-1 gap-7 px-5 py-5 md:px-9 md:py-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] [@media(max-height:800px)]:gap-4 [@media(max-height:800px)]:py-3">
            <FieldSet className="min-w-0 gap-3">
              <FieldLegend id="date-format-label" variant="label" className="mb-4 data-[variant=label]:text-base">日期时间格式</FieldLegend>
              <RadioGroup
                value={dateFormat}
                onValueChange={(value) => setDateFormat(value as DateFormat)}
                aria-labelledby="date-format-label"
                className="grid w-full grid-cols-1 gap-3 [@media(max-height:700px)]:gap-2"
              >
                {dateFormatOptions.map((option, index) => {
                  const id = `date-format-${index}`
                  return (
                    <FieldLabel key={option.value} htmlFor={id} className="h-14 w-full cursor-pointer gap-3 rounded-md border border-input px-4 font-normal transition-colors hover:bg-brand-hover has-data-[state=checked]:border-brand/30 has-data-[state=checked]:bg-brand-selected [@media(max-height:700px)]:h-12">
                      <RadioGroupItem id={id} value={option.value} />
                      <span>{option.label}</span>
                    </FieldLabel>
                  )
                })}
              </RadioGroup>
            </FieldSet>

            <div className="flex min-w-0 flex-col rounded-lg bg-muted/60 px-5 py-5 lg:mt-10 [@media(max-height:800px)]:py-3">
              <h2 className="text-lg font-semibold">格式预览</h2>
              <p className="mt-1 text-sm text-muted-foreground">选择格式后，示例会实时更新。</p>
              <dl className="mt-4 grid flex-1 grid-rows-4 divide-y divide-border [@media(max-height:800px)]:mt-2">
                <PreviewItem label="完整日期" value={formatDate(previewDate, { dateFormat })} />
                <PreviewItem label="日期时间" value={formatDateTime(previewInstant, { dateFormat, timeZone: timezone, includeSeconds: true })} />
                <PreviewItem label="实时精确时间" value={formatTime(previewInstant, { timeZone: timezone })} />
                <PreviewItem label="日期范围" value={formatDateRange(previewDate, previewEndDate, { dateFormat, timeZone: timezone })} />
              </dl>
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3 border-t px-5 pb-4 [--card-spacing:--spacing(4)] md:px-9 [@media(max-height:800px)]:pb-2 [@media(max-height:800px)]:[--card-spacing:--spacing(2)]">
            <Button type="button" variant="outline" className="h-12 min-w-28 [--button-font-size:16px] [@media(max-height:800px)]:h-10" onClick={() => setDateFormat(savedFormat)} disabled={isSaving}>取消</Button>
            <Button type="submit" className="h-12 min-w-32 [--button-font-size:16px] [@media(max-height:800px)]:h-10" disabled={isSaving}>
              <SaveIcon data-icon="inline-start" />
              {isSaving ? "保存中…" : "保存设置"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-11 grid-cols-[minmax(84px,0.8fr)_minmax(0,1.6fr)] items-center gap-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium tabular-nums">{value}</dd>
    </div>
  )
}
