import { NavLink } from "@/lib/router";
import { cn } from "../lib/utils";
import { useSidebar } from "../context/SidebarContext";
import { useLocale } from "../context/LocaleContext";
import type { LucideIcon } from "lucide-react";

interface SidebarNavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  className?: string;
  badge?: number;
  badgeTone?: "default" | "danger";
  alert?: boolean;
  liveCount?: number;
}

export function SidebarNavItem({
  to,
  label,
  icon: Icon,
  end,
  className,
  badge,
  badgeTone = "default",
  alert = false,
  liveCount,
}: SidebarNavItemProps) {
  const { isMobile, setSidebarOpen } = useSidebar();
  const { translateText } = useLocale();
  const localizedLabel = translateText(label);

  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => { if (isMobile) setSidebarOpen(false); }}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors",
          isActive
            ? "bg-accent text-foreground"
            : "text-foreground/80 hover:bg-accent/50 hover:text-foreground",
          className,
        )
      }
    >
      <span className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {alert && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--dot-error)] shadow-[0_0_0_2px_hsl(var(--background))]" />
        )}
      </span>
      <span className="flex-1 truncate">{localizedLabel}</span>
      {liveCount != null && liveCount > 0 && (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--dot-info)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-blue-fg)]" />
          </span>
          <span className="text-[11px] font-medium text-[var(--status-blue-fg)]">
            {liveCount} {translateText("live")}
          </span>
        </span>
      )}
      {badge != null && badge > 0 && (
        <span
          className={cn(
            "ml-auto rounded-sm px-1.5 py-0.5 text-xs leading-none",
            badgeTone === "danger"
              ? "bg-[var(--dot-error)] text-white"
              : "bg-primary text-primary-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}
