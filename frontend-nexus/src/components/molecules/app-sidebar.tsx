import {
  IconBuildingStore,
  IconCalendarCheck,
  IconDashboard,
  IconFileDescription,
  IconFolder,
  IconGift,
  IconHistory,
  IconInnerShadowTop,
  IconLock,
  IconReport,
  IconSettings,
  IconStethoscope,
  IconUserCircle,
  type Icon,
} from '@tabler/icons-react';
import * as React from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { can, type UserWithRole } from '@/lib/rbac';
import type { RouteKey } from '@/lib/rbacMatrix';
import { useAuthStore } from '@/stores/auth.store';
import { Link } from '@tanstack/react-router';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';

/** Nav item with optional routeKey for RBAC; items without routeKey are shown to all authenticated users. */
const navMainAll: Array<{
  title: string;
  url: string;
  icon: Icon;
  routeKey?: RouteKey;
}> = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: IconDashboard,
    routeKey: 'DASHBOARD_HOME',
  },
  {
    title: 'Tenants',
    url: '/dashboard/tenants',
    icon: IconBuildingStore,
    routeKey: 'DASHBOARD_TENANTS',
  },
  {
    title: 'Audit Logs',
    url: '/dashboard/audit-logs',
    icon: IconHistory,
    routeKey: 'DASHBOARD_AUDIT_LOGS',
  },
  {
    title: 'Profile',
    url: '/dashboard/profile',
    icon: IconUserCircle,
  },
  {
    title: 'Appointments',
    url: '/dashboard/appointments',
    icon: IconCalendarCheck,
    routeKey: 'DASHBOARD_DOCTOR_APPOINTMENTS',
  },
];

const superAdminRoutes = [
  {
    title: 'Permissions',
    url: '/dashboard/permissions',
    icon: IconLock,
  },
] as const;

const tenantManagerDocuments = [
  {
    title: 'Settings',
    url: '/dashboard/tenant/settings',
    icon: IconSettings,
  },
  {
    title: 'Departments & Services',
    url: '/dashboard/tenant/departments-services',
    icon: IconFolder,
  },
  {
    title: 'Doctors',
    url: '/dashboard/tenant/doctors',
    icon: IconStethoscope,
  },
  {
    title: 'Products',
    url: '/dashboard/tenant/products',
    icon: IconBuildingStore,
  },
  {
    title: 'Plans',
    url: '/dashboard/tenant/plans',
    icon: IconReport,
  },
  {
    title: 'Contracts',
    url: '/dashboard/tenant/contracts',
    icon: IconFileDescription,
  },
  {
    title: 'Enrollments',
    url: '/dashboard/tenant/enrollments',
    icon: IconHistory,
  },
] as const;
const clientsDocuments = [
  {
    title: 'Enrollments',
    url: '/dashboard/client/enrollments',
    icon: IconHistory,
  },
  {
    title: 'Offers',
    url: '/dashboard/client/offers',
    icon: IconGift,
  },
  {
    title: 'My Appointments',
    url: '/appointments/my',
    icon: IconCalendarCheck,
  },
  {
    title: 'Tenants',
    url: '/tenants',
    icon: IconBuildingStore,
  },
  {
    title: 'Settings',
    url: '/dashboard/client/settings',
    icon: IconSettings,
  },
] as const;

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, role } = useAuthStore();
  const userWithRole: UserWithRole = { role };
  const navMain = React.useMemo(() => {
    const baseItems = navMainAll.filter(
      (item) => !item.routeKey || can(userWithRole, item.routeKey)
    );
    if (role === 'DOCTOR' && user?.id) {
      baseItems.push({
        title: 'My Contract',
        url: `/dashboard/contract-sign-doctor/${user.id}`,
        icon: IconFileDescription,
      });
    }
    return baseItems;
  }, [role, user?.id, userWithRole]);
  const documentItems = React.useMemo(() => {
    if (role === 'SUPER_ADMIN') return [...superAdminRoutes];
    if (role === 'TENANT_MANAGER') return [...tenantManagerDocuments];
    if (role === 'CLIENT') return [...clientsDocuments];
    return [];
  }, [role]);

  const documentsLabel = React.useMemo(() => {
    if (role === 'TENANT_MANAGER') return 'My Tenant';
    if (role === 'CLIENT') return 'Account & Services';
    return 'Super Admin';
  }, [role]);

  const sidebarUser = React.useMemo(() => {
    if (!user) return null;
    return {
      name: user.fullName ?? user.email ?? 'User',
      email: user.email,
      avatar: '/images/logo.webp',
    };
  }, [user]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full">
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:p-1.5!"
              >
                <Link to="/">
                  <IconInnerShadowTop className="size-5!" />
                  <span className="text-base font-semibold">
                    Health Nexus
                  </span>
                </Link>
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {documentItems.length > 0 ? (
          <NavMain items={documentItems} label={documentsLabel} />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
