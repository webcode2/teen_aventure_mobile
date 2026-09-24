# Task 4 review
## admin/src/shell.tsx (navigate-related hunks)
3:import { useNavigate } from 'react-router';
4:import type { Tab } from './route';
56:  const navigate = useNavigate();
199:                      navigate(id === 'dashboard' ? '/app/dashboard' : `/app/dashboard/${id}`);
## admin/src/top-nav.tsx (navigate-related hunks)
1:import { useNavigate } from 'react-router';
3:import type { Tab } from './route';
61:  const navigate = useNavigate();
103:          onClick={() => navigate('/app/dashboard/notifications')}
116:          onClick={() => navigate('/app/dashboard/quests')}
134:              navigate('/app/login');
```tsx
admin/src/shell.tsx-1-import { useCallback, useEffect, useState, type ReactNode } from 'react';
admin/src/shell.tsx-2-import { api, getUser } from './api';
admin/src/shell.tsx:3:import { useNavigate } from 'react-router';
admin/src/shell.tsx-4-import type { Tab } from './route';
admin/src/shell.tsx-5-import { Brand } from './ui';
--
admin/src/shell.tsx-54-
admin/src/shell.tsx-55-export function Shell({ tab, children }: { tab: Tab; children: ReactNode }) {
admin/src/shell.tsx:56:  const navigate = useNavigate();
admin/src/shell.tsx-57-  const user = getUser();
admin/src/shell.tsx-58-  const [alertCount, setAlertCount] = useState(0);
--
admin/src/shell.tsx-197-                    onClick={() => {
admin/src/shell.tsx-198-                      closeMobileNav();
admin/src/shell.tsx:199:                      navigate(id === 'dashboard' ? '/app/dashboard' : `/app/dashboard/${id}`);
admin/src/shell.tsx-200-                    }}
admin/src/shell.tsx-201-                  >
--
admin/src/top-nav.tsx:1:import { useNavigate } from 'react-router';
admin/src/top-nav.tsx-2-import { getUser, setToken } from './api';
admin/src/top-nav.tsx-3-import type { Tab } from './route';
--
admin/src/top-nav.tsx-59-  onToggleSidebar?: () => void;
admin/src/top-nav.tsx-60-}) {
admin/src/top-nav.tsx:61:  const navigate = useNavigate();
admin/src/top-nav.tsx-62-  const user = getUser();
admin/src/top-nav.tsx-63-  const name = user?.name || 'App Manager';
--
admin/src/top-nav.tsx-101-          aria-label={`Notifications${alertCount ? `, ${alertCount} alerts` : ''}`}
admin/src/top-nav.tsx-102-          title="Notifications"
admin/src/top-nav.tsx:103:          onClick={() => navigate('/app/dashboard/notifications')}
admin/src/top-nav.tsx-104-        >
admin/src/top-nav.tsx-105-          <BellIcon />
--
admin/src/top-nav.tsx-114-          type="button"
admin/src/top-nav.tsx-115-          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal/30 bg-teal-tint/50 text-teal hover:bg-teal hover:text-white font-semibold text-xs transition-colors cursor-pointer"
admin/src/top-nav.tsx:116:          onClick={() => navigate('/app/dashboard/quests')}
admin/src/top-nav.tsx-117-        >
admin/src/top-nav.tsx-118-          + New quest
--
admin/src/top-nav.tsx-132-            onClick={() => {
admin/src/top-nav.tsx-133-              setToken(null);
admin/src/top-nav.tsx:134:              navigate('/app/login');
admin/src/top-nav.tsx-135-            }}
admin/src/top-nav.tsx-136-          >
```
