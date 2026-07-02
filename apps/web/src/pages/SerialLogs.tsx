import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useDevice } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { Protobuf } from "@meshtastic/sdk";
import { numberToHexUnpadded } from "@noble/curves/utils.js";
import { DownloadIcon, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type AnsiSegment = {
  text: string;
  style: {
    color?: string;
    fontWeight?: number;
    opacity?: number;
  };
};

const ANSI_SGR_PATTERN = /\x1b\[([0-9;]*)m/g;

const ANSI_COLOR_MAP: Record<number, string> = {
  30: "#94a3b8",
  31: "#f87171",
  32: "#4ade80",
  33: "#facc15",
  34: "#60a5fa",
  35: "#c084fc",
  36: "#22d3ee",
  37: "#e2e8f0",
  90: "#64748b",
  91: "#fca5a5",
  92: "#86efac",
  93: "#fde047",
  94: "#93c5fd",
  95: "#d8b4fe",
  96: "#67e8f9",
  97: "#f8fafc",
};

const parseAnsiSegments = (text: string): AnsiSegment[] => {
  const segments: AnsiSegment[] = [];
  const state: AnsiSegment["style"] = {};
  let lastIndex = 0;

  const pushText = (value: string) => {
    if (!value.length) {
      return;
    }

    segments.push({
      text: value,
      style: {
        color: state.color,
        fontWeight: state.fontWeight,
        opacity: state.opacity,
      },
    });
  };

  for (const match of text.matchAll(ANSI_SGR_PATTERN)) {
    const matchIndex = match.index ?? 0;
    pushText(text.slice(lastIndex, matchIndex));

    const codes = (match[1] || "0")
      .split(";")
      .map((value) => Number.parseInt(value || "0", 10));

    for (const code of codes) {
      if (code === 0) {
        state.color = undefined;
        state.fontWeight = undefined;
        state.opacity = undefined;
        continue;
      }

      if (code === 1) {
        state.fontWeight = 700;
        continue;
      }

      if (code === 2) {
        state.opacity = 0.75;
        continue;
      }

      if (code === 22) {
        state.fontWeight = undefined;
        state.opacity = undefined;
        continue;
      }

      if (code === 39) {
        state.color = undefined;
        continue;
      }

      const color = ANSI_COLOR_MAP[code];
      if (color) {
        state.color = color;
      }
    }

    lastIndex = matchIndex + match[0].length;
  }

  pushText(text.slice(lastIndex));
  return segments;
};

const SerialAnsiText = ({ text }: { text: string }) => {
  const segments = useMemo(() => parseAnsiSegments(text), [text]);

  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={`${index}-${segment.text}`}
          style={segment.style}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
};

const SerialLogsPage = () => {
  const { t } = useTranslation("ui");
  const { serialLogs, clearSerialLogs, config } = useDevice();
  const myNode = useMyNodeAsProto();
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const serialConsoleEnabled = !!config.security?.serialEnabled;
  const debugLogApiEnabled = !!config.security?.debugLogApiEnabled;

  const logLines = useMemo(
    () =>
      serialLogs.map((entry) => {
        const timestamp = entry.timestamp.toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        if (entry.source === "logRecord") {
          const level =
            Protobuf.Mesh.LogRecord_Level[entry.level ?? 0] ?? "UNKNOWN";
          const origin = entry.origin?.trim().length ? ` ${entry.origin}` : "";
          return {
            id: entry.id,
            prefix: `[${timestamp}] [${level}]${origin} `,
            text: entry.text,
            source: entry.source,
          };
        }

        const fromLabel =
          typeof entry.from === "number"
            ? ` !${numberToHexUnpadded(entry.from).slice(-8).toUpperCase()}`
            : "";

        return {
          id: entry.id,
          prefix: `[${timestamp}] [SERIAL]${fromLabel} `,
          text: entry.text,
          source: entry.source,
        };
      }),
    [serialLogs],
  );

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [autoScroll, logLines]);

  const saveLogs = () => {
    const fileContent =
      logLines.length > 0
        ? logLines.map((line) => `${line.prefix}${line.text}`).join("\n")
        : t("serialLogs.emptyState", { defaultValue: "No logs captured yet." });

    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const shortName = myNode?.user?.shortName?.trim() || "node";
    const timestamp = new Date().toISOString().replaceAll(":", "-");

    link.href = url;
    link.download = `haru-serial-logs-${shortName}-${timestamp}.txt`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const emptyState =
    !serialConsoleEnabled && !debugLogApiEnabled
      ? t("serialLogs.emptyStateDisabled")
      : t("serialLogs.emptyState");

  const actions = [
    {
      key: "clear",
      icon: TrashIcon,
      label: t("serialLogs.clear"),
      onClick: clearSerialLogs,
      disabled: logLines.length === 0,
      className:
        "hover:bg-slate-200 hover:dark:bg-slate-300 hover:dark:text-black",
    },
    {
      key: "save",
      icon: DownloadIcon,
      label: t("serialLogs.save"),
      onClick: saveLogs,
      disabled: logLines.length === 0,
      className:
        "hover:bg-slate-200 hover:dark:bg-slate-300 hover:dark:text-black",
    },
  ];

  return (
    <PageLayout
      label={t("serialLogs.title")}
      leftBar={<Sidebar />}
      actions={actions}
      contentClassName="overflow-hidden"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]" />
            <span>{t("serialLogs.live")}</span>
          </div>

          <div className="text-slate-500 dark:text-slate-400">
            {t("serialLogs.entryCount", { count: logLines.length })}
          </div>

          <div className="text-slate-500 dark:text-slate-400">
            Serial:{" "}
            <span
              className={cn(
                "font-medium",
                serialConsoleEnabled
                  ? "text-green-600 dark:text-green-400"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {t(
                serialConsoleEnabled
                  ? "serialLogs.serialConsoleOn"
                  : "serialLogs.serialConsoleOff",
              )}
            </span>
          </div>

          <div className="text-slate-500 dark:text-slate-400">
            Debug:{" "}
            <span
              className={cn(
                "font-medium",
                debugLogApiEnabled
                  ? "text-green-600 dark:text-green-400"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {t(
                debugLogApiEnabled
                  ? "serialLogs.debugApiOn"
                  : "serialLogs.debugApiOff",
              )}
            </span>
          </div>

          <label className="ml-auto flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Switch
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
              aria-label={t("serialLogs.autoScroll")}
            />
            <span>{t("serialLogs.autoScroll")}</span>
          </label>
        </div>

        {(!serialConsoleEnabled || !debugLogApiEnabled) && (
          <div className="px-1 text-sm text-slate-500 dark:text-slate-400">
            {t("serialLogs.hint")}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-800 bg-[#050816] shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <span>Console</span>
            <span>{myNode?.user?.shortName?.trim() || "Node"}</span>
          </div>

          <div ref={scrollRef} className="h-full overflow-auto">
            {logLines.length > 0 ? (
              <div className="min-w-max px-4 py-3 font-mono text-xs leading-5 text-slate-100">
                {logLines.map((line) => (
                  <div key={line.id} className="whitespace-pre">
                    <span className="text-slate-500">{line.prefix}</span>
                    {line.source === "serial" ? (
                      <SerialAnsiText text={line.text} />
                    ) : (
                      <span>{line.text}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-slate-400">
                {emptyState}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default SerialLogsPage;
