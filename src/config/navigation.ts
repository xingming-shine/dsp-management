import type { LucideIcon } from "lucide-react"
import {
  AlertTriangleIcon,
  BarChart3Icon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DollarSignIcon,
  FileCheck2Icon,
  GaugeIcon,
  HistoryIcon,
  HouseIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  MonitorIcon,
  PencilRulerIcon,
  RouteIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

export type NavigationStatus = "available" | "planned"

export interface NavigationItem {
  id: string
  label: string
  icon?: LucideIcon
  href?: string
  permission?: string
  status?: NavigationStatus
  children?: NavigationItem[]
}

export const utilityRouteLabels: Record<string, string> = {
  "/basic/downloads": "下载中心",
  "/my/profile": "个人资料",
  "/my/password": "密码修改",
  "/my/date-format": "日期格式",
}

export const primaryNavigation: NavigationItem[] = [
  {
    id: "home",
    label: "首页",
    icon: HouseIcon,
    href: "/",
    status: "available",
  },
  {
    id: "live-dashboard",
    label: "实时看板",
    icon: MonitorIcon,
    children: [
      {
        id: "live-dashboard-overview",
        label: "实时看板",
        icon: MonitorIcon,
        href: "/live-dashboard",
        permission: "live_dashboard.read",
        status: "available",
      },
    ],
  },
  {
    id: "data-cockpit",
    label: "数据驾舱",
    icon: GaugeIcon,
    children: [
      {
        id: "data-cockpit-overview",
        label: "数据驾舱",
        icon: GaugeIcon,
        href: "/data-cockpit",
        permission: "data_cockpit.read",
        status: "available",
      },
    ],
  },
  {
    id: "operations",
    label: "运营管理",
    icon: LayoutDashboardIcon,
    children: [
      {
        id: "waybill-query",
        label: "派件运单查询",
        icon: SearchIcon,
        permission: "operations.waybill.read",
        status: "planned",
      },
      {
        id: "track-query",
        label: "轨迹查询",
        icon: RouteIcon,
        permission: "operations.track.read",
        status: "planned",
      },
      {
        id: "operation-log",
        label: "操作日志查询",
        icon: HistoryIcon,
        permission: "operations.log.read",
        status: "planned",
      },
      {
        id: "route-area",
        label: "路区管理",
        icon: MapPinIcon,
        permission: "operations.route_area.read",
        status: "planned",
      },
      {
        id: "route-planning",
        label: "路线规划",
        children: [
          {
            id: "delivery-task-list",
            label: "派件任务列表",
            icon: ClipboardListIcon,
            permission: "operations.delivery_task.read",
            status: "planned",
          },
          {
            id: "route-planning-query",
            label: "路线规划查询",
            icon: RouteIcon,
            permission: "operations.route_plan.read",
            status: "planned",
          },
        ],
      },
      {
        id: "address-operations",
        label: "地址运营",
        children: [
          {
            id: "risk-address",
            label: "风险地址库",
            icon: AlertTriangleIcon,
            permission: "operations.risk_address.read",
            status: "planned",
          },
          {
            id: "address-coordinate",
            label: "派件地址经纬度修改",
            icon: MapPinIcon,
            permission: "operations.address_coordinate.edit",
            status: "planned",
          },
        ],
      },
      {
        id: "scan-management",
        label: "扫描管理",
        children: [
          {
            id: "sign",
            label: "签收",
            icon: CheckCircle2Icon,
            permission: "operations.sign.read",
            status: "planned",
          },
          {
            id: "delivery-exception",
            label: "派送异常",
            icon: AlertTriangleIcon,
            permission: "operations.delivery_exception.read",
            status: "planned",
          },
          {
            id: "pod-edit",
            label: "修改POD",
            icon: PencilRulerIcon,
            permission: "operations.pod.edit",
            status: "planned",
          },
        ],
      },
      {
        id: "pod-review",
        label: "POD审核",
        icon: FileCheck2Icon,
        permission: "operations.pod.review",
        status: "planned",
      },
    ],
  },
  {
    id: "service-quality",
    label: "服务质量",
    icon: MessageSquareTextIcon,
    children: [
      {
        id: "pending-tickets",
        label: "待处理工单/问题件",
        icon: ClipboardCheckIcon,
        permission: "service.ticket.handle",
        status: "planned",
      },
      {
        id: "ticket-query",
        label: "工单/问题件查询",
        icon: SearchIcon,
        permission: "service.ticket.read",
        status: "planned",
      },
    ],
  },
  {
    id: "team",
    label: "团队管理",
    icon: UsersIcon,
    children: [
      {
        id: "driver-review",
        label: "司机审核",
        icon: ClipboardCheckIcon,
        permission: "team.driver.review",
        status: "planned",
      },
      {
        id: "driver-archive",
        label: "司机档案",
        icon: UsersIcon,
        permission: "team.driver.read",
        status: "planned",
      },
      {
        id: "driver-performance",
        label: "司机表现",
        icon: BarChart3Icon,
        permission: "team.driver_performance.read",
        status: "planned",
      },
      {
        id: "attendance-schedule",
        label: "假勤与排班（挂起）",
        children: [
          {
            id: "attendance",
            label: "假勤",
            icon: CalendarDaysIcon,
            permission: "team.attendance.read",
            status: "planned",
          },
          {
            id: "schedule",
            label: "排班",
            icon: LayoutGridIcon,
            permission: "team.schedule.read",
            status: "planned",
          },
        ],
      },
      {
        id: "staff",
        label: "其他员工管理",
        icon: SettingsIcon,
        permission: "team.staff.read",
        status: "planned",
      },
    ],
  },
  {
    id: "finance",
    label: "财务结算",
    icon: DollarSignIcon,
    children: [
      {
        id: "finance-settlement",
        label: "财务结算",
        icon: DollarSignIcon,
        permission: "finance.settlement.read",
        status: "planned",
      },
      {
        id: "dsp-withdrawal-mode",
        label: "DSP提现模式管理",
        icon: WalletIcon,
        href: "/finance/withdrawal-mode",
        permission: "finance.settlement.read",
        status: "available",
      },
      {
        id: "driver-withdrawal-mode",
        label: "司机提现模式管理",
        icon: WalletIcon,
        href: "/finance/driver-withdrawal-mode",
        permission: "finance.settlement.read",
        status: "available",
      },
    ],
  },
  {
    id: "learning",
    label: "学习中心",
    icon: BookOpenIcon,
    children: [
      {
        id: "knowledge-base",
        label: "知识库",
        icon: BookOpenIcon,
        permission: "learning.knowledge.read",
        status: "planned",
      },
      {
        id: "learning-records",
        label: "学习记录",
        icon: ClipboardListIcon,
        permission: "learning.records.read",
        status: "planned",
      },
    ],
  },
]
