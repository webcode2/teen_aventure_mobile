export const SYSTEM_ADMIN_ROLES = ['APP_MANAGER', 'SUPER_ADMIN', 'SUPER_EDITOR', 'EDITOR'] as const;
export const USER_PLATFORM_ROLES = ['MAIN_ACCOUNT', 'CHILD'] as const;

const DASHBOARD_ROLES = new Set<string>(SYSTEM_ADMIN_ROLES);
const CHURCH_STAFF = new Set(['TEACHER', 'CHAPERONE', 'CHILDRENS_CHURCH_LEAD', 'PASTOR_NOMINEE']);

type AccountInput = {
  platformRole: string;
  churchRoles?: Array<{ role: string }>;
  familiesOwned?: unknown[];
  guardianships?: unknown[];
};

/** Staff = system administrators for the dashboard (superadmin-created). */
export function isStaffAccount(input: AccountInput): boolean {
  return DASHBOARD_ROLES.has(input.platformRole);
}

/** App users: parents, teens, pastors, and church team (not dashboard admins). */
export function isCommunityUser(input: AccountInput): boolean {
  return !isStaffAccount(input);
}

export function staffTypeLabel(input: AccountInput): string {
  switch (input.platformRole) {
    case 'APP_MANAGER':
      return 'App Manager';
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'SUPER_EDITOR':
      return 'Super Editor';
    case 'EDITOR':
      return 'Editor';
    default:
      return 'System admin';
  }
}

export function accountTypeLabel(input: AccountInput & { independentLogin?: boolean }): string {
  if (DASHBOARD_ROLES.has(input.platformRole)) return 'System administrator';
  if (input.platformRole === 'CHILD') return 'Standalone teen';
  const church = input.churchRoles ?? [];
  if (church.some((r) => r.role === 'PASTOR')) return 'Pastor';
  if (church.some((r) => CHURCH_STAFF.has(r.role))) return 'Church staff';
  if ((input.familiesOwned?.length ?? 0) > 0 || (input.guardianships?.length ?? 0) > 0) return 'Family main account';
  return 'Main account';
}

export function childAccountLabel(input: {
  independentLogin: boolean;
  ageBand: string;
}): string {
  if (input.independentLogin) return 'Standalone teen (on parent account)';
  return input.ageBand === 'TEEN' ? 'Teen on parent account' : 'Child on parent account';
}
