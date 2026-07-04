import LanguageSwitcher from "@app/components/LanguageSwitcher";
import { ConnectionStatusBadge } from "@app/components/PageComponents/Connections/ConnectionStatusBadge";
import { formatConnectionSubtext } from "@app/pages/Connections/utils";
import { Button } from "@components/UI/Button.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@components/UI/Accordion.tsx";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@components/UI/Card.tsx";
import { Separator } from "@components/UI/Separator.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { buildAndroidPresetDownload, presetCatalog } from "@core/presets.ts";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Cable,
  Download,
  Link2,
  RotateCw,
  Unplug,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useConnections } from "./useConnections";

export const Connections = () => {
  const {
    connections,
    connect,
    connectSerial,
    disconnect,
    refreshStatuses,
    syncConnectionStatuses,
  } = useConnections();
  const { toast } = useToast();
  const navigate = useNavigate({ from: "/" });
  const { t } = useTranslation("connections");

  const activeConnection = connections[0];
  const isConnected =
    activeConnection?.status === "connected" ||
    activeConnection?.status === "configured";
  const isBusy =
    activeConnection?.status === "connecting" ||
    activeConnection?.status === "configuring";
  const isError = activeConnection?.status === "error";

  useEffect(() => {
    syncConnectionStatuses();
    refreshStatuses();
  }, [refreshStatuses, syncConnectionStatuses]);

  const handleConnectSerial = async () => {
    try {
      const result = await connectSerial();
      if (!result.ok) {
        toast({
          title: t("toasts.failed"),
          description: t("toasts.checkConnection"),
        });
        return;
      }

      toast({
        title: t("toasts.connected"),
        description: t("toasts.nowConnected", {
          name: result.connection.name,
          interpolation: { escapeValue: false },
        }),
      });
      navigate({ to: "/" });
    } catch (error) {
      if ((error as { name?: string }).name === "NotFoundError") {
        return;
      }

      toast({
        title: t("toasts.failed"),
        description:
          error instanceof Error ? error.message : t("toasts.checkConnection"),
      });
    }
  };

  const handleReconnect = async () => {
    if (!activeConnection) {
      return;
    }

    const ok = await connect(activeConnection.id, { allowPrompt: false });
    toast({
      title: ok ? t("toasts.connected") : t("toasts.failed"),
      description: ok
        ? t("toasts.nowConnected", {
            name: activeConnection.name,
            interpolation: { escapeValue: false },
          })
        : t("toasts.pickConnectionAgain"),
    });

    if (ok) {
      navigate({ to: "/" });
    }
  };

  const handleDisconnect = async () => {
    if (!activeConnection) {
      return;
    }

    await disconnect(activeConnection.id);
    toast({
      title: t("toasts.disconnected"),
      description: t("toasts.nowDisconnected", {
        name: activeConnection.name,
        interpolation: { escapeValue: false },
      }),
    });
  };

  const handleDownloadPreset = (presetId: string) => {
    try {
      const download = buildAndroidPresetDownload(presetId);
      const blob = new Blob([download.bytes], { type: download.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = download.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast({
        title: t("toasts.presetDownloaded"),
        description: t("toasts.presetDownloadedByName", {
          name: download.name,
          interpolation: { escapeValue: false },
        }),
      });
    } catch (error) {
      toast({
        title: t("toasts.failed"),
        description:
          error instanceof Error
            ? error.message
            : t("toasts.presetDownloadFailed"),
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-stretch gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="flex items-center justify-center w-9 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t("page.title")}
            </h1>
            <p className="lg:w-4/6 md:w-5/6 text-slate-500 dark:text-slate-400 mt-1">
              {t("page.description")}
            </p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <Separator />

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cable className="size-5" />
            {t("serial.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-500 dark:text-slate-400">
            {t("serial.description")}
          </p>

          {activeConnection ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{activeConnection.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {formatConnectionSubtext(activeConnection)}
                  </div>
                </div>
                <ConnectionStatusBadge status={activeConnection.status} />
              </div>

              {activeConnection.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {activeConnection.error}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={handleConnectSerial}
            disabled={isBusy}
            className="gap-2"
          >
            <Cable className="size-4" />
            {activeConnection
              ? t("button.chooseAnotherPort")
              : t("button.selectPort")}
          </Button>

          {activeConnection && !isConnected ? (
            <Button
              variant="subtle"
              onClick={handleReconnect}
              disabled={isBusy}
              className="gap-2"
            >
              <RotateCw className="size-4" />
              {isError ? t("button.retry") : t("button.reconnect")}
            </Button>
          ) : null}

          {activeConnection && isConnected ? (
            <Button
              variant="subtle"
              onClick={handleDisconnect}
              disabled={isBusy}
              className="gap-2"
            >
              <Unplug className="size-4" />
              {t("button.disconnect")}
            </Button>
          ) : null}

          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/" })}
            className="gap-2"
          >
            <Link2 className="size-4" />
            {t("button.skipBack")}
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-dashed overflow-hidden">
        <Accordion type="single" collapsible>
          <AccordionItem value="android-presets" className="border-none">
            <AccordionHeader>
              <AccordionTrigger className="border-b-0 px-6 py-5">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Download className="size-5" />
                  {t("presetDownload.title")}
                </div>
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent className="border-b-0 space-y-4 px-6 pb-6 pt-0">
              <p className="text-slate-500 dark:text-slate-400">
                {t("presetDownload.description")}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-300">
                {t("presetDownload.limitations")}
              </p>
              <div className="space-y-3">
                {presetCatalog.map((preset) => (
                  <div
                    key={preset.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{preset.name}</div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {preset.description}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDownloadPreset(preset.id)}
                        className="gap-2 md:self-center"
                      >
                        <Download className="size-4" />
                        {t("button.downloadAndroidPreset")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
};
