export type LearningStatus = "待学习" | "学习中" | "已完成"
export type LearningType = "图文" | "PPT" | "视频" | "外部链接"

export type LearningContent =
  | { kind: "slides"; slides: { title: string; subtitle?: string; points?: string[]; image?: { src: string; alt: string } }[] }
  | { kind: "article"; sections: { heading: string; paragraphs?: string[]; points?: string[]; image?: { src: string; alt: string; caption?: string } }[] }
  | { kind: "video"; src?: string; poster?: string; captions?: string; chapters?: { time: string; title: string }[] }
  | { kind: "external"; url?: string; source?: string; summary?: string }

export interface LearningItem {
  id: string
  title: string
  category: string
  tags: string[]
  type: LearningType
  version: number
  required?: boolean
  downloadable?: boolean
  downloadAsset?: { url: string; fileName: string; format: string }
  archived?: boolean
  new?: boolean
  status: LearningStatus
  minutes: number
  duration: number
  publishedAt: string
  completedAt?: string
  recentlyViewedAt?: string
  description: string
  content?: LearningContent
}

export const learningItems: LearningItem[] = [
  { id: "account", title: "DSP 注册与账号开通指南", category: "新手入门", tags: ["开户"], type: "图文", version: 1, required: true, status: "已完成", minutes: 28, duration: 28, publishedAt: "2026-05-28", completedAt: "2026-06-02", recentlyViewedAt: "2026-08-23", description: "了解 DSP 账号申请、资料提交、审核及首次登录的完整流程。", content: { kind: "article", sections: [
    { heading: "开通前准备", paragraphs: ["确认 DSP 主体信息、管理员联系方式和拟使用的登录邮箱。提交前核对资料上的主体名称是否一致。"], points: ["准备企业基本资料和管理员身份信息。", "确认邮箱及手机号可接收验证消息。"] },
    { heading: "申请与审核", paragraphs: ["由管理员填写申请信息并提交资料。审核结果会通过平台消息或预留联系方式通知。"], points: ["资料不完整时按提示补齐后重新提交。", "审核通过后使用预留邮箱完成首次登录。"], image: { src: "/assets/learning/account-flow.svg", alt: "账号开通流程：准备资料、提交申请、等待审核、首次登录", caption: "账号开通的四个主要步骤" } },
    { heading: "首次登录检查", paragraphs: ["登录后核对组织信息、成员权限及通知方式，再开始日常操作。"] },
  ] } },
  { id: "onboarding", title: "司机入职标准流程 SOP", category: "新手入门", tags: ["入职"], type: "视频", version: 1, required: true, downloadable: true, status: "已完成", minutes: 30, duration: 30, publishedAt: "2026-05-30", completedAt: "2026-06-05", recentlyViewedAt: "2026-08-22", description: "覆盖司机入职资料核验、账号开通、培训和上岗检查。" },
  { id: "dsp-app", title: "App 操作手册 - DSP 管理端", category: "操作手册", tags: ["操作"], type: "图文", version: 1, status: "学习中", minutes: 12, duration: 20, publishedAt: "2026-06-10", recentlyViewedAt: "2026-08-24", description: "熟悉 DSP 管理端的任务、团队、数据和结算入口。", content: { kind: "article", sections: [
    { heading: "工作台", paragraphs: ["登录管理端后，先在工作台核对今日任务、待处理提醒和团队状态。"], points: ["从任务入口查看待分配和异常任务。", "从团队入口查看成员与司机状态。"] },
    { heading: "数据与结算", paragraphs: ["数据驾驶舱用于查看趋势与表现；结算入口用于核对账单与明细。操作前确认当前选择的 DSP 主体。"] },
  ] } },
  { id: "driver-app", title: "App 操作手册 - 司机端", category: "操作手册", tags: ["操作"], type: "视频", version: 1, downloadable: true, status: "已完成", minutes: 25, duration: 25, publishedAt: "2026-06-10", completedAt: "2026-06-20", recentlyViewedAt: "2026-08-20", description: "演示司机端接单、导航、扫描和签收等日常操作。" },
  { id: "route", title: "快递派送路线优化技巧", category: "配送秘籍", tags: ["效率"], type: "视频", version: 1, downloadable: true, status: "已完成", minutes: 40, duration: 40, publishedAt: "2026-06-22", completedAt: "2026-07-02", recentlyViewedAt: "2026-08-19", description: "结合派送密度、时间窗和异常件调整每日路线。" },
  { id: "peak", title: "高峰期配送应对策略", category: "配送秘籍", tags: ["效率"], type: "PPT", version: 2.3, downloadable: true, status: "待学习", minutes: 0, duration: 15, publishedAt: "2026-07-01", description: "介绍高峰期的运力预估、分流、派件节奏和异常处理。", content: { kind: "slides", slides: [
    { title: "高峰期配送应对策略", subtitle: "配送秘籍 · 团队培训", points: ["提前预估运力", "按片区分流", "控制派件节奏", "及时处理异常"] },
    { title: "先做运力预估", subtitle: "01 / 准备", points: ["核对预计件量与可用司机人数。", "识别高密度片区、集中到站时段和时间窗订单。", "为临时缺勤与异常件预留缓冲。"] },
    { title: "按片区与时段分流", subtitle: "02 / 调度", points: ["优先处理有明确时限的任务。", "将高密度片区拆分为可执行的路线。", "动态调整人手，避免某条路线持续积压。"] },
    { title: "异常及时回传", subtitle: "03 / 复盘", points: ["无法按时完成时及时标记原因并通知调度。", "交接时保留任务状态与处理记录。", "收工后复盘积压原因，调整次日计划。"] },
  ] } },
  { id: "pod", title: "POD 拍摄合规四步法（环境/门牌/包裹/面单）", category: "近期重点", tags: ["POD", "合规"], type: "视频", version: 2, required: true, downloadable: true, new: true, status: "学习中", minutes: 9, duration: 20, publishedAt: "2026-08-25", recentlyViewedAt: "2026-08-28", description: "按环境、门牌、包裹、面单四步留存清晰完整的签收凭证。" },
  { id: "timeliness", title: "配送时效与考核标准", category: "配送秘籍", tags: ["考核"], type: "图文", version: 1, status: "已完成", minutes: 20, duration: 20, publishedAt: "2026-07-10", completedAt: "2026-08-01", recentlyViewedAt: "2026-08-01", description: "理解时效口径、主要考核指标和常见异常的处理要求。", content: { kind: "article", sections: [
    { heading: "查看时效", paragraphs: ["以任务详情中的承诺时间和实际完成时间为准，核对任务是否在要求的时间窗内完成。"] },
    { heading: "处理异常", points: ["发现无法按时完成的任务时，及时记录原因。", "将异常同步给调度，并保留相关操作记录。", "复盘高频异常，调整路线与排班。"] },
  ] } },
  { id: "contractor", title: "1099 承包商合规要点", category: "法律法规", tags: ["合规", "保险"], type: "外部链接", version: 2.3, status: "待学习", minutes: 0, duration: 10, publishedAt: "2026-08-20", description: "梳理承包商身份、合作协议、保险和记录保存的基础要点。", content: { kind: "external", url: "https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-defined", source: "美国国税局 IRS", summary: "阅读 IRS 关于独立承包商身份判定的公开说明。合作协议、保险及记录保存要求请以适用的合同和公司制度为准。" } },
  { id: "rewards", title: "司机星级与提现权益说明", category: "权益奖励", tags: ["提现"], type: "图文", version: 1, downloadable: true, downloadAsset: { url: "/assets/learning/rewards-v1.md", fileName: "司机星级与提现权益说明-v1.md", format: "Markdown" }, status: "已完成", minutes: 8, duration: 8, publishedAt: "2026-08-08", completedAt: "2026-08-18", recentlyViewedAt: "2026-08-18", description: "说明星级评定方式以及相关提现权益。", content: { kind: "article", sections: [
    { heading: "星级信息", paragraphs: ["在司机权益页面查看当前星级、评定周期与平台展示的计算说明。星级变化以页面记录为准。"] },
    { heading: "提现权益", paragraphs: ["在发起提现前核对可用余额、提现条件和预计到账说明。具体权益以当前页面展示的规则为准。"] },
  ] } },
  { id: "rules", title: "平台服务协议与规则解读", category: "平台规则", tags: ["规则"], type: "外部链接", version: 2.3, new: true, status: "待学习", minutes: 0, duration: 12, publishedAt: "2026-08-26", description: "查看平台服务协议的关键条款与运营规则。" },
  { id: "season", title: "旺季爆仓应对与临时加人流程", category: "近期重点", tags: ["效率", "旺季"], type: "视频", version: 2.3, new: true, downloadable: true, status: "待学习", minutes: 0, duration: 18, publishedAt: "2026-08-27", description: "说明旺季临时运力申请、入场、培训和现场调度流程。" },
  { id: "insurance", title: "车辆保险与事故上报指引", category: "法律法规", tags: ["保险", "合规"], type: "图文", version: 1, required: true, status: "学习中", minutes: 6, duration: 16, publishedAt: "2026-08-15", recentlyViewedAt: "2026-08-26", description: "了解车辆保险资料检查、事故现场处置与上报节点。", content: { kind: "article", sections: [
    { heading: "出车前核对", points: ["确认车辆保险资料在有效期内。", "核对车辆与驾驶人员信息是否匹配。", "发现资料缺失时先联系负责人处理。"] },
    { heading: "事故发生后", paragraphs: ["优先保障人员安全，并按公司流程联系负责人和相关服务机构。保留必要的现场信息与时间记录。"], points: ["及时上报事故地点、时间和基本情况。", "后续材料按公司要求提交与留存。"] },
  ] } },
  { id: "cockpit", title: "数据驾驶舱功能导览", category: "操作手册", tags: ["操作"], type: "视频", version: 2.3, status: "待学习", minutes: 0, duration: 14, publishedAt: "2026-08-18", description: "学习查看数据驾驶舱的核心指标、趋势和团队表现。" },
  { id: "pod-old", title: "旧版 POD 拍摄指引（v1）", category: "平台规则", tags: ["POD", "合规"], type: "视频", version: 1, required: true, archived: true, status: "已完成", minutes: 15, duration: 15, publishedAt: "2026-04-01", completedAt: "2026-04-20", description: "历史版本，仅供查阅；当前学习进度以新版内容为准。" },
]

export const learningCategories = ["全部", "新手入门", "操作手册", "配送秘籍", "近期重点", "平台规则", "法律法规", "权益奖励"]
export const learningTags = ["开户", "入职", "操作", "效率", "POD", "合规", "考核", "保险", "提现", "规则", "旺季"]

export interface DownloadRecord {
  id: string
  itemId: string
  version: number
  account: string
  downloadedAt: string
  note?: string
  fileName?: string
  fileFormat?: string
  fileUrl?: string
}

export const initialDownloadRecords: DownloadRecord[] = [
  { id: "dl-1", itemId: "onboarding", version: 1, account: "张老板", downloadedAt: "2026-08-28T09:12:00-04:00", note: "已分发司机群" },
  { id: "dl-2", itemId: "driver-app", version: 1, account: "ops.李", downloadedAt: "2026-08-27T20:41:00-04:00", note: "—" },
  { id: "dl-3", itemId: "pod", version: 2, account: "张老板", downloadedAt: "2026-08-25T08:30:00-04:00", note: "晨会播放" },
  { id: "dl-4", itemId: "route", version: 1, account: "张老板", downloadedAt: "2026-08-18T17:02:00-04:00", note: "—" },
]
