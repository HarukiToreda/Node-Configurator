import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { cn } from "@core/utils/cn.ts";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { DeviceConfig } from "@pages/Settings/DeviceConfig.tsx";
import { ModuleConfig } from "@pages/Settings/ModuleConfig.tsx";
import { useRouterState } from "@tanstack/react-router";
import { RefreshCwIcon, SaveIcon, SaveOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { RadioConfig } from "./RadioConfig.tsx";

type ConfigSectionKey = "radio" | "device" | "module";

const ConfigPageContent = ({
  splitPane = false,
  forcedSection,
}: {
  splitPane?: boolean;
  forcedSection?: ConfigSectionKey;
}) => {
  const editor = useConfigEditor();
  const editorIsDirty = useSignal(
    editor?.isDirty ?? {
      value: false,
      peek: () => false,
      subscribe: () => () => {},
    },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [rhfState, setRhfState] = useState({ isDirty: false, isValid: true });
  const unsubRef = useRef<(() => void) | null>(null);
  const [formMethods, setFormMethods] = useState<UseFormReturn | null>(null);
  const { toast } = useToast();
  const routerState = useRouterState();
  const { t } = useTranslation("config");

  const sections = useMemo(
    () => [
      {
        key: "radio" as const,
        label: t("navigation.radioConfig"),
        component: RadioConfig,
      },
      {
        key: "device" as const,
        label: t("navigation.deviceConfig"),
        component: DeviceConfig,
      },
      {
        key: "module" as const,
        label: t("navigation.moduleConfig"),
        component: ModuleConfig,
      },
    ],
    [t],
  );

  const activeSection =
    sections.find((section) =>
      forcedSection
        ? section.key === forcedSection
        : routerState.location.pathname.includes(`/settings/${section.key}`),
    ) ?? sections[0];

  const onFormInit = useCallback(
    <T extends FieldValues>(methods: UseFormReturn<T>) => {
      setFormMethods(methods as UseFormReturn);

      setRhfState({
        isDirty: false,
        isValid: true,
      });

      unsubRef.current?.();
      unsubRef.current = methods.subscribe({
        formState: { isDirty: true, isValid: true },
        callback: ({ isValid, isDirty }) => {
          setRhfState({
            isDirty: isDirty ?? false,
            isValid: isValid ?? true,
          });
        },
      });
    },
    [],
  );

  useEffect(() => {
    return () => unsubRef.current?.();
  }, []);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    if (!editorIsDirty && !rhfState.isValid) {
      toast({
        title: t("toast.validationError.title"),
        description: t("toast.validationError.description"),
      });
      return;
    }
    setIsSaving(true);

    try {
      const result = await editor.commit();
      if (result.status === "error") {
        throw result.error;
      }
      toast({
        title: t("toast.saveAllSuccess.title"),
        description: t("toast.saveAllSuccess.description"),
      });

      if (formMethods) {
        formMethods.reset(formMethods.getValues(), {
          keepDirty: false,
          keepErrors: false,
          keepTouched: false,
          keepValues: true,
        });
        formMethods.trigger();
      }
    } catch {
      toast({
        title: t("toast.configSaveError.title"),
        description: t("toast.configSaveError.description"),
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast, t, formMethods, editor, editorIsDirty, rhfState.isValid]);

  const handleReset = useCallback(() => {
    if (formMethods) {
      formMethods.reset();
    }
    editor?.reset();
  }, [formMethods, editor]);

  const hasDrafts = editorIsDirty;
  const hasPending = hasDrafts || rhfState.isDirty;
  const buttonOpacity = hasPending ? "opacity-100" : "opacity-0";
  const saveDisabled =
    isSaving || !hasPending || (!hasDrafts && !rhfState.isValid);

  const actions = useMemo(
    () => [
      {
        key: "unsavedChanges",
        label: t("common:formValidation.unsavedChanges"),
        onClick: () => {},
        className: cn([
          "bg-blue-500 text-slate-900 hover:bg-initial",
          "transition-colors duration-200",
          buttonOpacity,
          "transition-opacity",
        ]),
      },
      {
        key: "reset",
        icon: RefreshCwIcon,
        label: t("common:button.reset"),
        onClick: handleReset,
        className: cn([
          buttonOpacity,
          "transition-opacity hover:bg-slate-200 disabled:hover:bg-white",
          "hover:dark:bg-slate-300  hover:dark:text-black cursor-pointer",
        ]),
      },
      {
        key: "save",
        icon: !hasPending ? SaveOff : SaveIcon,
        isLoading: isSaving,
        disabled: saveDisabled,
        iconClasses:
          !rhfState.isValid && hasPending
            ? "text-red-400 cursor-not-allowed"
            : "cursor-pointer",
        className: cn([
          "transition-opacity hover:bg-slate-200 disabled:hover:bg-white",
          "hover:dark:bg-slate-300 hover:dark:text-black",
          "disabled:hover:cursor-not-allowed cursor-pointer",
        ]),
        onClick: handleSave,
        label: t("common:button.save"),
      },
    ],
    [
      isSaving,
      hasPending,
      rhfState.isValid,
      saveDisabled,
      buttonOpacity,
      handleReset,
      handleSave,
      t,
    ],
  );

  const ActiveComponent = activeSection.component;

  return (
    <PageLayout
      contentClassName="overflow-auto"
      leftBar={splitPane ? undefined : <Sidebar />}
      label={splitPane ? "" : activeSection.label}
      actions={actions}
      hideFooter={splitPane}
    >
      <ActiveComponent onFormInit={onFormInit} />
    </PageLayout>
  );
};

const ConfigPage = () => <ConfigPageContent />;

export const SplitConfigPage = ({ section }: { section: ConfigSectionKey }) => (
  <ConfigPageContent splitPane forcedSection={section} />
);

export default ConfigPage;
