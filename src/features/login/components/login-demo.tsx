"use client"

import { useState, type FormEvent } from "react"
import { EyeIcon, EyeOffIcon, RefreshCwIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Locale = "zh" | "en" | "es"
type ErrorKey = "phone" | "password" | "captcha" | "consent"

const copy = {
  zh: {
    title: "登录",
    subtitle: "开启您的配送旅程",
    system: "DSP Management System",
    phone: "手机号",
    phonePlaceholder: "请输入手机号",
    password: "密码",
    passwordPlaceholder: "请输入密码",
    captcha: "验证码",
    captchaPlaceholder: "请输入验证码",
    remember: "记住密码",
    submit: "登录",
    consentStart: "我已阅读并同意",
    terms: "《服务条款》",
    consentMiddle: "和",
    privacy: "《隐私政策》",
    phoneError: "请输入有效的手机号",
    passwordError: "请输入密码",
    captchaError: "验证码不正确，请重新输入",
    consentError: "请先同意服务条款和隐私政策",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    refreshCaptcha: "更换验证码",
    policyHint: "正式接入时将打开对应协议页面。",
  },
  en: {
    title: "Sign in",
    subtitle: "Your delivery journey starts here",
    system: "DSP Management System",
    phone: "Phone number",
    phonePlaceholder: "Enter your phone number",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    captcha: "Verification code",
    captchaPlaceholder: "Enter the code",
    remember: "Remember me",
    submit: "Sign in",
    consentStart: "I have read and agree to the",
    terms: "Terms of Service",
    consentMiddle: "and",
    privacy: "Privacy Policy",
    phoneError: "Enter a valid phone number",
    passwordError: "Enter your password",
    captchaError: "The code is incorrect. Try again.",
    consentError: "Please agree to the terms and privacy policy",
    showPassword: "Show password",
    hidePassword: "Hide password",
    refreshCaptcha: "Get a new code",
    policyHint: "The corresponding policy page will open when connected.",
  },
  es: {
    title: "Iniciar sesión",
    subtitle: "Comience su viaje de entregas",
    system: "DSP Management System",
    phone: "Número de teléfono",
    phonePlaceholder: "Introduzca su número",
    password: "Contraseña",
    passwordPlaceholder: "Introduzca su contraseña",
    captcha: "Código de verificación",
    captchaPlaceholder: "Introduzca el código",
    remember: "Recordarme",
    submit: "Iniciar sesión",
    consentStart: "He leído y acepto los",
    terms: "Términos de servicio",
    consentMiddle: "y la",
    privacy: "Política de privacidad",
    phoneError: "Introduzca un número válido",
    passwordError: "Introduzca su contraseña",
    captchaError: "El código no coincide. Inténtelo de nuevo.",
    consentError: "Acepte los términos y la política de privacidad",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    refreshCaptcha: "Cambiar código",
    policyHint: "La página de la política estará disponible al conectarla.",
  },
} as const

const captchaCodes = ["7K3P", "M8Q2", "R4X7", "9T6N"]

export function LoginDemo() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>("zh")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [captchaInput, setCaptchaInput] = useState("")
  const [captchaIndex, setCaptchaIndex] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, boolean>>>({})
  const [status, setStatus] = useState<"policy" | null>(null)
  const t = copy[locale]

  function clearError(key: ErrorKey) {
    setErrors((current) => ({ ...current, [key]: false }))
    setStatus(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = {
      phone: !/^\+?[0-9][0-9\s-]{6,17}$/.test(phone.trim()),
      password: password.trim().length === 0,
      captcha: captchaInput.trim().toUpperCase() !== captchaCodes[captchaIndex],
      consent: !consent,
    }
    setErrors(nextErrors)
    setStatus(null)
    if (!Object.values(nextErrors).some(Boolean)) {
      router.replace("/")
    }
  }

  return (
    <main className="login-demo" lang={locale === "zh" ? "zh-CN" : locale}>
      <svg className="login-demo__logo-filter" aria-hidden="true" width="0" height="0">
        <filter id="gofo-logo-cutout" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 -1 1 0"
          />
        </filter>
      </svg>
      <div aria-hidden="true" className="login-demo__scene" />

      <header className="login-demo__header">
        <div className="login-demo__logo" role="img" aria-label="GOFO" />
        <nav aria-label="Language" className="login-demo__languages">
          <ToggleGroup
            type="single"
            value={locale}
            onValueChange={(value) => {
              if (value === "zh" || value === "en" || value === "es") {
                setLocale(value)
                setStatus(null)
              }
            }}
          >
            <ToggleGroupItem value="zh" aria-label="中文">中文</ToggleGroupItem>
            <ToggleGroupItem value="en" aria-label="English">EN</ToggleGroupItem>
            <ToggleGroupItem value="es" aria-label="Español">ES</ToggleGroupItem>
          </ToggleGroup>
        </nav>
      </header>

      <div className="login-demo__layout">
        <div className="login-demo__art-space" aria-hidden="true" />
        <section className="login-demo__panel" aria-labelledby="login-demo-title">
          <div className="login-demo__intro">
            <h1 id="login-demo-title">{t.title}</h1>
            <p>{t.subtitle}</p>
            <span>{t.system}</span>
          </div>

          <form className="login-demo__form" noValidate onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={errors.phone || undefined}>
                <FieldLabel htmlFor="login-demo-phone">{t.phone}</FieldLabel>
                <Input
                  id="login-demo-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => { setPhone(event.target.value); clearError("phone") }}
                  placeholder={t.phonePlaceholder}
                  aria-invalid={errors.phone || undefined}
                  aria-describedby={errors.phone ? "login-demo-phone-error" : undefined}
                />
                <FieldError id="login-demo-phone-error">{errors.phone ? t.phoneError : null}</FieldError>
              </Field>

              <Field data-invalid={errors.password || undefined}>
                <FieldLabel htmlFor="login-demo-password">{t.password}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="login-demo-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); clearError("password") }}
                    placeholder={t.passwordPlaceholder}
                    aria-invalid={errors.password || undefined}
                    aria-describedby={errors.password ? "login-demo-password-error" : undefined}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={showPassword ? t.hidePassword : t.showPassword}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError id="login-demo-password-error">{errors.password ? t.passwordError : null}</FieldError>
              </Field>

              <Field data-invalid={errors.captcha || undefined}>
                <FieldLabel htmlFor="login-demo-captcha">{t.captcha}</FieldLabel>
                <div className="login-demo__captcha-row">
                  <Input
                    id="login-demo-captcha"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    maxLength={4}
                    value={captchaInput}
                    onChange={(event) => { setCaptchaInput(event.target.value.toUpperCase()); clearError("captcha") }}
                    placeholder={t.captchaPlaceholder}
                    aria-invalid={errors.captcha || undefined}
                    aria-describedby={errors.captcha ? "login-demo-captcha-error" : undefined}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="login-demo__captcha"
                    aria-label={`${t.refreshCaptcha}: ${captchaCodes[captchaIndex]}`}
                    onClick={() => {
                      setCaptchaIndex((current) => (current + 1) % captchaCodes.length)
                      setCaptchaInput("")
                      clearError("captcha")
                    }}
                  >
                    <span aria-hidden="true">{captchaCodes[captchaIndex]}</span>
                    <RefreshCwIcon aria-hidden="true" />
                  </Button>
                </div>
                <FieldError id="login-demo-captcha-error">{errors.captcha ? t.captchaError : null}</FieldError>
              </Field>
            </FieldGroup>

            <div className="login-demo__remember">
              <Checkbox id="login-demo-remember" checked={remember} onCheckedChange={(value) => setRemember(value === true)} />
              <FieldLabel htmlFor="login-demo-remember">{t.remember}</FieldLabel>
            </div>

            <Button className="login-demo__submit" type="submit" size="lg">{t.submit}</Button>

            <div className="login-demo__consent">
              <Checkbox
                id="login-demo-consent"
                checked={consent}
                aria-invalid={errors.consent || undefined}
                onCheckedChange={(value) => { setConsent(value === true); clearError("consent") }}
              />
              <div className="login-demo__consent-copy">
                <label htmlFor="login-demo-consent">{t.consentStart} </label>
                <button type="button" onClick={() => setStatus("policy")}>{t.terms}</button>
                {" "}{t.consentMiddle}{" "}
                <button type="button" onClick={() => setStatus("policy")}>{t.privacy}</button>
              </div>
            </div>
            <FieldError>{errors.consent ? t.consentError : null}</FieldError>
            {status === "policy" && (
              <p className="login-demo__status" role="status" data-status={status}>
                {t.policyHint}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}
