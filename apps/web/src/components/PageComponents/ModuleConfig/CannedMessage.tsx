import { create } from "@bufbuild/protobuf";
import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type CannedMessageValidation,
  CannedMessageValidationSchema,
} from "@app/validation/moduleConfig/cannedMessage.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface CannedMessageModuleConfigProps {
  onFormInit: DynamicFormFormInit<CannedMessageValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    cannedMessage?: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig;
  },
  peek: () =>
    ({}) as {
      cannedMessage?: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig;
    },
  subscribe: () => () => {},
} as const;

const EMPTY_CANNED_MESSAGE_SIGNAL = {
  value: "",
  peek: () => "",
  subscribe: () => () => {},
} as const;

function parseCannedMessageRows(messages: string): string[] {
  const rows = messages
    .split("|")
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  return rows.length > 0 ? rows : [""];
}

export const CannedMessage = ({
  onFormInit,
}: CannedMessageModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "cannedMessage" });

  const { moduleConfig, getEffectiveModuleConfig, sendAdminMessage } =
    useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const cannedMessages = useSignal(
    editor?.cannedMessageModuleMessages ?? EMPTY_CANNED_MESSAGE_SIGNAL,
  );
  const effective =
    modules.cannedMessage ??
    (getEffectiveModuleConfig("cannedMessage") as
      | Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig
      | undefined);
  const [rows, setRows] = useState<string[]>([""]);
  const hasRequestedMessages = useRef(false);

  const { t } = useTranslation("moduleConfig");

  useEffect(() => {
    setRows(parseCannedMessageRows(cannedMessages));
  }, [cannedMessages]);

  useEffect(() => {
    if (hasRequestedMessages.current) {
      return;
    }

    hasRequestedMessages.current = true;
    sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "getCannedMessageModuleMessagesRequest",
          value: true,
        },
      }),
    );
  }, [sendAdminMessage]);

  const onSubmit = (data: CannedMessageValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "cannedMessage",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig,
    );
  };

  const pushRowsToEditor = useCallback(
    (nextRows: string[]) => {
      setRows(nextRows);
      editor?.setCannedMessageModuleMessages(
        nextRows
          .map((row) => row.trim())
          .filter((row) => row.length > 0)
          .join("|"),
      );
    },
    [editor],
  );

  const handleRowChange = useCallback(
    (index: number, value: string) => {
      const nextRows = [...rows];
      nextRows[index] = value;
      pushRowsToEditor(nextRows);
    },
    [pushRowsToEditor, rows],
  );

  const handleAddRow = useCallback(() => {
    setRows((currentRows) => [...currentRows, ""]);
  }, []);

  const handleRemoveRow = useCallback(
    (index: number) => {
      const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
      pushRowsToEditor(nextRows.length > 0 ? nextRows : [""]);
    },
    [pushRowsToEditor, rows],
  );

  const cannedMessageRows = useMemo(
    () =>
      rows.map((row, index) => ({
        id: `${index}-${row}`,
        label: `${t("cannedMessage.messages.rowLabel")} ${index + 1}`,
        value: row,
      })),
    [rows, t],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-300 bg-slate-50/30 p-4 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t("cannedMessage.messages.label")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("cannedMessage.messages.description")}
            </p>
          </div>
          <Button
            variant="subtle"
            size="sm"
            onClick={handleAddRow}
            icon={<Plus size={16} />}
          >
            {t("cannedMessage.messages.add")}
          </Button>
        </div>

        <div className="space-y-2">
          {cannedMessageRows.map((row, index) => (
            <div
              key={row.id}
              className="grid grid-cols-[72px_minmax(0,1fr)_40px] items-center gap-2"
            >
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {row.label}
              </span>
              <Input
                value={row.value}
                placeholder={t("cannedMessage.messages.placeholder")}
                onChange={(event) => handleRowChange(index, event.target.value)}
                showClearButton
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("cannedMessage.messages.remove")}
                title={t("cannedMessage.messages.remove")}
                onClick={() => handleRemoveRow(index)}
                disabled={rows.length === 1 && row.value.trim().length === 0}
                icon={<Trash2 size={16} />}
              />
            </div>
          ))}
        </div>
      </section>

      <DynamicForm<CannedMessageValidation>
        onSubmit={onSubmit}
        onFormInit={onFormInit}
        validationSchema={CannedMessageValidationSchema}
        defaultValues={moduleConfig.cannedMessage}
        values={effective}
        fieldGroups={[
          {
            label: t("cannedMessage.cannedMessageConfig.label"),
            description: t("cannedMessage.cannedMessageConfig.description"),
            fields: [
              {
                type: "toggle",
                name: "enabled",
                label: t("cannedMessage.enabled.label"),
                description: t("cannedMessage.enabled.description"),
              },
              {
                type: "toggle",
                name: "rotary1Enabled",
                label: t("cannedMessage.rotary1Enabled.label"),
                description: t("cannedMessage.rotary1Enabled.description"),
              },
              {
                type: "number",
                name: "inputbrokerPinA",
                label: t("cannedMessage.inputbrokerPinA.label"),
                description: t("cannedMessage.inputbrokerPinA.description"),
              },
              {
                type: "number",
                name: "inputbrokerPinB",
                label: t("cannedMessage.inputbrokerPinB.label"),
                description: t("cannedMessage.inputbrokerPinB.description"),
              },
              {
                type: "number",
                name: "inputbrokerPinPress",
                label: t("cannedMessage.inputbrokerPinPress.label"),
                description: t("cannedMessage.inputbrokerPinPress.description"),
              },
              {
                type: "select",
                name: "inputbrokerEventPress",
                label: t("cannedMessage.inputbrokerEventPress.label"),
                description: t("cannedMessage.inputbrokerEventPress.description"),
                properties: {
                  enumValue:
                    Protobuf.ModuleConfig
                      .ModuleConfig_CannedMessageConfig_InputEventChar,
                },
              },
              {
                type: "select",
                name: "inputbrokerEventCw",
                label: t("cannedMessage.inputbrokerEventCw.label"),
                description: t("cannedMessage.inputbrokerEventCw.description"),
                properties: {
                  enumValue:
                    Protobuf.ModuleConfig
                      .ModuleConfig_CannedMessageConfig_InputEventChar,
                },
              },
              {
                type: "select",
                name: "inputbrokerEventCcw",
                label: t("cannedMessage.inputbrokerEventCcw.label"),
                description: t("cannedMessage.inputbrokerEventCcw.description"),
                properties: {
                  enumValue:
                    Protobuf.ModuleConfig
                      .ModuleConfig_CannedMessageConfig_InputEventChar,
                },
              },
              {
                type: "toggle",
                name: "updown1Enabled",
                label: t("cannedMessage.updown1Enabled.label"),
                description: t("cannedMessage.updown1Enabled.description"),
              },
              {
                type: "text",
                name: "allowInputSource",
                label: t("cannedMessage.allowInputSource.label"),
                description: t("cannedMessage.allowInputSource.description"),
              },
              {
                type: "toggle",
                name: "sendBell",
                label: t("cannedMessage.sendBell.label"),
                description: t("cannedMessage.sendBell.description"),
              },
            ],
          },
        ]}
      />
    </div>
  );
};
