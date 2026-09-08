"use client"

import { useState } from "react"
import { CalendarDaysIcon, Clock3Icon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { DateFormat } from "@/features/preferences/types"
import {
  DEFAULT_TIME_ZONE,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatTime,
} from "@/lib/date-time"
import { mockSession } from "@/mocks/session"
import { mockDspGateway } from "@/services/mock-dsp-gateway"

const dateFormatOptions: Array<{ value: DateFormat; label: string }> = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY（美国）" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD（ISO）" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM-DD-YYYY", label: "MM-DD-YYYY" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY" },
  { value: "YYYY年MM月DD日", label: "YYYY年MM月DD日" },
]

const previewDate = "2026-08-21"
const previewEndDate = "2026-08-27"
const previewInstant = "2026-08-21T16:42:18-04:00"

export default function DateFormatPage() {
  const [dateFormat, setDateFormat] = useState<DateFormat>(
    mockSession.preferences.dateFormat
  )
  const [isSaving, setIsSaving] = useState(false)

  async function savePreference() {
    setIsSaving(true)
    try {
      await mockDspGateway.updatePreferences({ dateFormat })
      toast.success("日期格式已保存")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            日期格式
          </h1>
          <p className="text-muted-foreground">
            设置系统的日期展示顺序，时间始终使用 24 小时制。
          </p>
        </div>
        <Badge variant="outline">默认：美国格式</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>展示偏好</CardTitle>
          <CardDescription>
            此设置只影响界面展示，接口和存储值仍使用 ISO 8601。
          </CardDescription>
          <CardAction>
            <CalendarDaysIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel id="date-format-label">日期格式</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={dateFormat}
                onValueChange={(value) => {
                  if (value) setDateFormat(value as DateFormat)
                }}
                aria-labelledby="date-format-label"
                className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {dateFormatOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="justify-start"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>
                新用户默认使用 MM/DD/YYYY。
              </FieldDescription>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewItem
                label="完整日期"
                value={formatDate(previewDate, { dateFormat })}
              />
              <PreviewItem
                label="日期时间"
                value={formatDateTime(previewInstant, { dateFormat })}
              />
              <PreviewItem
                label="实时精确时间"
                value={formatTime(previewInstant)}
              />
              <PreviewItem
                label="日期范围"
                value={formatDateRange(previewDate, previewEndDate, { dateFormat })}
              />
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-muted p-4">
              <Clock3Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <span className="font-medium">24 小时制</span>
                <span className="text-sm text-muted-foreground">
                  当前默认时区为 {DEFAULT_TIME_ZONE}，不显示 AM / PM。
                </span>
              </div>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button onClick={savePreference} disabled={isSaving}>
            <SaveIcon data-icon="inline-start" />
            {isSaving ? "保存中…" : "保存设置"}
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  )
}
