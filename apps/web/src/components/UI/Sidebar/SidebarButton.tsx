import { Button } from "@components/UI/Button.tsx";
import { useSidebar } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import type { LucideIcon } from "lucide-react";
import type React from "react";

export interface SidebarButtonProps {
  label: string;
  count?: number;
  active?: boolean;
  Icon?: LucideIcon;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  preventCollapse?: boolean;
  isDirty?: boolean;
}

export const SidebarButton = ({
  label,
  active,
  Icon,
  count,
  children,
  onClick,
  disabled = false,
  preventCollapse = false,
  isDirty,
}: SidebarButtonProps) => {
  const { isCollapsed: isSidebarCollapsed } = useSidebar();
  const isButtonCollapsed = isSidebarCollapsed && !preventCollapse;

  return (
    <Button
      onClick={onClick}
      variant={active ? "subtle" : "ghost"}
      size="sm"
      className={cn(
        "flex w-full items-center text-wrap text-[13px]",
        isButtonCollapsed
          ? "justify-center gap-0 px-1.5 h-8"
          : "justify-start gap-1.5 min-h-8 px-2 py-1",
      )}
      disabled={disabled}
    >
      {Icon && (
        <Icon size={isButtonCollapsed ? 18 : 16} className="flex-shrink-0" />
      )}

      {children}

      <span
        className={cn(
          "flex flex-wrap justify-start text-left text-balance break-all",
          "min-w-0",
          "px-0.5 leading-4",
          "transition-all duration-300 ease-in-out",
          isButtonCollapsed
            ? "opacity-0 max-w-0 invisible w-0 overflow-hidden"
            : "opacity-100 max-w-full visible whitespace-normal",
        )}
      >
        {label}
      </span>

      {!isButtonCollapsed && ((!active && count && count > 0) || isDirty) && (
        <div
          className={cn(
            "ml-auto flex-shrink-0 justify-end text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none",
            "flex-shrink-0",
            "transition-opacity duration-300 ease-in-out",
            isButtonCollapsed ? "opacity-0 invisible" : "opacity-100 visible",
            isDirty ? "bg-sky-500" : "bg-blue-500",
          )}
        >
          {count}
        </div>
      )}
    </Button>
  );
};
