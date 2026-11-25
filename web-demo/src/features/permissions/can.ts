import type { AuthSession } from "@/features/auth/types"

export function can(
  session: Pick<AuthSession, "permissions">,
  permission?: string
) {
  return !permission || session.permissions.includes(permission)
}
