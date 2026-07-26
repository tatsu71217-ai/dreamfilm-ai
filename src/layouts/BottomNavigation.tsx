import { NavLink } from "react-router-dom";
import { Home, NotebookPen, Settings } from "lucide-react";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { to: "/home", label: "ホーム", icon: Home },
  { to: "/record", label: "記録", icon: NotebookPen },
  { to: "/settings", label: "設定", icon: Settings },
] as const;

export function BottomNavigation() {
  return (
    <nav
      aria-label="メインナビゲーション"
      className="safe-bottom sticky bottom-0 z-20 border-t border-border/60 bg-background/90 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  isActive ? "text-gold" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.4 : 1.8}
                    aria-hidden="true"
                  />
                  <span className={isActive ? "font-medium" : undefined}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
