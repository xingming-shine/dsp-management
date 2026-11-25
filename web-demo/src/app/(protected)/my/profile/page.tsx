"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BriefcaseBusinessIcon, Building2Icon, Clock3Icon, EyeIcon, EyeOffIcon, LogOutIcon, MailIcon, PhoneIcon, SaveIcon, Undo2Icon, UserRoundIcon, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useProfile } from "@/features/auth/profile-context"
import type { SessionUser } from "@/features/auth/types"
import { useOrganization } from "@/features/organizations/organization-context"
import { useTimezone } from "@/features/preferences/timezone-store"
import { formatDateTime } from "@/lib/date-time"
import { mockDspGateway } from "@/services/mock-dsp-gateway"

type ProfileDraft = Pick<SessionUser, "name" | "phone" | "email" | "gender">
type ProfileErrors = Partial<Record<"name" | "phone" | "email", string>>

const roleLabels: Record<SessionUser["role"], string> = {
  owner: "组织管理员",
  manager: "DSP Manager",
  finance: "财务人员",
  cs: "客服人员",
}

function toDraft(user: SessionUser): ProfileDraft {
  return { name: user.name, phone: user.phone, email: user.email, gender: user.gender }
}

function validate(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {}
  if (!draft.name.trim()) errors.name = "请输入姓名"
  if (!draft.phone.trim()) {
    errors.phone = "请输入手机号码"
  } else if (!/^\+?[\d\s()-]{7,24}$/.test(draft.phone.trim()) || !/^\d{10,15}$/.test(draft.phone.replace(/\D/g, ""))) {
    errors.phone = "请输入有效的手机号码"
  }
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = "请输入有效的邮箱地址"
  }
  return errors
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  return digits.length > 4 ? "••• ••• " + digits.slice(-4) : phone
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@")
  return name && domain ? name.slice(0, 2) + "•••@" + domain : email
}

export default function ProfilePage() {
  const profile = useProfile()
  const { user } = profile
  const profileKey = [user.name, user.phone, user.email, user.gender].join("/")
  return <ProfilePageContent key={profileKey} {...profile} />
}

