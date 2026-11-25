/**
 * Prototype seed transcribed from 参考文档/超级管理员权限设计/DSP系统权限配置.xlsx.
 * The workbook has no permission codes. Existing codes are reused only where the
 * current prototype already has an unambiguous page code; mock.* codes are local
 * placeholders keyed by sheet row and must be bound to server codes before launch.
 */
export type MatrixPlatform = "web" | "app"
export type MatrixKind = "页面" | "操作" | "隐私字段"
export type PermissionMatrixRow = {
  sourceRow: number
  path: string[]
  kind: MatrixKind
  code: string
  allowed: string[]
}

// G–L on the Web sheet, F–J on the App sheet. S is the Web-only HQ role.
export const matrixRoleIds = ["role-owner", "role-manager", "role-finance", "role-support", "role-driver-lead", "role-super-manager"] as const
const [owner, manager, finance, support, driver, superManager] = matrixRoleIds
const web = (sourceRow: number, kind: MatrixKind, path: string[], code: string, allowed: string[]): PermissionMatrixRow => ({ sourceRow, kind, path, code, allowed })

export const permissionMatrix: Record<MatrixPlatform, PermissionMatrixRow[]> = {
  web: [
    web(3, "页面", ["实时看板"], "live_dashboard.read", [owner, manager]),
    web(4, "隐私字段", ["实时看板", "司机电话"], "mock.web.excel_04", [owner, manager]),
    web(5, "页面", ["数据驾驶舱"], "data_cockpit.read", [owner, manager]),
    web(6, "页面", ["运营管理", "派件运单查询"], "operations.waybill.read", [owner, manager]),
    web(7, "页面", ["运营管理", "轨迹查询"], "mock.web.excel_07", [owner, manager]),
    web(8, "页面", ["运营管理", "路由框绘制"], "mock.web.excel_08", [owner, manager]),
    web(9, "页面", ["运营管理", "签收"], "mock.web.excel_09", [owner, manager]),
    web(10, "页面", ["运营管理", "派送异常"], "mock.web.excel_10", [owner, manager]),
    web(11, "页面", ["工单/问题件"], "mock.web.excel_11", [owner, manager, support]),
    web(12, "页面", ["团队管理", "司机管理"], "team.driver.read", [owner, manager]),
    web(13, "页面", ["团队管理", "司机管理", "司机电话"], "mock.web.excel_13", [owner, manager]),
    web(14, "页面", ["团队管理", "其他员工管理"], "team.staff.read", [owner, manager, superManager]),
    web(15, "页面", ["财务结算", "账单管理"], "finance.bills.read", [owner, finance]),
    web(16, "页面", ["财务结算", "账单管理", "派费账单"], "mock.web.excel_16", [owner, finance]),
    web(17, "页面", ["财务结算", "账单管理", "理赔账单"], "mock.web.excel_17", [owner, finance]),
    web(18, "页面", ["财务结算", "账单管理", "开票申请单"], "mock.web.excel_18", [owner, finance]),
    web(19, "页面", ["财务结算", "GOFO报价"], "mock.web.excel_19", [owner, finance]),
    web(20, "页面", ["财务结算", "DSP提现模式管理"], "mock.web.excel_20", [owner, manager, finance]),
    web(21, "页面", ["财务结算", "司机提现模式管理"], "mock.web.excel_21", [owner, manager, finance]),
    web(22, "页面", ["财务结算", "财务结算小工具"], "mock.web.excel_22", [owner, finance]),
    web(23, "页面", ["我的", "个人中心"], "mock.web.excel_23", [owner, manager, finance, support]),
    web(24, "页面", ["我的", "个性化设置"], "mock.web.excel_24", [owner, manager, finance, support]),
    web(25, "页面", ["我的", "密码修改"], "mock.web.excel_25", [owner, manager, finance, support]),
    web(26, "页面", ["下载中心"], "mock.web.excel_26", [owner, manager, finance, support]),
    web(27, "页面", ["学习中心", "知识库"], "learning.knowledge.read", [owner, manager, finance, support]),
    web(28, "页面", ["学习中心", "学习记录"], "learning.records.read", [owner, manager, finance, support]),
    web(29, "页面", ["系统管理", "App版本发布"], "mock.web.excel_29", [superManager]),
    web(30, "页面", ["系统管理", "系统权限管理"], "mock.web.excel_30", [superManager]),
  ],
  app: [
    web(3, "页面", ["实时看版"], "app.dashboard.read", [owner, manager]),
    web(4, "隐私字段", ["实时看版", "司机电话"], "mock.app.excel_04", [owner, manager]),
    web(5, "页面", ["重点功能", "司机审核"], "mock.app.excel_05", [owner, manager]),
    web(6, "页面", ["重点功能", "问题件"], "mock.app.excel_06", [owner, manager]),
    web(7, "页面", ["重点功能", "POD不合规"], "mock.app.excel_07", [owner, manager]),
    web(8, "页面", ["工作区", "扫描分拣"], "mock.app.excel_08", [owner, manager, driver]),
    web(9, "页面", ["工作区", "货代分拣"], "mock.app.excel_09", [owner, manager]),
    web(10, "页面", ["工作区", "查单"], "app.waybill.read", [owner, manager, driver]),
    web(11, "页面", ["工作区", "签收"], "mock.app.excel_11", [owner, manager]),
    web(12, "页面", ["工作区", "派送异常"], "mock.app.excel_12", [owner, manager]),
    web(13, "页面", ["工作区", "POD修改"], "mock.app.excel_13", [owner, manager]),
    web(14, "页面", ["工作区", "POD核查"], "mock.app.excel_14", [owner, manager]),
    web(15, "页面", ["工作区", "重量稽核"], "mock.app.excel_15", []),
    web(16, "页面", ["任务"], "app.tasks.read", [owner, manager, driver]),
    web(17, "页面", ["运营数据"], "mock.app.excel_17", [owner, manager]),
    web(18, "页面", ["我的"], "mock.app.excel_18", [owner, manager]),
  ],
}

export const matrixLogin: Record<MatrixPlatform, Record<string, boolean>> = {
  web: { [owner]: true, [manager]: true, [finance]: true, [support]: true, [driver]: false, [superManager]: true },
  app: { [owner]: true, [manager]: true, [finance]: false, [support]: false, [driver]: true, [superManager]: false },
}
