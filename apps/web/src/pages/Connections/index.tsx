import LanguageSwitcher from "@app/components/LanguageSwitcher";
import { ConnectionStatusBadge } from "@app/components/PageComponents/Connections/ConnectionStatusBadge";
import { formatConnectionSubtext } from "@app/pages/Connections/utils";
import { Button } from "@components/UI/Button.tsx";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@components/UI/Card.tsx";
import { Separator } from "@components/UI/Separator.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Cable, Link2, RotateCw, Unplug } from "lucide-react";
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
          <Button onClick={handleConnectSerial} disabled={isBusy} className="gap-2">
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
    </div>
  );
};
