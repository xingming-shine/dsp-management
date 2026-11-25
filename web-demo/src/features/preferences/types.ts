export type SupportedLocale = "zh-CN" | "en-US" | "es-ES"

export type DateFormat =
  | "HH:mm:ss dd/MM/yyyy"
  | "HH:mm:ss MM/dd/yyyy"
  | "MM/dd/yyyy HH:mm:ss"
  | "dd/MM/yyyy HH:mm:ss"
  | "yyyy/MM/dd HH:mm:ss"

export interface UserPreferences {
  locale: SupportedLocale
  timezone: string
  dateFormat: DateFormat
}
