export const SYSTEM_ADMIN_ROLES = ['APP_MANAGER', 'SUPER_ADMIN', 'SUPER_EDITOR', 'EDITOR'] as const;
export const USER_PLATFORM_ROLES = ['MAIN_ACCOUNT', 'CHILD'] as const;

const DASHBOARD_ROLES = new Set<string>(SYSTEM_ADMIN_ROLES);
const CHURCH_STAFF = new Set(['TEACHER', 'CHAPERONE', 'CHILDRENS_CHURCH_LEAD', 'PASTOR_NOMINEE']);

type AccountInput = {
  platformRole: string;
  appLogin?: boolean;
  churchRoles?: Array<{ role: string }>;
  familiesOwned?: unknown[];
  guardianships?: unknown[];
};

/** Stable keys for Users directory filters (mobile-app community accounts). */
export type UserAccountTypeKey =
  | 'main'
  | 'family_main'
  | 'standalone_teen'
  | 'church_staff';

export const USER_ACCOUNT_TYPE_FILTERS: Array<{ id: UserAccountTypeKey | 'all'; label: string }> = [
  { id: 'all', label: 'All types' },
  { id: 'main', label: 'Main account' },
  { id: 'family_main', label: 'Family main account' },
  { id: 'standalone_teen', label: 'Standalone teen' },
  { id: 'church_staff', label: 'Church staff' },
];

export const STAFF_ROLE_FILTERS: Array<{ id: (typeof SYSTEM_ADMIN_ROLES)[number] | 'all'; label: string }> = [
  { id: 'all', label: 'All roles' },
  { id: 'APP_MANAGER', label: 'App Manager' },
  { id: 'SUPER_ADMIN', label: 'Super Admin' },
  { id: 'SUPER_EDITOR', label: 'Super Editor' },
  { id: 'EDITOR', label: 'Editor' },
];

export type ChildAccountTypeKey = 'parent_child' | 'parent_teen' | 'independent_teen';

export const CHILD_ACCOUNT_TYPE_FILTERS: Array<{ id: ChildAccountTypeKey | 'all'; label: string }> = [
  { id: 'all', label: 'All types' },
  { id: 'parent_child', label: 'Child on parent account' },
  { id: 'parent_teen', label: 'Teen on parent account' },
  { id: 'independent_teen', label: 'Standalone teen (on parent account)' },
];

export const STATUS_FILTERS = [
  { id: 'all', label: 'All statuses' },
  { id: 'active', label: 'Active' },
  { id: 'disabled', label: 'Disabled' },
] as const;

/** Staff = system administrators for the dashboard (superadmin-created). */
export function isStaffAccount(input: AccountInput): boolean {
  return DASHBOARD_ROLES.has(input.platformRole);
}

/** App users: parents, teens, pastors, and church team (not dashboard admins). */
export function isCommunityUser(input: AccountInput): boolean {
  return !isStaffAccount(input);
}

export function isPastorAccount(input: AccountInput): boolean {
  return (input.churchRoles ?? []).some((r) => r.role === 'PASTOR');
}

/**
 * Users directory: mobile-app accounts only.
 * Omits desk admins, church pastors, and portal-only accounts (appLogin false).
 */
export function isMobileAppUser(input: AccountInput): boolean {
  if (isStaffAccount(input)) return false;
  if (input.appLogin === false) return false;
  if (isPastorAccount(input)) return false;
  if (input.platformRole === 'CHURCH_APPLICANT') return false;
  return true;
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

export function accountTypeKey(
  input: AccountInput,
): UserAccountTypeKey | 'system_admin' | 'pastor' | 'ministry_applicant' {
  if (DASHBOARD_ROLES.has(input.platformRole)) return 'system_admin';
  if (input.platformRole === 'CHURCH_APPLICANT') return 'ministry_applicant';
  if (input.platformRole === 'CHILD') return 'standalone_teen';
  const church = input.churchRoles ?? [];
  if (church.some((r) => r.role === 'PASTOR')) return 'pastor';
  if (church.some((r) => CHURCH_STAFF.has(r.role))) return 'church_staff';
  if ((input.familiesOwned?.length ?? 0) > 0 || (input.guardianships?.length ?? 0) > 0) return 'family_main';
  return 'main';
}

export function accountTypeLabel(input: AccountInput & { independentLogin?: boolean }): string {
  switch (accountTypeKey(input)) {
    case 'system_admin':
      return 'System administrator';
    case 'ministry_applicant':
      return 'Ministry applicant';
    case 'standalone_teen':
      return 'Standalone teen';
    case 'pastor':
      return 'Pastor';
    case 'church_staff':
      return 'Church staff';
    case 'family_main':
      return 'Family main account';
    default:
      return 'Main account';
  }
}

export function childAccountTypeKey(input: {
  independentLogin: boolean;
  ageBand: string;
}): ChildAccountTypeKey {
  if (input.independentLogin) return 'independent_teen';
  return input.ageBand === 'TEEN' ? 'parent_teen' : 'parent_child';
}

export function childAccountLabel(input: {
  independentLogin: boolean;
  ageBand: string;
}): string {
  switch (childAccountTypeKey(input)) {
    case 'independent_teen':
      return 'Standalone teen (on parent account)';
    case 'parent_teen':
      return 'Teen on parent account';
    default:
      return 'Child on parent account';
  }
}
