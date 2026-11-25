export type EmploymentStatus = "active" | "inactive"
export const DRIVER_ROLE_ID = "role-driver"

export type DriverCandidate = {
  userId: string
  name: string
  phoneCode: string
  phone: string
  email: string
  organizationIds: string[]
}

export type StaffRow = {
  relationId: string
  userId: string
  name: string
  phoneCode: string
  phone: string
  email: string
  employmentStatus: EmploymentStatus
  organizationId: string
  roleIds: string[]
  updatedAt: string
}

export const configuredRoles = [
  { id: DRIVER_ROLE_ID, name: "Driver" },
  { id: "role-owner", name: "DSP Owner" },
  { id: "role-manager", name: "DSP Manager" },
  { id: "role-finance", name: "DSP Financial Manager" },
  { id: "role-support", name: "DSP Customer Support Specialist" },
  { id: "role-driver-lead", name: "DSP Driver Lead" },
] as const

export const driverCandidates: DriverCandidate[] = [
  { userId: "21672", name: "Alex Chen", phoneCode: "+1", phone: "4155550182", email: "alex.chen@example.com", organizationIds: ["org-1", "org-2"] },
  { userId: "31082", name: "Chris Diaz", phoneCode: "+1", phone: "4155550199", email: "", organizationIds: ["org-1", "org-2"] },
  { userId: "21683", name: "Morgan Lee", phoneCode: "+1", phone: "6465550127", email: "morgan.lee@example.com", organizationIds: ["org-3"] },
  { userId: "31093", name: "Jamie Lin", phoneCode: "+1", phone: "6465550138", email: "jamie.lin@example.com", organizationIds: ["org-2"] },
  { userId: "31104", name: "Robin Wu", phoneCode: "+1", phone: "2125550149", email: "robin.wu@example.com", organizationIds: ["org-3"] },
]

export const initialStaffRows: StaffRow[] = [
  {
    relationId: "staff-1",
    userId: "21672",
    name: "Alex Chen",
    phoneCode: "+1",
    phone: "4155550182",
    email: "alex.chen@example.com",
    employmentStatus: "active",
    organizationId: "org-1",
    roleIds: [DRIVER_ROLE_ID, "role-manager", "role-support"],
    updatedAt: "2026-11-23T17:45:00Z",
  },
  {
    relationId: "staff-2",
    userId: "21672",
    name: "Alex Chen",
    phoneCode: "+1",
    phone: "4155550182",
    email: "alex.chen@example.com",
    employmentStatus: "active",
    organizationId: "org-2",
    roleIds: [DRIVER_ROLE_ID, "role-support"],
    updatedAt: "2026-11-22T15:20:00Z",
  },
  // One account spans a visible fleet and an out-of-scope fleet in ?view=dsp.
  {
    relationId: "staff-3",
    userId: "21683",
    name: "Morgan Lee",
    phoneCode: "+1",
    phone: "6465550127",
    email: "morgan.lee@example.com",
    employmentStatus: "active",
    organizationId: "org-1",
    roleIds: ["role-finance"],
    updatedAt: "2026-11-21T19:10:00Z",
  },
  {
    relationId: "staff-3-crossfleet",
    userId: "21683",
    name: "Morgan Lee",
    phoneCode: "+1",
    phone: "6465550127",
    email: "morgan.lee@example.com",
    employmentStatus: "active",
    organizationId: "org-3",
    roleIds: [DRIVER_ROLE_ID, "role-manager"],
    updatedAt: "2026-11-21T19:10:00Z",
  },
  {
    relationId: "staff-4",
    userId: "21691",
    name: "Taylor Wang",
    phoneCode: "+1",
    phone: "2125550108",
    email: "taylor.wang@example.com",
    employmentStatus: "inactive",
    organizationId: "org-2",
    roleIds: ["role-driver-lead"],
    updatedAt: "2026-11-19T14:30:00Z",
  },
  {
    relationId: "staff-5",
    userId: "21704",
    name: "Jordan Park",
    phoneCode: "+1",
    phone: "4045550168",
    email: "jordan.park@example.com",
    employmentStatus: "active",
    organizationId: "org-3",
    roleIds: ["role-manager"],
    updatedAt: "2026-11-18T18:00:00Z",
  },
  {
    relationId: "staff-6",
    userId: "21716",
    name: "Casey Brown",
    phoneCode: "+1",
    phone: "7185550141",
    email: "casey.brown@example.com",
    employmentStatus: "active",
    organizationId: "org-4",
    roleIds: ["role-support", "role-driver-lead"],
    updatedAt: "2026-11-17T16:05:00Z",
  },
]
