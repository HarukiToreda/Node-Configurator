import { create } from "@bufbuild/protobuf";
import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type ExternalNotificationValidation,
  ExternalNotificationValidationSchema,
} from "@app/validation/moduleConfig/externalNotification.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { useDevice } from "@core/stores";
import { playRtttl, type RtttlPlaybackController } from "@core/utils/rtttl.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ExternalNotificationModuleConfigProps {
  onFormInit: DynamicFormFormInit<ExternalNotificationValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    externalNotification?: Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig;
  },
  peek: () =>
    ({}) as {
      externalNotification?: Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig;
    },
  subscribe: () => () => {},
} as const;

const EMPTY_RINGTONE_SIGNAL = {
  value: "",
  peek: () => "",
  subscribe: () => () => {},
} as const;

export const ExternalNotification = ({
  onFormInit,
}: ExternalNotificationModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "externalNotification" });

  const { moduleConfig, getEffectiveModuleConfig, sendAdminMessage } =
    useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const ringtone = useSignal(editor?.ringtoneMessage ?? EMPTY_RINGTONE_SIGNAL);
  const effective =
    modules.externalNotification ??
    (getEffectiveModuleConfig("externalNotification") as
      | Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig
      | undefined);
  const hasRequestedRingtone = useRef(false);
  const playbackRef = useRef<RtttlPlaybackController | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { t } = useTranslation("moduleConfig");

  useEffect(() => {
    if (hasRequestedRingtone.current) {
      return;
    }

    hasRequestedRingtone.current = true;
    sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "getRingtoneRequest",
          value: true,
        },
      }),
    );
  }, [sendAdminMessage]);

  useEffect(() => {
    return () => {
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, []);

  const onSubmit = (data: ExternalNotificationValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "externalNotification",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig,
    );
  };

  const stopPreview = () => {
    playbackRef.current?.stop();
    playbackRef.current = null;
    setIsPlaying(false);
  };

  const handlePreview = async () => {
    if (!ringtone.trim()) {
      setPreviewError(t("externalNotification.ringtone.empty"));
      return;
    }

    if (isPlaying) {
      stopPreview();
      return;
    }

    setPreviewError(null);
    playbackRef.current?.stop();

    try {
      const playback = await playRtttl(ringtone);
      playbackRef.current = playback;
      setIsPlaying(true);
      void playback.done.finally(() => {
        if (playbackRef.current === playback) {
          playbackRef.current = null;
          setIsPlaying(false);
        }
      });
    } catch (error) {
      setIsPlaying(false);
      setPreviewError(
        error instanceof Error
          ? error.message
          : t("externalNotification.ringtone.invalid"),
      );
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-300 bg-slate-50/30 p-4 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("externalNotification.ringtone.label")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("externalNotification.ringtone.description")}
          </p>
        </div>
        <Input
          value={ringtone}
          placeholder={t("externalNotification.ringtone.placeholder")}
          onChange={(event) => {
            setPreviewError(null);
            editor?.setRingtoneMessage(event.target.value);
          }}
          showClearButton
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={isPlaying ? "outline" : "subtle"}
            size="sm"
            onClick={() => void handlePreview()}
            icon={isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          >
            {isPlaying
              ? t("externalNotification.ringtone.stop")
              : t("externalNotification.ringtone.play")}
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("externalNotification.ringtone.help")}
          </p>
        </div>
        {previewError && (
          <p className="mt-2 text-xs text-red-500">{previewError}</p>
        )}
      </section>

      <DynamicForm<ExternalNotificationValidation>
        onSubmit={onSubmit}
        onFormInit={onFormInit}
        validationSchema={ExternalNotificationValidationSchema}
        defaultValues={moduleConfig.externalNotification}
        values={effective}
        fieldGroups={[
          {
            label: t("externalNotification.externalNotificationConfig.label"),
            description: t(
              "externalNotification.externalNotificationConfig.description",
            ),
            fields: [
              {
                type: "toggle",
                name: "enabled",
                label: t("externalNotification.enabled.label"),
                description: t("externalNotification.enabled.description"),
              },
            ],
          },
          {
            label: t("externalNotification.notificationsOnMessage.label"),
            description: t(
              "externalNotification.notificationsOnMessage.description",
            ),
            fields: [
              {
                type: "toggle",
                name: "alertMessage",
                label: t("externalNotification.alertMessage.label"),
                description: t("externalNotification.alertMessage.description"),
              },
              {
                type: "toggle",
                name: "alertMessageBuzzer",
                label: t("externalNotification.alertMessageBuzzer.label"),
                description: t(
                  "externalNotification.alertMessageBuzzer.description",
                ),
              },
              {
                type: "toggle",
                name: "alertMessageVibra",
                label: t("externalNotification.alertMessageVibra.label"),
                description: t(
                  "externalNotification.alertMessageVibra.description",
                ),
              },
            ],
          },
          {
            label: t("externalNotification.notificationsOnAlert.label"),
            description: t(
              "externalNotification.notificationsOnAlert.description",
            ),
            fields: [
              {
                type: "toggle",
                name: "alertBell",
                label: t("externalNotification.alertBell.label"),
                description: t("externalNotification.alertBell.description"),
              },
              {
                type: "toggle",
                name: "alertBellBuzzer",
                label: t("externalNotification.alertBellBuzzer.label"),
                description: t(
                  "externalNotification.alertBellBuzzer.description",
                ),
              },
              {
                type: "toggle",
                name: "alertBellVibra",
                label: t("externalNotification.alertBellVibra.label"),
                description: t(
                  "externalNotification.alertBellVibra.description",
                ),
              },
            ],
          },
          {
            label: t("externalNotification.advanced.label"),
            description: t("externalNotification.advanced.description"),
            fields: [
              {
                type: "number",
                name: "output",
                label: t("externalNotification.output.label"),
                description: t("externalNotification.output.description"),
              },
              {
                type: "toggle",
                name: "active",
                label: t("externalNotification.active.label"),
                description: t("externalNotification.active.description"),
              },
              {
                type: "number",
                name: "outputBuzzer",
                label: t("externalNotification.outputBuzzer.label"),
                description: t("externalNotification.outputBuzzer.description"),
              },
              {
                type: "toggle",
                name: "usePwm",
                label: t("externalNotification.usePwm.label"),
                description: t("externalNotification.usePwm.description"),
              },
              {
                type: "number",
                name: "outputVibra",
                label: t("externalNotification.outputVibra.label"),
                description: t("externalNotification.outputVibra.description"),
              },
              {
                type: "number",
                name: "outputMs",
                label: t("externalNotification.outputMs.label"),
                description: t("externalNotification.outputMs.description"),
                properties: { suffix: t("unit.millisecond.suffix") },
              },
              {
                type: "number",
                name: "nagTimeout",
                label: t("externalNotification.nagTimeout.label"),
                description: t("externalNotification.nagTimeout.description"),
                properties: { suffix: t("unit.second.plural") },
              },
              {
                type: "toggle",
                name: "useI2sAsBuzzer",
                label: t("externalNotification.useI2sAsBuzzer.label"),
                description: t(
                  "externalNotification.useI2sAsBuzzer.description",
                ),
              },
            ],
          },
        ]}
      />
    </div>
  );
};
