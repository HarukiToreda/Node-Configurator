import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SplitMapPage } from "@pages/Map/index.tsx";
import { SplitMessagesPage } from "@pages/Messages.tsx";
import { SplitNodesPage } from "@pages/Nodes/index.tsx";
import { SplitSerialLogsPage } from "@pages/SerialLogs.tsx";
import { SplitConfigPage } from "@pages/Settings/index.tsx";
import { SplitWaypointsPage } from "@pages/Waypoints.tsx";
import { cn } from "@core/utils/cn.ts";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type SplitViewHref =
  | "/messages/broadcast/0"
  | "/map"
  | "/nodes"
  | "/waypoints"
  | "/settings/radio"
  | "/settings/device"
  | "/settings/module"
  | "/logs";

interface SplitPaneDefinition {
  href: SplitViewHref;
  label: string;
}

const splitPaneDefinitions: SplitPaneDefinition[] = [
  { href: "/messages/broadcast/0", label: "Messages" },
  { href: "/map", label: "Map" },
  { href: "/nodes", label: "Nodes" },
  { href: "/waypoints", label: "Waypoints" },
  { href: "/settings/radio", label: "Radio Config" },
  { href: "/settings/device", label: "Device Config" },
  { href: "/settings/module", label: "Module Config" },
  { href: "/logs", label: "Serial Logs" },
];

const renderPane = (href: SplitViewHref): ReactNode => {
  switch (href) {
    case "/messages/broadcast/0":
      return <SplitMessagesPage />;
    case "/map":
      return <SplitMapPage />;
    case "/nodes":
      return <SplitNodesPage />;
    case "/waypoints":
      return <SplitWaypointsPage />;
    case "/settings/radio":
      return <SplitConfigPage section="radio" />;
    case "/settings/device":
      return <SplitConfigPage section="device" />;
    case "/settings/module":
      return <SplitConfigPage section="module" />;
    case "/logs":
      return <SplitSerialLogsPage />;
    default:
      return null;
  }
};

const SplitPanePlaceholder = ({ active }: { active: boolean }) => (
  <div
    className={cn(
      "flex h-full items-center justify-center rounded-xl border border-dashed px-6 text-center",
      active
        ? "border-sky-500/80 bg-sky-500/10 text-sky-200"
        : "border-slate-700 bg-slate-900/40 text-slate-400",
    )}
  >
    <div className="max-w-sm space-y-2">
      <p className="text-sm font-semibold uppercase tracking-[0.16em]">
        Waiting for a view
      </p>
      <p className="text-sm leading-6">
        Select any page from the sidebar to place it here.
      </p>
    </div>
  </div>
);

const SplitPaneFrame = ({
  active,
  closeLabel,
  onSelect,
  onClose,
  children,
}: {
  active: boolean;
  closeLabel: string;
  onSelect: () => void;
  onClose?: () => void;
  children: ReactNode;
}) => (
  <section className="min-w-0 flex-1 p-2">
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background-primary transition",
        active
          ? "border-sky-500/70 shadow-[0_0_0_1px_rgba(14,165,233,0.35)]"
          : "border-slate-700",
      )}
      onMouseDown={onSelect}
      onFocus={onSelect}
    >
      {onClose && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-3 top-3 z-20 rounded-md border border-slate-700 bg-slate-950/85 p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          aria-label={closeLabel}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  </section>
);

const SplitViewPage = () => {
  const navigate = useNavigate({ from: "/split" });
  const [leftPaneHref, setLeftPaneHref] = useState<SplitViewHref | null>(null);
  const [rightPaneHref, setRightPaneHref] = useState<SplitViewHref | null>(
    null,
  );
  const [activePane, setActivePane] = useState<"left" | "right">("left");

  const leftPane = useMemo(
    () => (leftPaneHref ? renderPane(leftPaneHref) : null),
    [leftPaneHref],
  );
  const rightPane = useMemo(
    () => (rightPaneHref ? renderPane(rightPaneHref) : null),
    [rightPaneHref],
  );

  const handleSplitNavigation = (href: string) => {
    const nextHref = href as SplitViewHref;

    if (
      !splitPaneDefinitions.some((definition) => definition.href === nextHref)
    ) {
      return;
    }

    if (leftPaneHref === null) {
      setLeftPaneHref(nextHref);
      setActivePane("left");
      return;
    }

    if (rightPaneHref === null) {
      setRightPaneHref(nextHref);
      setActivePane("right");
      return;
    }

    if (activePane === "left") {
      setLeftPaneHref(nextHref);
    } else {
      setRightPaneHref(nextHref);
    }
  };

  const isSplitLinkActive = (href: string) => {
    if (activePane === "left") {
      return leftPaneHref === href;
    }

    return rightPaneHref === href;
  };

  const closePane = (pane: "left" | "right") => {
    const closingHref = pane === "left" ? leftPaneHref : rightPaneHref;
    const remainingHref = pane === "left" ? rightPaneHref : leftPaneHref;

    if (remainingHref) {
      navigate({ to: remainingHref });
      return;
    }

    if (closingHref) {
      navigate({ to: closingHref });
      return;
    }

    navigate({ to: "/messages/broadcast/0" });
  };

  return (
    <PageLayout
      label="Split View"
      leftBar={
        <Sidebar
          navigationMode="split"
          onNavigateOverride={handleSplitNavigation}
          isOverrideActive={isSplitLinkActive}
        />
      }
      contentClassName="overflow-hidden"
      hideFooter
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background-primary">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <SplitPaneFrame
            active={activePane === "left"}
            closeLabel="Close left pane"
            onSelect={() => setActivePane("left")}
            onClose={leftPaneHref ? () => closePane("left") : undefined}
          >
            {leftPaneHref ? (
              leftPane
            ) : (
              <SplitPanePlaceholder active={activePane === "left"} />
            )}
          </SplitPaneFrame>

          <SplitPaneFrame
            active={activePane === "right"}
            closeLabel="Close right pane"
            onSelect={() => setActivePane("right")}
            onClose={rightPaneHref ? () => closePane("right") : undefined}
          >
            {rightPaneHref ? (
              rightPane
            ) : (
              <SplitPanePlaceholder active={activePane === "right"} />
            )}
          </SplitPaneFrame>
        </div>
      </div>
    </PageLayout>
  );
};

export default SplitViewPage;
