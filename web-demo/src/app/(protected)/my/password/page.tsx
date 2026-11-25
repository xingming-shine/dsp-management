"use client"

import { useState, type FormEvent } from "react"
import Image from "next/image"
import {
  CheckCircle2Icon,
  CircleXIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  SaveIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { mockDspGateway } from "@/services/mock-dsp-gateway"

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword"
type PasswordDraft = Record<PasswordField, string>
type PasswordErrors = Partial<Record<PasswordField, string>>

const emptyDraft: PasswordDraft = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

const passwordRules = [
  { label: "8–32 位", test: (value: string) => value.length >= 8 && value.length <= 32 },
  { label: "包含大写字母", test: (value: string) => /[A-Z]/.test(value) },
  { label: "包含小写字母", test: (value: string) => /[a-z]/.test(value) },
  { label: "包含数字", test: (value: string) => /[0-9]/.test(value) },
  { label: "包含特殊字符", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { label: "不含中文、空格或全角符号", test: (value: string) => /^[\x21-\x7E]+$/.test(value) },
]

function validate(draft: PasswordDraft): PasswordErrors {
  if (!draft.currentPassword) return { currentPassword: "请输入当前密码" }
  if (!draft.newPassword) return { newPassword: "请输入新密码" }
  if (passwordRules.some((rule) => !rule.test(draft.newPassword))) {
    return { newPassword: "新密码尚未满足全部强度要求" }
  }
  if (draft.currentPassword === draft.newPassword) {
    return { newPassword: "新密码不能与当前密码相同" }
  }
  if (!draft.confirmPassword) return { confirmPassword: "请再次输入新密码" }
  if (draft.newPassword !== draft.confirmPassword) {
    return { confirmPassword: "两次输入的密码不一致" }
  }
  return {}
}

export default function PasswordPage() {
  const [draft, setDraft] = useState<PasswordDraft>(emptyDraft)
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  function updateDraft(field: PasswordField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function resetForm() {
    setDraft(emptyDraft)
    setErrors({})
    setVisible({ currentPassword: false, newPassword: false, confirmPassword: false })
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return

    const nextErrors = validate(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.error(Object.values(nextErrors)[0])
      return
    }

    setIsSaving(true)
    try {
      await mockDspGateway.changePassword({
        currentPassword: draft.currentPassword,
        newPassword: draft.newPassword,
      })
      resetForm()
      toast.success("密码修改成功")
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败，请重试"
      setErrors({ currentPassword: message })
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="relative isolate mb-[84px] flex w-full flex-1 flex-col gap-3 pt-0 md:gap-6 md:px-5 md:pt-4 xl:px-12 xl:pt-8 [@media(max-height:920px)]:mb-2 [@media(max-height:800px)]:gap-3">
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

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold md:text-3xl">密码修改</h1>
        <p className="hidden text-sm text-muted-foreground md:block md:text-base [@media(max-height:800px)]:hidden">请设置安全性更高的密码，保护您的账户信息。</p>
      </div>

      <Card className="min-w-0 flex-1 gap-0 py-0 lg:max-h-[580px]">
        <CardHeader className="grid-cols-1 items-center gap-x-4 gap-y-0 px-5 pt-3 md:grid-cols-[auto_1fr] md:px-9 md:pt-9 [@media(max-height:800px)]:grid-cols-1 [@media(max-height:800px)]:pt-3">
          <div className="hidden size-11 items-center justify-center rounded-lg bg-brand-selected text-brand-ink md:flex [@media(max-height:800px)]:hidden">
            <ShieldCheckIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col gap-1 md:gap-2">
            <CardTitle className="text-lg leading-normal md:text-2xl">设置新密码</CardTitle>
            <CardDescription className="hidden text-base md:block [@media(max-height:800px)]:hidden">输入当前密码并确认您的新密码。</CardDescription>
          </div>
        </CardHeader>

        <form className="flex flex-1 flex-col" onSubmit={handleSave} noValidate>
          <CardContent className="flex flex-1 items-start px-5 py-4 md:px-9 md:py-8 lg:py-6 [@media(max-height:800px)]:py-3">
            <FieldGroup className="gap-3 md:gap-7 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:grid-rows-[auto_auto_auto] lg:items-start lg:gap-x-10 lg:gap-y-6 [@media(max-height:800px)]:lg:gap-y-4">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <PasswordInput
                field="currentPassword"
                label="当前密码"
                placeholder="请输入当前密码"
                autoComplete="current-password"
                icon={LockKeyholeIcon}
                value={draft.currentPassword}
                error={errors.currentPassword}
                visible={visible.currentPassword}
                disabled={isSaving}
                onChange={(value) => updateDraft("currentPassword", value)}
                onToggle={() => setVisible((current) => ({ ...current, currentPassword: !current.currentPassword }))}
              />
            </div>

            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <PasswordInput
                field="newPassword"
                label="新密码"
                placeholder="请输入新密码"
                autoComplete="new-password"
                icon={KeyRoundIcon}
                value={draft.newPassword}
                error={errors.newPassword}
                visible={visible.newPassword}
                disabled={isSaving}
                onChange={(value) => updateDraft("newPassword", value)}
                onToggle={() => setVisible((current) => ({ ...current, newPassword: !current.newPassword }))}
              />
            </div>

            <div id="password-rules" className="flex min-w-0 flex-col justify-center rounded-lg bg-muted/60 px-3 py-3 md:px-5 md:py-5 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:h-full lg:px-8">
                <p className="text-sm font-semibold md:text-lg">密码强度要求</p>
                <p className="mt-2 hidden text-sm text-muted-foreground md:block">输入新密码后，下方要求会实时更新。</p>
                <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 md:mt-6 md:gap-3 lg:grid-cols-1" aria-live="polite">
                  {passwordRules.map(({ label, test }) => {
                    const passed = test(draft.newPassword)
                    const RuleIcon = passed ? CheckCircle2Icon : CircleXIcon
                    return (
                      <li key={label} className={`flex items-start gap-1.5 text-xs md:items-center md:gap-2 md:text-sm ${passed ? "text-success" : "text-muted-foreground"}`}>
                        <RuleIcon className="mt-px size-3.5 shrink-0 md:mt-0 md:size-4" aria-hidden="true" />
                        <span>{label}</span>
                        <span className="sr-only">{passed ? "已满足" : "未满足"}</span>
                      </li>
                    )
                  })}
                </ul>
            </div>

            <div className="min-w-0 lg:col-start-1 lg:row-start-3">
              <PasswordInput
                field="confirmPassword"
                label="确认密码"
                placeholder="请再次输入新密码"
                autoComplete="new-password"
                icon={LockKeyholeIcon}
                value={draft.confirmPassword}
                error={errors.confirmPassword}
                visible={visible.confirmPassword}
                disabled={isSaving}
                onChange={(value) => updateDraft("confirmPassword", value)}
                onToggle={() => setVisible((current) => ({ ...current, confirmPassword: !current.confirmPassword }))}
              />
            </div>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end border-t px-5 py-3 md:px-9 md:py-6 [@media(max-height:800px)]:py-2">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" className="h-10 min-w-24 [--button-font-size:14px] md:h-12 md:min-w-28 md:[--button-font-size:16px]" disabled={isSaving} onClick={resetForm}>取消</Button>
              <Button type="submit" className="h-10 min-w-28 [--button-font-size:14px] md:h-12 md:min-w-32 md:[--button-font-size:16px]" disabled={isSaving}>
                <SaveIcon data-icon="inline-start" />
                {isSaving ? "保存中…" : "保存"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </section>
  )
}

function PasswordInput({
  field,
  label,
  placeholder,
  autoComplete,
  icon: Icon,
  value,
  error,
  visible,
  disabled,
  onChange,
  onToggle,
}: {
  field: PasswordField
  label: string
  placeholder: string
  autoComplete: string
  icon: LucideIcon
  value: string
  error?: string
  visible: boolean
  disabled: boolean
  onChange: (value: string) => void
  onToggle: () => void
}) {
  const id = `password-${field}`
  return (
    <Field data-invalid={Boolean(error)} className="gap-1.5 md:gap-2">
      <FieldLabel htmlFor={id} className="text-sm md:text-base">{label} <span className="text-destructive" aria-hidden="true">*</span></FieldLabel>
      <InputGroup className="h-11 md:h-12">
        <InputGroupAddon><Icon className="size-5 text-muted-foreground" aria-hidden="true" /></InputGroupAddon>
        <InputGroupInput
          id={id}
          type={visible ? "text" : "password"}
          className="text-base"
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-required="true"
          aria-invalid={Boolean(error)}
          aria-describedby={[field === "newPassword" ? "password-rules" : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <InputGroupAddon align="inline-end" className="pr-1">
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={`${visible ? "隐藏" : "显示"}${label}`} aria-pressed={visible} onClick={onToggle}>
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  )
}
