import { useFirstSavedConnection } from "@app/core/stores/deviceStore/selectors.ts";
import { PresetDialog } from "@components/Dialog/PresetDialog.tsx";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDeviceContext } from "@core/hooks/useDeviceContext.ts";
import {
  useMyNodeAsProto,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { applyPreset } from "@core/presets.ts";
import {
  useActiveConnection,
  useAppStore,
  useDeviceStore,
  useDefaultConnection,
  useDevice,
  useSidebar,
} from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { useTotalUnread } from "@meshtastic/sdk-react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  CircleChevronLeft,
  LayersIcon,
  type LucideIcon,
  MapIcon,
  MapPinnedIcon,
  MessageSquareIcon,
  RadioTowerIcon,
  RouterIcon,
  SquareTerminal,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import type React from "react";
import { useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { DeviceInfoPanel } from "./DeviceInfoPanel.tsx";

export interface SidebarProps {
  children?: React.ReactNode;
  embedded?: boolean;
  navigationMode?: "normal" | "split";
  onNavigateOverride?: (href: string) => void;
  isOverrideActive?: (href: string) => boolean;
}

interface NavLink {
  name: string;
  icon: LucideIcon;
  href: string;
  count?: number;
}

const EMPTY_DIRTY_STRING_SIGNAL = {
  value: [] as readonly string[],
  peek: () => [] as readonly string[],
  subscribe: () => () => {},
} as const;

const EMPTY_DIRTY_NUMBER_SIGNAL = {
  value: [] as readonly number[],
  peek: () => [] as readonly number[],
  subscribe: () => () => {},
} as const;

const CollapseToggleButton = () => {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { t } = useTranslation("ui");
  const buttonLabel = isCollapsed
    ? t("sidebar.collapseToggle.button.open")
    : t("sidebar.collapseToggle.button.close");

  return (
    <button
      type="button"
      aria-label={buttonLabel}
      onClick={toggleSidebar}
      className={cn(
        "absolute top-20 right-0 z-10 p-0.5 rounded-full transform translate-x-1/2",
        "transition-colors duration-300 ease-in-out",
        "border border-slate-300 dark:border-slate-200",
        "text-slate-500 dark:text-slate-200 hover:text-slate-400 dark:hover:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-accent transition-transform bg-background-primary",
      )}
    >
      <CircleChevronLeft
        size={24}
        className={cn(
          "transition-transform duration-300 ease-in-out",
          isCollapsed && "rotate-180",
        )}
      />
    </button>
  );
};

export const Sidebar = ({
  children,
  embedded = false,
  navigationMode = "normal",
  onNavigateOverride,
  isOverrideActive,
}: SidebarProps) => {
  const {
    metadata,
    setDialogOpen,
    config,
    getEffectiveConfig,
    getEffectiveModuleConfig,
  } = useDevice();
  const { deviceId } = useDeviceContext();
  const waypointCount = useDeviceStore(
    (state) => state.getDevice(deviceId)?.waypoints.length ?? 0,
  );
  const editor = useConfigEditor();
  const dirtyRadio = useSignal(
    editor?.dirtyRadioSections ?? EMPTY_DIRTY_STRING_SIGNAL,
  );
  const dirtyModule = useSignal(
    editor?.dirtyModuleSections ?? EMPTY_DIRTY_STRING_SIGNAL,
  );
  const dirtyChannels = useSignal(
    editor?.dirtyChannels ?? EMPTY_DIRTY_NUMBER_SIGNAL,
  );
  const numUnread = useTotalUnread();
  const allNodes = useNodesAsProto();
  const { setCommandPaletteOpen } = useAppStore();
  const myNode = useMyNodeAsProto();
  const getNodesLength = () => allNodes.length;
  const { isCollapsed } = useSidebar();
  const { t } = useTranslation(["ui", "config"]);
  const { toast } = useToast();
  const navigate = useNavigate({ from: "/" });
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);

  // Get the active connection from selector (connected > default > first)
  const activeConnection =
    useActiveConnection() ||
    // biome-ignore lint/correctness/useHookAtTopLevel: not a react hook
    useDefaultConnection() ||
    // biome-ignore lint/correctness/useHookAtTopLevel: not a hook
    useFirstSavedConnection();

  const pathname = useLocation({
    select: (location) => location.pathname.replace(/^\//, ""),
  });

  const myMetadata = metadata.get(0);

  const [displayedNodeCount, setDisplayedNodeCount] = useState(() =>
    Math.max(getNodesLength() - 1, 0),
  );

  const [_, startNodeCountTransition] = useTransition();

  const currentNodeCountValue = Math.max(getNodesLength() - 1, 0);

  useEffect(() => {
    if (currentNodeCountValue !== displayedNodeCount) {
      startNodeCountTransition(() => {
        setDisplayedNodeCount(currentNodeCountValue);
      });
    }
  }, [currentNodeCountValue, displayedNodeCount]);

  const pages: NavLink[] = [
    {
      name: t("ui:navigation.messages"),
      icon: MessageSquareIcon,
      href: "/messages/broadcast/0",
      count: numUnread ? numUnread : undefined,
    },
    {
      name: t("ui:navigation.map"),
      icon: MapIcon,
      href: "/map",
    },
    {
      name: `${t("ui:navigation.nodes")} (${displayedNodeCount})`,
      icon: UsersIcon,
      href: "/nodes",
    },
    ...(waypointCount > 0
      ? [
          {
            name: `Waypoints (${waypointCount})`,
            icon: MapPinnedIcon,
            href: "/waypoints",
          } satisfies NavLink,
        ]
      : []),
  ];

  const configLinks: NavLink[] = [
    {
      name: t("ui:navigation.radioConfig"),
      icon: RadioTowerIcon,
      href: "/settings/radio",
      count: dirtyRadio.length || undefined,
    },
    {
      name: t("ui:navigation.deviceConfig"),
      icon: RouterIcon,
      href: "/settings/device",
      count: dirtyModule.length || undefined,
    },
    {
      name: t("ui:navigation.moduleConfig"),
      icon: LayersIcon,
      href: "/settings/module",
      count: dirtyChannels.length || undefined,
    },
  ];

  const isActivePath = (href: string) =>
    pathname === href.replace(/^\//, "") ||
    pathname.startsWith(`${href.replace(/^\//, "")}/`);

  const triggerNavigation = (href: string) => {
    if (myNode === undefined) {
      return;
    }

    if (navigationMode === "split" && onNavigateOverride) {
      onNavigateOverride(href);
      return;
    }

    navigate({ to: href });
  };

  const isLinkActive = (href: string) => {
    if (navigationMode === "split" && isOverrideActive) {
      return isOverrideActive(href);
    }

    return isActivePath(href);
  };

  const handleApplyPreset = (presetId: string) => {
    if (!editor) {
      return;
    }

    try {
      const preset = applyPreset(presetId, {
        editor,
        device: {
          config: {
            lora: config.lora,
          },
          getEffectiveConfig: (section) => getEffectiveConfig(section as never),
          getEffectiveModuleConfig: (section) =>
            getEffectiveModuleConfig(section as never),
        },
        myNode,
      });
      setPresetDialogOpen(false);
      navigate({ to: "/settings/radio" });
      toast({
        title: `${preset.name} loaded`,
        description:
          "Review the drafts, then click Save to push the preset to the node.",
      });
    } catch (error) {
      toast({
        title: "Preset could not be loaded",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected preset error occurred.",
      });
    }
  };

  if (embedded) {
    return (
      <>
        <div className="flex h-full min-h-0 w-52 flex-col lg:w-64">
          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        </div>
        <PresetDialog
          open={presetDialogOpen}
          onOpenChange={setPresetDialogOpen}
          onApply={handleApplyPreset}
        />
      </>
    );
  }

  return (
    <div
      className={cn(
        "relative border-slate-300 dark:border-slate-700",
        "transition-all duration-300 ease-in-out flex-shrink-0",
        isCollapsed ? "w-24" : "w-52 lg:w-64",
      )}
    >
      <CollapseToggleButton />

      <div
        className={cn(
          "h-14 flex mt-2 items-center flex-shrink-0 transition-all duration-300 ease-in-out",
          "border-b-[0.5px] border-slate-300 dark:border-slate-700",
          isCollapsed ? "justify-center px-0" : "px-3",
        )}
      >
        <h2
          className={cn(
            "text-xl font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap",
            "transition-all duration-300 ease-in-out",
            isCollapsed
              ? "opacity-0 max-w-0 invisible"
              : "opacity-100 max-w-xs visible",
          )}
        >
          {t("app.title")}
        </h2>
      </div>

      <SidebarSection label={t("ui:navigation.title")} className="mt-4 px-0">
        {pages.map((link) => {
          return (
            <SidebarButton
              key={link.name}
              count={link.count}
              label={link.name}
              Icon={link.icon}
              onClick={() => triggerNavigation(link.href)}
              active={isLinkActive(link.href)}
              disabled={myNode === undefined}
            />
          );
        })}
      </SidebarSection>

      <SidebarSection label={t("config:sidebar.label")} className="mt-4 px-0">
        <SidebarButton
          label="Presets"
          Icon={SparklesIcon}
          onClick={() => {
            if (myNode !== undefined) {
              setPresetDialogOpen(true);
            }
          }}
          disabled={myNode === undefined}
        />
        {configLinks.map((link) => (
          <SidebarButton
            key={link.name}
            count={link.count}
            label={link.name}
            Icon={link.icon}
            onClick={() => triggerNavigation(link.href)}
            active={isLinkActive(link.href)}
            disabled={myNode === undefined}
          />
        ))}
      </SidebarSection>

      <SidebarSection label={t("ui:tools.title")} className="mt-4 px-0">
        {navigationMode !== "split" && (
          <SidebarButton
            label="Split View"
            Icon={LayersIcon}
            onClick={() => {
              if (myNode !== undefined) {
                navigate({ to: "/split" });
              }
            }}
            active={isActivePath("/split")}
            disabled={myNode === undefined}
          />
        )}
        <SidebarButton
          label={t("ui:serialLogs.button")}
          Icon={SquareTerminal}
          onClick={() => triggerNavigation("/logs")}
          active={isLinkActive("/logs")}
          disabled={myNode === undefined}
        />
      </SidebarSection>

      <div className={cn("flex-1 min-h-0", isCollapsed && "overflow-hidden")}>
        {children}
      </div>

      <div className=" pt-4 border-t-[0.5px] bg-background-primary border-slate-300 dark:border-slate-700 h-full flex-1">
        {myNode === undefined ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Spinner />
            <Subtle
              className={cn(
                "mt-4 transition-opacity duration-300",
                isCollapsed ? "opacity-0 invisible" : "opacity-100 visible",
              )}
            >
              {t("loading")}
            </Subtle>
          </div>
        ) : (
          <DeviceInfoPanel
            isCollapsed={isCollapsed}
            setCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            setDialogOpen={() => setDialogOpen("deviceName", true)}
            user={myNode.user}
            firmwareVersion={
              myMetadata?.firmwareVersion ?? t("unknown.notAvailable")
            }
            deviceMetrics={{
              batteryLevel: myNode.deviceMetrics?.batteryLevel,
              voltage:
                typeof myNode.deviceMetrics?.voltage === "number"
                  ? Math.abs(myNode.deviceMetrics?.voltage)
                  : undefined,
            }}
            connectionStatus={activeConnection?.status}
            connectionName={activeConnection?.name}
          />
        )}
      </div>
      <PresetDialog
        open={presetDialogOpen}
        onOpenChange={setPresetDialogOpen}
        onApply={handleApplyPreset}
      />
    </div>
  );
};
