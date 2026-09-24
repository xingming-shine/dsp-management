import type { AuthSession } from "@/features/auth/types"

export const mockSession: AuthSession = {
  user: {
    id: "user-1001",
    name: "John Smith",
    phone: "+1 123-456-7890",
    email: "john@abclogistics.com",
    gender: "male",
    createdAt: "2026-06-18T17:50:44Z",
    role: "owner",
  },
  organizations: [
    {
      id: "org-1",
      name: "JAM-JJ",
      code: "US-123456789",
      status: "active",
    },
    {
      id: "org-2",
      name: "JAM-SS",
      code: "US-987654321",
      status: "active",
    },
    {
      id: "org-3",
      name: "ATL-LG",
      code: "US-246801357",
      status: "active",
    },
    {
      id: "org-4",
      name: "NYC-PK",
      code: "US-135792468",
      status: "active",
    },
  ],
  currentOrganizationId: "org-1",
  permissions: [
    "edit_profile",
    "change_password",
    "download_file",
    "batch_download",
  ],
  preferences: {
    locale: "zh-CN",
    timezone: "America/New_York",
    dateFormat: "MM/dd/yyyy HH:mm:ss",
  },
}
