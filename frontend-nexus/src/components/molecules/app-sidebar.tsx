import * as React from "react";
import {
  IconDashboard,
  IconDatabase,
  IconDatabaseExport,
  IconFileDescription,
  IconFolder,
  IconInnerShadowTop,
  IconKey,
  IconReport,
  IconBuildingStore,
  IconHistory,
  type Icon,
} from "@tabler/icons-react";

import { NavDocuments } from "./nav-documents";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth.store";
import { can, type UserWithRole } from "@/lib/rbac";
import type { RouteKey } from "@/lib/rbacMatrix";

/** Nav item with optional routeKey for RBAC; items without routeKey are shown to all authenticated users. */
const navMainAll: Array<{
  title: string;
  url: string;
  icon: Icon;
  routeKey?: RouteKey;
}> = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
    routeKey: "DASHBOARD_HOME",
  },
  {
    title: "Tenants",
    url: "/dashboard/tenants",
    icon: IconBuildingStore,
    routeKey: "DASHBOARD_TENANTS",
  },
  {
    title: "Audit Logs",
    url: "/dashboard/audit-logs",
    icon: IconHistory,
    routeKey: "DASHBOARD_AUDIT_LOGS",
  },
  
];

const data = {
  user: {
    name: "User",
    email: "user@healthnexus.com",
    avatar: "/images/logo.webp",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },

    {
      title: "Tenants",
      url: "/dashboard/tenants",
      icon: IconReport,
    },
    {
      title: "Tenant Audit Logs",
      url: "/dashboard/audit-logs",
      icon: IconReport,
    },
  ],

  component_examples: [
    {
      name: "Forms",
      url: "/dashboard/forms",
      icon: IconFileDescription,
    },
    {
      name: "Global State",
      url: "/dashboard/global-state",
      icon: IconDatabase,
    },
    {
      name: "Landing Pages",
      url: "/dashboard/landing-pages",
      icon: IconFolder,
    },
    {
      name: "Data Fetching",
      url: "/dashboard/data",
      icon: IconDatabaseExport,
    },
    {
      name: "Roles",
      url: "/dashboard/roles",
      icon: IconKey,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, role } = useAuthStore();
  const userWithRole: UserWithRole = { role };
  const navMain = React.useMemo(
    () =>
      navMainAll.filter(
        (item) => !item.routeKey || can(userWithRole, item.routeKey),
      ),
    [role],
  );
  const sidebarUser = React.useMemo(() => {
    if (!user) return null;
    return {
      name: user.fullName ?? user.email ?? "User",
      email: user.email,
      avatar: "/images/logo.webp",
    };
  }, [user]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Health Nexus</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavDocuments items={data.component_examples} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
