import type { Role, UserStatus } from '@prisma/client'

export type RoleType = Role
export type StatusType = UserStatus

// A user is considered "fully usable" only when their email is verified AND
// their account is ACTIVE. Pending/suspended/unverified users cannot access
// the internal circle.
export function isUsable(user: { role: Role; status: UserStatus; emailVerified: Date | null }): boolean {
  return !!user.emailVerified && user.status === 'ACTIVE'
}

export function isSuperAdmin(role: Role | string): boolean {
  return role === 'SUPER_ADMIN'
}
export function isAdmin(role: Role | string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

// Deletion / suspension authority.
// - SUPER_ADMIN can never be deleted or suspended by anyone.
// - ADMIN can be deleted/suspended only by SUPER_ADMIN.
// - EMPLOYEE can be deleted/suspended by SUPER_ADMIN or ADMIN.
export function canManageUser(
  actorRole: Role,
  targetRole: Role,
): { suspend: boolean; delete: boolean; changeRole: boolean } {
  if (targetRole === 'SUPER_ADMIN') {
    // Nobody may suspend/delete a super admin.
    return { suspend: false, delete: false, changeRole: false }
  }
  if (actorRole === 'SUPER_ADMIN') {
    return { suspend: true, delete: true, changeRole: true }
  }
  if (actorRole === 'ADMIN') {
    if (targetRole === 'ADMIN') return { suspend: false, delete: false, changeRole: false }
    // admin vs employee
    return { suspend: true, delete: true, changeRole: false }
  }
  // employees cannot manage anyone
  return { suspend: false, delete: false, changeRole: false }
}