function ProfilePageContent({ user, saveProfile }: ReturnType<typeof useProfile>) {
  const router = useRouter()
  const { organization } = useOrganization()
  const timezone = useTimezone()
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(user))
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [showPhone, setShowPhone] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  function updateDraft<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    try {
      saveProfile({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        gender: draft.gender,
      })
      toast.success("个人资料已保存")
    } catch {
      toast.error("保存失败，请重试")
    }
  }

  function handleReset() {
    setDraft(toDraft(user))
    setErrors({})
    toast.info("已重置未保存的修改")
  }

  async function handleLogout() {
    setLogoutOpen(false)
    await mockDspGateway.logout()
    router.replace("/login")
  }

  return (
    <section className="relative isolate flex w-full flex-1 flex-col gap-6 pt-0 md:px-5 md:pt-4 xl:px-12 xl:pt-8 [@media(max-height:800px)]:min-[640px]:gap-3 [@media(max-height:800px)]:min-[640px]:pt-0 [@media(max-height:620px)]:min-[640px]:gap-1">
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
        <h1 className="text-2xl font-semibold md:text-3xl">个人资料</h1>
        <p className="text-sm text-muted-foreground md:text-base">查看账户信息并编辑基本资料。</p>
      </div>

      <div className="grid min-w-0 gap-5 min-[640px]:grid-cols-[minmax(200px,0.38fr)_minmax(0,1fr)] min-[800px]:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)] xl:grid-cols-[minmax(360px,435px)_minmax(0,1fr)]">
        <Card className="min-w-0 gap-0 py-0 xl:min-h-[624px] [@media(max-height:800px)]:min-[640px]:min-h-0">
          <div className="relative flex h-[250px] shrink-0 flex-col items-center overflow-hidden pt-12 text-center [@media(max-height:800px)]:min-[640px]:h-[170px] [@media(max-height:800px)]:min-[640px]:pt-4 [@media(max-height:560px)]:min-[640px]:max-h-32">
            <Image src="/images/profile-wave.png" alt="" aria-hidden="true" fill sizes="(min-width: 1280px) 435px, 100vw" priority unoptimized className="pointer-events-none -translate-y-20 object-cover object-center opacity-60 dark:hidden" />
            <div className="relative flex flex-col items-center">
              <Avatar className="size-24 border-[6px] border-card [@media(max-height:800px)]:min-[640px]:size-16 [@media(max-height:800px)]:min-[640px]:border-4 [@media(max-height:560px)]:min-[640px]:max-h-12 [@media(max-height:560px)]:min-[640px]:max-w-12">
                <AvatarFallback className="bg-muted text-3xl text-foreground">{user.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="mt-3 max-w-[18rem] truncate text-xl font-semibold [@media(max-height:800px)]:min-[640px]:mt-1 [@media(max-height:800px)]:min-[640px]:text-lg">{user.name}</span>
              <span className="mt-1 rounded-md bg-brand-selected px-3 py-1 text-sm text-brand-ink [@media(max-height:800px)]:min-[640px]:mt-0.5">{roleLabels[user.role]}</span>
            </div>
          </div>
          <CardContent className="px-8">
            <Separator />
            <dl className="flex flex-col py-4 text-sm md:text-base [@media(max-height:800px)]:min-[640px]:py-2">
              <div className="flex min-h-11 items-center justify-between gap-3 [@media(max-height:800px)]:min-[640px]:min-h-8">
                <dt className="flex shrink-0 items-center gap-3 text-muted-foreground"><PhoneIcon className="size-5 text-foreground" aria-hidden="true" />手机号码</dt>
                <dd className="flex min-w-0 items-center gap-1 tabular-nums">
                  <span className="truncate">{showPhone ? user.phone : maskPhone(user.phone)}</span>
                  <Button type="button" variant="ghost" size="icon-sm" className="text-brand" aria-label={showPhone ? "隐藏手机号码" : "显示手机号码"} onClick={() => setShowPhone((visible) => !visible)}>
                    {showPhone ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </dd>
              </div>
              <ProfileDetail icon={MailIcon} label="用户邮箱">{maskEmail(user.email)}</ProfileDetail>
              <ProfileDetail icon={Building2Icon} label="当前组织">{organization.name}</ProfileDetail>
              <ProfileDetail icon={BriefcaseBusinessIcon} label="岗位">{roleLabels[user.role]}</ProfileDetail>
              <ProfileDetail icon={Clock3Icon} label="创建时间">
                <span className="tabular-nums">{formatDateTime(user.createdAt, { timeZone: timezone })}</span>
              </ProfileDetail>
            </dl>
          </CardContent>
          <CardFooter className="mt-auto mx-8 border-t px-0 pb-4 pt-7 [@media(max-height:800px)]:min-[640px]:py-2 [@media(max-height:800px)]:min-[640px]:[&.border-t]:pt-2">
            <Button type="button" variant="outline" className="h-14 w-full [--button-font-size:16px] [@media(max-height:800px)]:min-[640px]:h-11 [@media(max-height:560px)]:min-[640px]:max-h-9" onClick={() => setLogoutOpen(true)}>
              <LogOutIcon data-icon="inline-start" />
              退出登录
            </Button>
          </CardFooter>
        </Card>

        <Card className="min-w-0 gap-0 py-0 xl:min-h-[624px] [@media(max-height:800px)]:min-[640px]:min-h-0">
          <CardHeader className="gap-2 px-6 pt-8 md:px-9 md:pt-9 [@media(max-height:800px)]:min-[640px]:pt-3 [@media(max-height:560px)]:min-[640px]:gap-y-0">
            <CardTitle className="text-2xl leading-normal">基本资料</CardTitle>
            <CardDescription className="text-base [@media(max-height:560px)]:min-[640px]:hidden">编辑您的个人资料信息。</CardDescription>
          </CardHeader>
          <form className="flex flex-1 flex-col" onSubmit={handleSave} noValidate>
            <CardContent className="px-6 pt-[30px] md:px-9 [@media(max-height:800px)]:min-[640px]:pt-[6px]">
              <FieldGroup className="gap-[26px] [@media(max-height:800px)]:min-[640px]:gap-[10px] [@media(max-height:560px)]:min-[640px]:gap-y-0.5 [@media(max-height:520px)]:min-[640px]:grid [@media(max-height:520px)]:min-[640px]:grid-cols-2 [@media(max-height:520px)]:min-[640px]:gap-x-3">
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="profile-name" className="text-base">姓名 <span className="text-destructive" aria-hidden="true">*</span></FieldLabel>
                  <InputGroup className="h-12 [@media(max-height:800px)]:min-[640px]:h-10 [@media(max-height:560px)]:min-[640px]:max-h-9">
                    <InputGroupAddon><UserRoundIcon className="size-5 text-muted-foreground" aria-hidden="true" /></InputGroupAddon>
                    <InputGroupInput id="profile-name" className="md:text-base" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "profile-name-error" : undefined} autoComplete="name" />
                  </InputGroup>
                  <FieldError id="profile-name-error">{errors.name}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.phone)}>
                  <FieldLabel htmlFor="profile-phone" className="text-base">手机号码 <span className="text-destructive" aria-hidden="true">*</span></FieldLabel>
                  <InputGroup className="h-12 [@media(max-height:800px)]:min-[640px]:h-10 [@media(max-height:560px)]:min-[640px]:max-h-9">
                    <InputGroupAddon><PhoneIcon className="size-5 text-muted-foreground" aria-hidden="true" /></InputGroupAddon>
                    <InputGroupInput id="profile-phone" className="md:text-base" type="tel" value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} aria-required="true" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "profile-phone-error" : undefined} autoComplete="tel" />
                  </InputGroup>
                  <FieldError id="profile-phone-error">{errors.phone}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.email)}>
                  <FieldLabel htmlFor="profile-email" className="text-base">用户邮箱</FieldLabel>
                  <InputGroup className="h-12 [@media(max-height:800px)]:min-[640px]:h-10 [@media(max-height:560px)]:min-[640px]:max-h-9">
                    <InputGroupAddon><MailIcon className="size-5 text-muted-foreground" aria-hidden="true" /></InputGroupAddon>
                    <InputGroupInput id="profile-email" className="md:text-base" type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "profile-email-error" : undefined} autoComplete="email" />
                  </InputGroup>
                  <FieldError id="profile-email-error">{errors.email}</FieldError>
                </Field>
                <FieldSet>
                  <FieldLegend variant="label" className="data-[variant=label]:text-base">性别</FieldLegend>
                  <RadioGroup value={draft.gender} onValueChange={(value) => updateDraft("gender", value as ProfileDraft["gender"])} className="flex items-center gap-6" aria-label="性别">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="profile-gender-male" value="male" />
                      <FieldLabel htmlFor="profile-gender-male" className="text-base">男</FieldLabel>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="profile-gender-female" value="female" />
                      <FieldLabel htmlFor="profile-gender-female" className="text-base">女</FieldLabel>
                    </div>
                  </RadioGroup>
                </FieldSet>
              </FieldGroup>
            </CardContent>
            <CardFooter className="mt-auto justify-end gap-3 px-6 pb-4 pt-8 md:px-9 [@media(max-height:800px)]:min-[640px]:py-2">
              <Button type="button" variant="outline" className="h-12 min-w-32 [--button-font-size:16px] [@media(max-height:800px)]:min-[640px]:h-10 [@media(max-height:560px)]:min-[640px]:max-h-9" onClick={handleReset}>
                <Undo2Icon data-icon="inline-start" />重置
              </Button>
              <Button type="submit" className="h-12 min-w-36 [--button-font-size:16px] [@media(max-height:800px)]:min-[640px]:h-10 [@media(max-height:560px)]:min-[640px]:max-h-9">
                <SaveIcon data-icon="inline-start" />保存
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认退出登录</DialogTitle>
            <DialogDescription>退出当前预览并返回登录页。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>取消</Button>
            <Button onClick={handleLogout}>确认退出</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function ProfileDetail({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 [@media(max-height:800px)]:min-[640px]:min-h-8">
      <dt className="flex shrink-0 items-center gap-3 text-muted-foreground"><Icon className="size-5 text-foreground" aria-hidden="true" />{label}</dt>
      <dd className="min-w-0 truncate text-right" title={typeof children === "string" ? children : undefined}>{children}</dd>
    </div>
  )
}
