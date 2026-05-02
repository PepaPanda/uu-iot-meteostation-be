const userRoleRanks = {
  guest: 1,
  operator: 2,
  supervisor: 3,
  administrator: 4,
} as const;

type UserRole = keyof typeof userRoleRanks;

export const hasRequiredRole = (
  userRole: UserRole,
  requiredUserRole: UserRole,
): boolean => {
  return userRoleRanks[userRole] >= userRoleRanks[requiredUserRole];
};