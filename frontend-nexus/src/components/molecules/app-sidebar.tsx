import * as React from "react";
import {
  IconCamera,
  IconDashboard,
  IconDatabase,
  IconDatabaseExport,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconMessage,
  IconReport,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";

import { NavDocuments } from "./nav-documents";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
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
  icon: React.ComponentType<{ className?: string }>;
  routeKey?: RouteKey;
}> = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard, routeKey: "DASHBOARD_HOME" },
  { title: "Forms", url: "/dashboard/forms", icon: IconFileDescription, routeKey: "DASHBOARD_FORMS" },
  { title: "Dialog", url: "/dashboard/dialog", icon: IconMessage },
  { title: "Global State", url: "/dashboard/global-state", icon: IconDatabase, routeKey: "DASHBOARD_GLOBAL_STATE" },
  { title: "Landing Pages", url: "/dashboard/landing-pages", icon: IconFolder, routeKey: "DASHBOARD_LANDING_PAGES" },
  { title: "Data Fetching", url: "/dashboard/data", icon: IconDatabaseExport, routeKey: "DASHBOARD_DATA" },
];

const data = {
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, role } = useAuthStore();
  const userWithRole: UserWithRole = { role };
  const navMain = React.useMemo(
    () =>
      navMainAll.filter(
        (item) => !item.routeKey || can(userWithRole, item.routeKey)
      ),
    [role]
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
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
