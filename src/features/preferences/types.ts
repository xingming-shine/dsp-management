export type SupportedLocale = "zh-CN" | "en-US" | "es-ES"

export type DateFormat =
  | "YYYY-MM-DD"
  | "MM/DD/YYYY"
  | "DD/MM/YYYY"
  | "YYYY年MM月DD日"
  | "MM-DD-YYYY"
  | "DD.MM.YYYY"

export interface UserPreferences {
  locale: SupportedLocale
  timezone: string
  dateFormat: DateFormat
}
