import type { DriverWithdrawal } from "./model"

// Source prototype records, plus DRV-009 for an accessible pending-opening preview.
export const initialDrivers: DriverWithdrawal[] = [
  {
    "id": "DRV-001",
    "name": "张伟",
    "phone": "13812341234",
    "fleet": "洛杉矶车队",
    "type": "close",
    "applyTime": "2026-07-08T09:30:25-04:00",
    "auditTime": "",
    "latestOperationTime": "2026-07-08T09:30:25-04:00",
    "auditStatus": "pending",
    "modeStatus": "opened",
    "openTime": "2026-05-11T00:00:00-04:00",
    "closeTime": "",
    "plan": "STD-LAX-001 洛杉矶标准报价",
    "rejectReason": "",
    "logs": [
      {
        "time": "2026-07-08T09:30:25-04:00",
        "operator": "张伟",
        "action": "提交关闭申请"
      },
      {
        "time": "2026-05-10T14:30:25-04:00",
        "operator": "张经理",
        "action": "开通审核通过",
        "note": "分配计价模式：STD-LAX-001 洛杉矶标准报价"
      },
      {
        "time": "2026-05-10T09:30:25-04:00",
        "operator": "张伟",
        "action": "提交开通申请"
      }
    ]
  },
  {
    "id": "DRV-002",
    "name": "李娜",
    "phone": "13912345678",
    "fleet": "洛杉矶车队",
    "type": "open",
    "applyTime": "2026-07-08T10:15:42-04:00",
    "auditTime": "",
    "latestOperationTime": "2026-07-08T10:15:42-04:00",
    "auditStatus": "pending",
    "modeStatus": "unopened",
    "openTime": "",
    "closeTime": "",
    "plan": "",
    "rejectReason": "",
    "restricted": true,
    "logs": [
      {
        "time": "2026-07-08T10:15:42-04:00",
        "operator": "李娜",
        "action": "提交开通申请"
      }
    ]
  },
  {
    "id": "DRV-003",
    "name": "王强",
    "phone": "13688889012",
    "fleet": "旧金山车队",
    "type": "close",
    "applyTime": "2026-07-08T14:24:18-04:00",
    "auditTime": "2026-07-08T15:05:44-04:00",
    "latestOperationTime": "2026-07-08T15:05:44-04:00",
    "auditStatus": "approved",
    "modeStatus": "closing_pending_effective",
    "openTime": "2026-04-19T00:00:00-04:00",
    "closeTime": "2026-07-09T00:00:00-04:00",
    "plan": "STD-SFO-002 旧金山快递报价",
    "rejectReason": "",
    "logs": [
      {
        "time": "2026-07-08T15:05:44-04:00",
        "operator": "张经理",
        "action": "关闭审核通过",
        "effectiveTime": "2026-07-09T00:00:00-04:00",
        "note": "提现模式关闭时间"
      },
      {
        "time": "2026-07-08T14:24:18-04:00",
        "operator": "王强",
        "action": "提交关闭申请"
      },
      {
        "time": "2026-04-18T14:30:25-04:00",
        "operator": "张经理",
        "action": "开通审核通过",
        "note": "分配计价模式：STD-SFO-002 旧金山快递报价"
      },
      {
        "time": "2026-04-18T09:00:15-04:00",
        "operator": "王强",
        "action": "提交开通申请"
      }
    ]
  },
  {
    "id": "DRV-004",
    "name": "赵敏",
    "phone": "13745673456",
    "fleet": "旧金山车队",
    "type": "close",
    "applyTime": "2026-07-06T11:20:36-04:00",
    "auditTime": "2026-07-06T11:45:09-04:00",
    "latestOperationTime": "2026-07-06T11:45:09-04:00",
    "auditStatus": "rejected",
    "modeStatus": "opened",
    "openTime": "2026-03-28T00:00:00-04:00",
    "closeTime": "",
    "plan": "STD-SFO-002 旧金山快递报价",
    "rejectReason": "司机当前仍有未完成提现结算，请完成结算后再提交关闭申请。",
    "logs": [
      {
        "time": "2026-07-06T11:45:09-04:00",
        "operator": "张经理",
        "action": "关闭审核不通过",
        "reason": "司机当前仍有未完成提现结算"
      },
      {
        "time": "2026-07-06T11:20:36-04:00",
        "operator": "赵敏",
        "action": "提交关闭申请"
      },
      {
        "time": "2026-03-27T16:40:11-04:00",
        "operator": "张经理",
        "action": "开通审核通过",
        "note": "分配计价模式：STD-SFO-002 旧金山快递报价"
      },
      {
        "time": "2026-03-27T10:05:22-04:00",
        "operator": "赵敏",
        "action": "提交开通申请"
      }
    ]
  },
  {
    "id": "DRV-005",
    "name": "陈晨",
    "phone": "13512347890",
    "fleet": "西雅图车队",
    "type": "close",
    "applyTime": "2026-07-05T09:00:55-04:00",
    "auditTime": "2026-07-05T10:12:31-04:00",
    "latestOperationTime": "2026-07-05T10:12:31-04:00",
    "auditStatus": "approved",
    "modeStatus": "closed",
    "openTime": "2026-02-08T00:00:00-05:00",
    "closeTime": "2026-07-06T00:00:00-04:00",
    "plan": "STD-SEA-003 西雅图经济报价",
    "rejectReason": "",
    "logs": [
      {
        "time": "2026-07-05T10:12:31-04:00",
        "operator": "系统",
        "action": "DSP关闭提现模式",
        "effectiveTime": "2026-07-06T00:00:00-04:00",
        "note": "提现模式关闭时间"
      },
      {
        "time": "2026-02-07T11:08:22-05:00",
        "operator": "张经理",
        "action": "开通审核通过",
        "note": "分配计价模式：STD-SEA-003 西雅图经济报价"
      },
      {
        "time": "2026-02-07T09:20:10-05:00",
        "operator": "陈晨",
        "action": "提交开通申请"
      }
    ]
  },
  {
    "id": "DRV-006",
    "name": "刘洋",
    "phone": "13398762345",
    "fleet": "洛杉矶车队",
    "type": "open",
    "applyTime": "2026-07-04T09:00:18-04:00",
    "auditTime": "2026-07-04T09:32:20-04:00",
    "latestOperationTime": "2026-07-04T09:32:20-04:00",
    "auditStatus": "approved",
    "modeStatus": "opened",
    "openTime": "2026-07-05T00:00:00-04:00",
    "closeTime": "",
    "plan": "STD-LAX-001 洛杉矶标准报价",
    "rejectReason": "",
    "logs": [
      {
        "time": "2026-07-04T09:32:20-04:00",
        "operator": "张经理",
        "action": "开通审核通过",
        "note": "分配计价模式：STD-LAX-001 洛杉矶标准报价"
      },
      {
        "time": "2026-07-04T09:00:18-04:00",
        "operator": "刘洋",
        "action": "提交开通申请"
      }
    ]
  },
  {
    "id": "DRV-007",
    "name": "孙丽",
    "phone": "13122226789",
    "fleet": "西雅图车队",
    "type": "open",
    "applyTime": "2026-07-08T10:30:03-04:00",
    "auditTime": "2026-07-08T11:02:41-04:00",
    "latestOperationTime": "2026-07-08T11:02:41-04:00",
    "auditStatus": "approved",
    "modeStatus": "opened",
    "openTime": "2026-07-09T00:00:00-04:00",
    "closeTime": "",
    "plan": "STD-SEA-003 西雅图经济报价",
    "rejectReason": "",
    "logs": [
      {
        "time": "2026-07-08T11:02:41-04:00",
        "operator": "张经理",
        "action": "开通审核通过",
        "note": "分配计价模式：STD-SEA-003 西雅图经济报价"
      },
      {
        "time": "2026-07-08T10:30:03-04:00",
        "operator": "孙丽",
        "action": "提交开通申请"
      }
    ]
  },
  {
    "id": "DRV-008",
    "name": "周杰",
    "phone": "13255550123",
    "fleet": "旧金山车队",
    "type": "open",
    "applyTime": "2026-07-02T11:45:59-04:00",
    "auditTime": "2026-07-02T12:10:08-04:00",
    "latestOperationTime": "2026-07-02T12:10:08-04:00",
    "auditStatus": "rejected",
    "modeStatus": "closed",
    "openTime": "2026-01-16T00:00:00-05:00",
    "closeTime": "2026-06-20T00:00:00-04:00",
    "plan": "STD-SFO-002 旧金山快递报价",
    "rejectReason": "司机注册时间不足，需满足30天以上运营经验后可申请开通。",
    "logs": [
      {
        "time": "2026-07-02T12:10:08-04:00",
        "operator": "张经理",
        "action": "开通审核不通过",
        "reason": "司机注册时间不足"
      },
      {
        "time": "2026-07-02T11:45:59-04:00",
        "operator": "周杰",
        "action": "提交开通申请"
      },
      {
        "time": "2026-06-19T14:22:10-04:00",
        "operator": "系统",
        "action": "DSP关闭提现模式",
        "effectiveTime": "2026-06-20T00:00:00-04:00",
        "note": "提现模式关闭时间"
      },
      {
        "time": "2026-01-15T15:05:18-05:00",
        "operator": "张经理",
        "action": "开通审核通过",
        "note": "分配计价模式：STD-SFO-002 旧金山快递报价"
      },
      {
        "time": "2026-01-15T10:30:40-05:00",
        "operator": "周杰",
        "action": "提交开通申请"
      }
    ]
  },
  {
    "id": "DRV-009",
    "name": "唐悦",
    "phone": "13456789012",
    "fleet": "洛杉矶车队",
    "type": "open",
    "applyTime": "2026-07-08T08:45:20-04:00",
    "auditTime": "",
    "latestOperationTime": "2026-07-08T08:45:20-04:00",
    "auditStatus": "pending",
    "modeStatus": "unopened",
    "openTime": "",
    "closeTime": "",
    "plan": "",
    "rejectReason": "",
    "logs": [
      {
        "time": "2026-07-08T08:45:20-04:00",
        "operator": "唐悦",
        "action": "提交开通申请"
      }
    ]
  }
]
