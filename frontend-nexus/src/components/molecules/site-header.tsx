import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "../ui/button";
import { NotificationBell } from "../NotificationBell";
import { useAuthStore } from "@/stores/auth.store";

export function SiteHeader() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const isDark = theme === "dark";
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setTheme(isDark ? "light" : "dark");
          }}
        >
          {isDark ? (
            <>
              <SunIcon className="size-4" />
              <span className="sr-only">Switch to light theme</span>
            </>
          ) : (
            <>
              <MoonIcon className="size-4" />
              <span className="sr-only">Switch to dark theme</span>
            </>
          )}
        </Button>
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <div className="ml-auto flex items-center gap-2">
        {user && <NotificationBell />}
        </div>
      </div>
    </header>
  );
}
