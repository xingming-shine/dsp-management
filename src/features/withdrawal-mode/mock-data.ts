import type { Application } from "./model"

// The reference HTML supplies these demonstration applications and audit histories.
export const initialApplications: Application[] = [
  {
    "id": "1001",
    "dspName": "Fast Logistics Inc.",
    "fleetName": "洛杉矶车队",
    "businessType": "LLC",
    "applicationType": "open",
    "latestOperationDate": "2026-07-08",
    "firstOpenApplyDate": "2026-06-15",
    "auditStatus": "pending_business",
    "modeStatus": "unopened",
    "position": "CEO",
    "address": "123 Main St, Los Angeles, CA",
    "birthday": "1985-03-15",
    "closeReason": "",
    "expectedCloseTime": "",
    "affectedDriverCount": 0,
    "everOpened": false,
    "firstOpenRejected": false,
    "logs": [
      {
        "time": "2026-07-08T09:30:25-04:00",
        "status": "业务审核中",
        "operator": "刘经理",
        "action": "发起申请"
      }
    ],
    "drivers": [],
    "attachments": {
      "tax": [
        {
          "id": "1001-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1001-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1001-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1001-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1001-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1001-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  },
  {
    "id": "1002",
    "dspName": "Speed Delivery LLC",
    "fleetName": "纽约车队",
    "businessType": "Corporation",
    "applicationType": "open",
    "latestOperationDate": "2026-07-08",
    "firstOpenApplyDate": "2026-07-08",
    "auditStatus": "pending_financial",
    "modeStatus": "unopened",
    "position": "Director",
    "address": "456 Park Ave, New York, NY",
    "birthday": "1990-07-22",
    "closeReason": "",
    "expectedCloseTime": "",
    "affectedDriverCount": 0,
    "everOpened": false,
    "firstOpenRejected": false,
    "logs": [
      {
        "time": "2026-07-08T10:20:00-04:00",
        "status": "财务审核中",
        "operator": "王主管",
        "action": "业务审核通过"
      },
      {
        "time": "2026-07-08T09:00:00-04:00",
        "status": "业务审核中",
        "operator": "刘经理",
        "action": "发起申请"
      }
    ],
    "drivers": [],
    "attachments": {
      "tax": [
        {
          "id": "1002-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1002-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1002-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1002-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1002-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1002-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  },
  {
    "id": "1003",
    "dspName": "Express Ship Co.",
    "fleetName": "芝加哥车队",
    "businessType": "Sole Proprietorship",
    "applicationType": "close",
    "latestOperationDate": "2026-07-03",
    "firstOpenApplyDate": "2026-05-28",
    "auditStatus": "pending_business",
    "modeStatus": "opened",
    "position": "Owner",
    "address": "789 Michigan Ave, Chicago, IL",
    "birthday": "1982-11-08",
    "closeReason": "车队阶段性调整，不再使用司机提现模式。",
    "expectedCloseTime": "",
    "affectedDriverCount": 2,
    "everOpened": true,
    "firstOpenRejected": false,
    "logs": [
      {
        "time": "2026-07-03T13:00:00-04:00",
        "status": "业务审核中",
        "operator": "赵经理",
        "action": "申请关闭"
      },
      {
        "time": "2026-05-30T16:00:00-04:00",
        "status": "审核通过",
        "operator": "赵财务",
        "action": "财务审核通过"
      },
      {
        "time": "2026-05-29T11:00:00-04:00",
        "status": "财务审核中",
        "operator": "李主管",
        "action": "业务审核通过"
      }
    ],
    "drivers": [
      {
        "id": "D9201",
        "name": "G**********",
        "phone": "+1 **** 0108",
        "fullName": "Grace Miller",
        "fullPhone": "+1 415 555 0108",
        "fleet": "芝加哥车队",
        "openDate": "2026-05-29"
      },
      {
        "id": "D9202",
        "name": "H********",
        "phone": "+1 **** 0121",
        "fullName": "Henry Smith",
        "fullPhone": "+1 415 555 0121",
        "fleet": "芝加哥车队",
        "openDate": "2026-06-10"
      }
    ],
    "attachments": {
      "tax": [
        {
          "id": "1003-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1003-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1003-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1003-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1003-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1003-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  },
  {
    "id": "1004",
    "dspName": "Thunder Transport",
    "fleetName": "旧金山车队",
    "businessType": "Corporation",
    "applicationType": "close",
    "latestOperationDate": "2026-07-02",
    "firstOpenApplyDate": "2026-06-01",
    "auditStatus": "business_reject",
    "modeStatus": "opened",
    "position": "VP",
    "address": "987 Market St, San Francisco, CA",
    "birthday": "1992-05-18",
    "closeReason": "车队阶段性调整，不再使用司机提现模式。",
    "expectedCloseTime": "",
    "affectedDriverCount": 3,
    "everOpened": true,
    "firstOpenRejected": false,
    "logs": [
      {
        "time": "2026-07-02T16:20:00-04:00",
        "status": "业务驳回",
        "operator": "李主管",
        "action": "业务审核驳回",
        "reason": "关闭原因与当前运营计划不一致，请确认后重新提交。"
      },
      {
        "time": "2026-07-02T11:00:00-04:00",
        "status": "业务审核中",
        "operator": "周经理",
        "action": "申请关闭"
      }
    ],
    "drivers": [
      {
        "id": "D9101",
        "name": "E**********",
        "phone": "+1 **** 0101",
        "fullName": "Emma Johnson",
        "fullPhone": "+1 415 555 0101",
        "fleet": "旧金山车队",
        "openDate": "2026-06-02"
      },
      {
        "id": "D9102",
        "name": "S*********",
        "phone": "+1 **** 0112",
        "fullName": "Sophia Brown",
        "fullPhone": "+1 415 555 0112",
        "fleet": "旧金山车队",
        "openDate": "2026-06-09"
      },
      {
        "id": "D9103",
        "name": "D***********",
        "phone": "+1 **** 0199",
        "fullName": "Daniel Wilson",
        "fullPhone": "+1 415 555 0199",
        "fleet": "旧金山车队",
        "openDate": "2026-06-15"
      }
    ],
    "attachments": {
      "tax": [
        {
          "id": "1004-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1004-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1004-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1004-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1004-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1004-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  },
  {
    "id": "1005",
    "dspName": "Prime Logistics",
    "fleetName": "迈阿密车队",
    "businessType": "LLC",
    "applicationType": "close",
    "latestOperationDate": "2026-06-29",
    "firstOpenApplyDate": "2026-04-15",
    "auditStatus": "pass",
    "modeStatus": "closed",
    "position": "President",
    "address": "654 Ocean Dr, Miami, FL",
    "birthday": "1979-09-12",
    "closeReason": "业务调整。",
    "expectedCloseTime": "2026-06-30T00:00:00-04:00",
    "affectedDriverCount": 0,
    "everOpened": true,
    "firstOpenRejected": false,
    "logs": [
      {
        "time": "2026-06-29T11:18:00-04:00",
        "status": "审核通过",
        "operator": "李主管",
        "action": "业务审核通过"
      },
      {
        "time": "2026-06-29T09:30:00-04:00",
        "status": "业务审核中",
        "operator": "陈经理",
        "action": "申请关闭"
      }
    ],
    "drivers": [],
    "attachments": {
      "tax": [
        {
          "id": "1005-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1005-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1005-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1005-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1005-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1005-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  },
  {
    "id": "1006",
    "dspName": "North Star DSP",
    "fleetName": "波士顿车队",
    "businessType": "LLC",
    "applicationType": "close",
    "latestOperationDate": "2026-07-02",
    "firstOpenApplyDate": "2026-04-18",
    "auditStatus": "pass",
    "modeStatus": "closed",
    "position": "COO",
    "address": "18 Beacon St, Boston, MA",
    "birthday": "1981-09-10",
    "closeReason": "-",
    "expectedCloseTime": "2026-07-09T00:00:00-04:00",
    "affectedDriverCount": 2,
    "everOpened": true,
    "firstOpenRejected": false,
    "logs": [
      {
        "time": "2026-07-02T16:20:00-04:00",
        "status": "审核通过",
        "operator": "李主管",
        "action": "业务审核通过"
      },
      {
        "time": "2026-07-02T13:00:00-04:00",
        "status": "业务审核中",
        "operator": "赵经理",
        "action": "申请关闭"
      }
    ],
    "drivers": [
      {
        "id": "D9401",
        "name": "N********",
        "phone": "+1 **** 0144",
        "fullName": "Noah White",
        "fullPhone": "+1 617 555 0144",
        "fleet": "波士顿车队",
        "openDate": "2026-05-01"
      },
      {
        "id": "D9402",
        "name": "L********",
        "phone": "+1 **** 0186",
        "fullName": "Liam King",
        "fullPhone": "+1 617 555 0186",
        "fleet": "波士顿车队",
        "openDate": "2026-05-12"
      }
    ],
    "attachments": {
      "tax": [
        {
          "id": "1006-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1006-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1006-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1006-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1006-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1006-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  },
  {
    "id": "1007",
    "dspName": "Apex Delivery",
    "fleetName": "西雅图车队",
    "businessType": "其他",
    "applicationType": "open",
    "latestOperationDate": "2026-03-25",
    "firstOpenApplyDate": "2026-03-22",
    "auditStatus": "pass",
    "modeStatus": "opened",
    "position": "CEO",
    "address": "111 Pike St, Seattle, WA",
    "birthday": "1986-12-03",
    "closeReason": "",
    "expectedCloseTime": "",
    "affectedDriverCount": 1,
    "everOpened": true,
    "firstOpenRejected": false,
    "logs": [
      {
        "time": "2026-03-25T16:00:00-04:00",
        "status": "审核通过",
        "operator": "赵财务",
        "action": "财务审核通过"
      },
      {
        "time": "2026-03-23T10:30:00-04:00",
        "status": "财务审核中",
        "operator": "李主管",
        "action": "业务审核通过"
      }
    ],
    "drivers": [
      {
        "id": "D9301",
        "name": "A********",
        "phone": "+1 **** 0190",
        "fullName": "Anna Lee",
        "fullPhone": "+1 206 555 0190",
        "fleet": "西雅图车队",
        "openDate": "2026-03-25"
      }
    ],
    "attachments": {
      "tax": [
        {
          "id": "1007-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1007-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1007-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1007-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1007-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1007-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  },
  {
    "id": "1008",
    "dspName": "Quick Move DSP",
    "fleetName": "休斯顿车队",
    "businessType": "Partnership",
    "applicationType": "open",
    "latestOperationDate": "2026-05-21",
    "firstOpenApplyDate": "2026-05-20",
    "auditStatus": "business_reject",
    "modeStatus": "unopened",
    "position": "Manager",
    "address": "321 Texas St, Houston, TX",
    "birthday": "1988-01-30",
    "closeReason": "",
    "expectedCloseTime": "",
    "affectedDriverCount": 0,
    "everOpened": false,
    "firstOpenRejected": true,
    "logs": [
      {
        "time": "2026-05-21T15:30:00-04:00",
        "status": "业务驳回",
        "operator": "李主管",
        "action": "业务审核驳回",
        "reason": "公司注册证明文件不清晰，请重新上传。"
      },
      {
        "time": "2026-05-20T09:00:00-04:00",
        "status": "业务审核中",
        "operator": "刘经理",
        "action": "发起申请"
      }
    ],
    "drivers": [],
    "attachments": {
      "tax": [
        {
          "id": "1008-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1008-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1008-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1008-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1008-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1008-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  },
  {
    "id": "1009",
    "dspName": "Metro Express",
    "fleetName": "达拉斯车队",
    "businessType": "LLC",
    "applicationType": "open",
    "latestOperationDate": "2026-07-08",
    "firstOpenApplyDate": "2026-07-07",
    "auditStatus": "pass",
    "modeStatus": "opened",
    "position": "COO",
    "address": "222 Elm St, Dallas, TX",
    "birthday": "1983-08-25",
    "closeReason": "",
    "expectedCloseTime": "",
    "affectedDriverCount": 0,
    "everOpened": true,
    "firstOpenRejected": false,
    "logs": [
      {
        "time": "2026-07-08T11:10:00-04:00",
        "status": "审核通过",
        "operator": "赵财务",
        "action": "财务审核通过"
      },
      {
        "time": "2026-07-08T10:20:00-04:00",
        "status": "财务审核中",
        "operator": "李主管",
        "action": "业务审核通过"
      }
    ],
    "drivers": [],
    "attachments": {
      "tax": [
        {
          "id": "1009-tax",
          "name": "历史税号支持文件.pdf"
        }
      ],
      "reg": [
        {
          "id": "1009-reg",
          "name": "历史公司注册证明.pdf"
        }
      ],
      "benefit": [
        {
          "id": "1009-benefit",
          "name": "历史受益所有权证明.pdf"
        }
      ],
      "support": [
        {
          "id": "1009-support",
          "name": "历史支持性商业文件.pdf"
        }
      ],
      "personal": [
        {
          "id": "1009-personal",
          "name": "历史个人身份证明.png"
        }
      ],
      "ssn": [
        {
          "id": "1009-ssn",
          "name": "历史SSN文件.pdf"
        }
      ]
    }
  }
]
