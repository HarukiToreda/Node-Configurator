import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf, type ConfigEditor } from "@meshtastic/sdk";
import { toByteArray } from "base64-js";

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  highlights: readonly string[];
}

export interface PresetDownloadDefinition {
  name: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

interface PresetContext {
  editor: ConfigEditor;
  device: {
    config: {
      lora?: Protobuf.Config.Config_LoRaConfig;
    };
    getEffectiveConfig: (section: string) => unknown;
    getEffectiveModuleConfig: (section: string) => unknown;
  };
  myNode?: Protobuf.Mesh.NodeInfo;
}

const NRF_TXT_CANNED_MESSAGES =
  "Test|\u{1F44D}|\u{1F44E}|\u{1F600}|Hello|Heard|Enabling GPS|share Location|Come to me|Going to you|Help|SOS";
const NRF_TXT_RINGTONE = "Bubble:d=16,o=5,b=140:a6,b6,d7";
const NRF_TXT_CHANNEL_URL =
  "https://meshtastic.org/e/#CgcSAQE6AgggEhYIARj6ASALKAU4AUADSAFQG2gBwAYB";
const PUBLIC_CHANNEL_SAFE_POSITION_PRECISION = 19;

const HEL_TXT_CANNED_MESSAGES =
  "Test|Hello|Heard|Enabling GPS|share Location|Come to me|Going to you|Help|SOS";
const HEL_TXT_RINGTONE = "Bubble:d=16,o=5,b=140:a6,b6,d7";
const HEL_TXT_CHANNEL_URL =
  "https://meshtastic.org/e/#CgcSAQE6AgggEhYIARj6ASALKAU4AUADSAFQG2gBwAYB";

const HP_CANNED_MESSAGES =
  "Test|\u{1F44D}|\u{1F44E}|\u{1F600}|Hello|Heard|Enabling GPS|share Location|Come to me|Going to you|Help|SOS";
const HP_CHANNEL_URL =
  "https://meshtastic.org/e/#CgcSAQE6AgggEhYIARj6ASALKAU4AUADSAFQG2gBwAYB";

const HP2_CANNED_MESSAGES =
  "Test|\u{1F44D}|\u{1F44E}|\u{1F600}|Hello|Heard|Enabling GPS|share Location|Come to me|Going to you|Help|SOS";
const HP2_RINGTONE = "Bubble:d=16,o=5,b=140:a6,b6,d7";
const HP2_CHANNEL_URL =
  "https://meshtastic.org/e/#CgcSAQE6AgggEhYIARj6ASALKAU4AUADSAFQG2gBwAYB";

export const presetCatalog: readonly PresetDefinition[] = [
  {
    id: "nrf-txt",
    name: "NRF-TXT",
    description:
      "Loads your NRF-TXT baseline into the same editable draft system Haru Client uses.",
    highlights: [
      "Sets device, display, bluetooth, position, external notification, telemetry, and LoRa defaults.",
      "Imports the channel URL into channel drafts.",
      "Builds owner long/short names from the connected node id.",
      "Queues canned messages and ringtone so Save pushes them with the rest of the preset.",
    ],
  },
  {
    id: "hel-txt",
    name: "Hel-TXT",
    description:
      "Loads your Hel-TXT baseline with Heltec-friendly buzzer, GPS, notification, and power defaults.",
    highlights: [
      "Sets device, display, power saving, bluetooth, position GPIOs, telemetry, and LoRa defaults.",
      "Imports the channel URL into channel drafts.",
      "Builds owner long/short names from the connected node id.",
      "Queues canned messages and ringtone so Save pushes them with the rest of the preset.",
    ],
  },
  {
    id: "hp",
    name: "HP",
    description:
      "Loads your HP Paper baseline with simpler display defaults, power saving, canned messages, and Paper owner naming.",
    highlights: [
      "Sets bluetooth pairing mode, time zone, display formatting, power saving, and LoRa region defaults.",
      "Imports the channel URL into channel drafts.",
      "Builds owner long/short names from the connected node id using Paper / WP.",
      "Queues canned messages so Save pushes them with the rest of the preset.",
    ],
  },
  {
    id: "hp2",
    name: "HP2",
    description:
      "Loads your HP2 baseline with imperial display formatting, fixed-PIN bluetooth, a disabled external notification nag timeout, canned messages, and ringtone.",
    highlights: [
      "Sets device time zone, display units/clock format, and bluetooth pairing mode.",
      "Disables the external notification nag timeout.",
      "Imports the channel URL into channel drafts and sets LoRa region to unset.",
      "Builds owner long/short names from the connected node id using HP2.",
      "Queues canned messages and ringtone so Save pushes them with the rest of the preset.",
    ],
  },
] as const;

export function applyPreset(
  presetId: string,
  context: PresetContext,
): PresetDefinition {
  const preset = presetCatalog.find((entry) => entry.id === presetId);
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  if (presetId === "nrf-txt") {
    applyNrfTxtPreset(context);
  } else if (presetId === "hel-txt") {
    applyHelTxtPreset(context);
  } else if (presetId === "hp") {
    applyHpPreset(context);
  } else if (presetId === "hp2") {
    applyHp2Preset(context);
  }

  return preset;
}

export function buildAndroidPresetDownload(
  presetId: string,
): PresetDownloadDefinition {
  let profile: Protobuf.ClientOnly.DeviceProfile;
  let fileName: string;
  let name: string;

  if (presetId === "nrf-txt") {
    profile = buildNrfTxtAndroidProfile();
    fileName = "nrf-txt_nodeConfig.cfg";
    name = "NRF-TXT";
  } else if (presetId === "hel-txt") {
    profile = buildHelTxtAndroidProfile();
    fileName = "hel-txt_nodeConfig.cfg";
    name = "Hel-TXT";
  } else if (presetId === "hp") {
    profile = buildHpAndroidProfile();
    fileName = "hp_nodeConfig.cfg";
    name = "HP";
  } else if (presetId === "hp2") {
    profile = buildHp2AndroidProfile();
    fileName = "hp2_nodeConfig.cfg";
    name = "HP2";
  } else {
    throw new Error(`Android export is not available for preset: ${presetId}`);
  }

  return {
    name,
    fileName,
    mimeType: "application/octet-stream",
    bytes: toBinary(Protobuf.ClientOnly.DeviceProfileSchema, profile),
  };
}

function applyNrfTxtPreset({ editor, device, myNode }: PresetContext): void {
  const currentDevice =
    (device.getEffectiveConfig("device") as
      | Protobuf.Config.Config_DeviceConfig
      | undefined) ?? create(Protobuf.Config.Config_DeviceConfigSchema);
  editor.setRadioSection("device", {
    ...currentDevice,
    buzzerGpio: 33,
    tzdef: "EST5EDT,M3.2.0,M11.1.0",
  });

  const currentDisplay =
    (device.getEffectiveConfig("display") as
      | Protobuf.Config.Config_DisplayConfig
      | undefined) ?? create(Protobuf.Config.Config_DisplayConfigSchema);
  editor.setRadioSection("display", {
    ...currentDisplay,
    screenOnSecs: 60,
    headingBold: true,
    units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
    use12hClock: true,
    useLongNodeName: true,
    enableMessageBubbles: true,
  });

  const currentBluetooth =
    (device.getEffectiveConfig("bluetooth") as
      | Protobuf.Config.Config_BluetoothConfig
      | undefined) ?? create(Protobuf.Config.Config_BluetoothConfigSchema);
  editor.setRadioSection("bluetooth", {
    ...currentBluetooth,
    mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
  });

  const currentPosition =
    (device.getEffectiveConfig("position") as
      | Protobuf.Config.Config_PositionConfig
      | undefined) ?? create(Protobuf.Config.Config_PositionConfigSchema);
  editor.setRadioSection("position", {
    ...currentPosition,
    gpsMode: Protobuf.Config.Config_PositionConfig_GpsMode.DISABLED,
  });

  const importedLora = importChannelUrl(editor, NRF_TXT_CHANNEL_URL, {
    positionPrecisionOverride: PUBLIC_CHANNEL_SAFE_POSITION_PRECISION,
  });
  const currentLora =
    (device.getEffectiveConfig("lora") as
      | Protobuf.Config.Config_LoRaConfig
      | undefined) ??
    device.config.lora ??
    create(Protobuf.Config.Config_LoRaConfigSchema);
  editor.setRadioSection("lora", {
    ...currentLora,
    ...importedLora,
    region: Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET,
  });

  const currentExternalNotification =
    (device.getEffectiveModuleConfig("externalNotification") as
      | Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig
      | undefined) ??
    create(Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfigSchema);
  editor.setModuleSection("externalNotification", {
    ...currentExternalNotification,
    enabled: true,
    active: true,
    alertBell: true,
    alertBellBuzzer: true,
    alertMessage: true,
    alertMessageBuzzer: true,
    output: 35,
    outputBuzzer: 33,
    usePwm: true,
  });

  const currentTelemetry =
    (device.getEffectiveModuleConfig("telemetry") as
      | Protobuf.ModuleConfig.ModuleConfig_TelemetryConfig
      | undefined) ??
    create(Protobuf.ModuleConfig.ModuleConfig_TelemetryConfigSchema);
  editor.setModuleSection("telemetry", {
    ...currentTelemetry,
    deviceUpdateInterval: 300,
    environmentUpdateInterval: 300,
    environmentMeasurementEnabled: true,
    environmentScreenEnabled: true,
    environmentDisplayFahrenheit: true,
    airQualityEnabled: true,
    airQualityInterval: 300,
    deviceTelemetryEnabled: true,
  });

  applyOwner(editor, myNode, "NRF-TXT", "NT");
  editor.setCannedMessageModuleMessages(NRF_TXT_CANNED_MESSAGES);
  editor.setRingtoneMessage(NRF_TXT_RINGTONE);
}

function buildNrfTxtAndroidProfile(): Protobuf.ClientOnly.DeviceProfile {
  const importedLora = parseChannelUrl(NRF_TXT_CHANNEL_URL, {
    positionPrecisionOverride: PUBLIC_CHANNEL_SAFE_POSITION_PRECISION,
  }).loraConfig;

  return create(Protobuf.ClientOnly.DeviceProfileSchema, {
    longName: "NRF-TXT",
    shortName: "NRTX",
    config: create(Protobuf.LocalOnly.LocalConfigSchema, {
      device: create(Protobuf.Config.Config_DeviceConfigSchema, {
        buzzerGpio: 33,
        tzdef: "EST5EDT,M3.2.0,M11.1.0",
      }),
      display: create(Protobuf.Config.Config_DisplayConfigSchema, {
        screenOnSecs: 60,
        headingBold: true,
        units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
        use12hClock: true,
        useLongNodeName: true,
        enableMessageBubbles: true,
      }),
      bluetooth: create(Protobuf.Config.Config_BluetoothConfigSchema, {
        enabled: true,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
      }),
      position: create(Protobuf.Config.Config_PositionConfigSchema, {
        gpsMode: Protobuf.Config.Config_PositionConfig_GpsMode.DISABLED,
      }),
      lora: create(Protobuf.Config.Config_LoRaConfigSchema, {
        ...(importedLora ?? {}),
        region: Protobuf.Config.Config_LoRaConfig_RegionCode.US,
      }),
    }),
    moduleConfig: create(Protobuf.LocalOnly.LocalModuleConfigSchema, {
      externalNotification: create(
        Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfigSchema,
        {
          enabled: true,
          active: true,
          alertBell: true,
          alertBellBuzzer: true,
          alertMessage: true,
          alertMessageBuzzer: true,
          output: 35,
          outputBuzzer: 33,
          usePwm: true,
        },
      ),
      telemetry: create(
        Protobuf.ModuleConfig.ModuleConfig_TelemetryConfigSchema,
        {
          deviceUpdateInterval: 300,
          environmentUpdateInterval: 300,
          environmentMeasurementEnabled: true,
          environmentScreenEnabled: true,
          environmentDisplayFahrenheit: true,
          airQualityEnabled: true,
          airQualityInterval: 300,
          deviceTelemetryEnabled: true,
        },
      ),
    }),
    ringtone: NRF_TXT_RINGTONE,
    cannedMessages: NRF_TXT_CANNED_MESSAGES,
  });
}

function buildHelTxtAndroidProfile(): Protobuf.ClientOnly.DeviceProfile {
  const importedLora = parseChannelUrl(HEL_TXT_CHANNEL_URL).loraConfig;

  return create(Protobuf.ClientOnly.DeviceProfileSchema, {
    longName: "Hel-TXT",
    shortName: "HT",
    config: create(Protobuf.LocalOnly.LocalConfigSchema, {
      device: create(Protobuf.Config.Config_DeviceConfigSchema, {
        buzzerGpio: 6,
        tzdef: "EST5EDT,M3.2.0,M11.1.0",
      }),
      display: create(Protobuf.Config.Config_DisplayConfigSchema, {
        screenOnSecs: 60,
        headingBold: true,
        units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
        use12hClock: true,
      }),
      power: create(Protobuf.Config.Config_PowerConfigSchema, {
        isPowerSaving: true,
      }),
      bluetooth: create(Protobuf.Config.Config_BluetoothConfigSchema, {
        enabled: true,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
      }),
      position: create(Protobuf.Config.Config_PositionConfigSchema, {
        gpsMode: Protobuf.Config.Config_PositionConfig_GpsMode.DISABLED,
        rxGpio: 5,
        txGpio: 4,
        gpsEnGpio: 3,
      }),
      lora: create(Protobuf.Config.Config_LoRaConfigSchema, {
        ...(importedLora ?? {}),
        region: Protobuf.Config.Config_LoRaConfig_RegionCode.US,
      }),
    }),
    moduleConfig: create(Protobuf.LocalOnly.LocalModuleConfigSchema, {
      externalNotification: create(
        Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfigSchema,
        {
          enabled: true,
          active: true,
          alertBell: true,
          alertBellBuzzer: true,
          alertMessage: true,
          alertMessageBuzzer: true,
          outputBuzzer: 6,
          usePwm: true,
        },
      ),
      telemetry: create(
        Protobuf.ModuleConfig.ModuleConfig_TelemetryConfigSchema,
        {
          deviceUpdateInterval: 300,
          environmentUpdateInterval: 300,
          environmentMeasurementEnabled: true,
          environmentScreenEnabled: true,
          environmentDisplayFahrenheit: true,
          airQualityEnabled: true,
          airQualityInterval: 300,
          deviceTelemetryEnabled: true,
        },
      ),
    }),
    ringtone: HEL_TXT_RINGTONE,
    cannedMessages: HEL_TXT_CANNED_MESSAGES,
  });
}

function buildHpAndroidProfile(): Protobuf.ClientOnly.DeviceProfile {
  const importedLora = parseChannelUrl(HP_CHANNEL_URL).loraConfig;

  return create(Protobuf.ClientOnly.DeviceProfileSchema, {
    longName: "Paper",
    shortName: "WP",
    config: create(Protobuf.LocalOnly.LocalConfigSchema, {
      device: create(Protobuf.Config.Config_DeviceConfigSchema, {
        tzdef: "EST5EDT,M3.2.0,M11.1.0",
      }),
      display: create(Protobuf.Config.Config_DisplayConfigSchema, {
        headingBold: true,
        units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
        use12hClock: true,
      }),
      power: create(Protobuf.Config.Config_PowerConfigSchema, {
        isPowerSaving: true,
      }),
      bluetooth: create(Protobuf.Config.Config_BluetoothConfigSchema, {
        enabled: true,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
      }),
      lora: create(Protobuf.Config.Config_LoRaConfigSchema, {
        ...(importedLora ?? {}),
        region: Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET,
      }),
    }),
    cannedMessages: HP_CANNED_MESSAGES,
  });
}

function buildHp2AndroidProfile(): Protobuf.ClientOnly.DeviceProfile {
  const importedLora = parseChannelUrl(HP2_CHANNEL_URL).loraConfig;

  return create(Protobuf.ClientOnly.DeviceProfileSchema, {
    longName: "HP2",
    shortName: "HP2",
    config: create(Protobuf.LocalOnly.LocalConfigSchema, {
      device: create(Protobuf.Config.Config_DeviceConfigSchema, {
        tzdef: "EST5EDT,M3.2.0,M11.1.0",
      }),
      display: create(Protobuf.Config.Config_DisplayConfigSchema, {
        units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
        use12hClock: true,
      }),
      bluetooth: create(Protobuf.Config.Config_BluetoothConfigSchema, {
        enabled: true,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
      }),
      lora: create(Protobuf.Config.Config_LoRaConfigSchema, {
        ...(importedLora ?? {}),
        region: Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET,
      }),
    }),
    moduleConfig: create(Protobuf.LocalOnly.LocalModuleConfigSchema, {
      externalNotification: create(
        Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfigSchema,
        {
          nagTimeout: 0,
        },
      ),
    }),
    ringtone: HP2_RINGTONE,
    cannedMessages: HP2_CANNED_MESSAGES,
  });
}

function applyHelTxtPreset({ editor, device, myNode }: PresetContext): void {
  const currentDevice =
    (device.getEffectiveConfig("device") as
      | Protobuf.Config.Config_DeviceConfig
      | undefined) ?? create(Protobuf.Config.Config_DeviceConfigSchema);
  editor.setRadioSection("device", {
    ...currentDevice,
    buzzerGpio: 6,
    tzdef: "EST5EDT,M3.2.0,M11.1.0",
  });

  const currentDisplay =
    (device.getEffectiveConfig("display") as
      | Protobuf.Config.Config_DisplayConfig
      | undefined) ?? create(Protobuf.Config.Config_DisplayConfigSchema);
  editor.setRadioSection("display", {
    ...currentDisplay,
    screenOnSecs: 60,
    headingBold: true,
    units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
    use12hClock: true,
  });

  const currentPower =
    (device.getEffectiveConfig("power") as
      | Protobuf.Config.Config_PowerConfig
      | undefined) ?? create(Protobuf.Config.Config_PowerConfigSchema);
  editor.setRadioSection("power", {
    ...currentPower,
    isPowerSaving: true,
  });

  const currentBluetooth =
    (device.getEffectiveConfig("bluetooth") as
      | Protobuf.Config.Config_BluetoothConfig
      | undefined) ?? create(Protobuf.Config.Config_BluetoothConfigSchema);
  editor.setRadioSection("bluetooth", {
    ...currentBluetooth,
    mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
  });

  const currentPosition =
    (device.getEffectiveConfig("position") as
      | Protobuf.Config.Config_PositionConfig
      | undefined) ?? create(Protobuf.Config.Config_PositionConfigSchema);
  editor.setRadioSection("position", {
    ...currentPosition,
    gpsMode: Protobuf.Config.Config_PositionConfig_GpsMode.DISABLED,
    rxGpio: 5,
    txGpio: 4,
    gpsEnGpio: 3,
  });

  const importedLora = importChannelUrl(editor, HEL_TXT_CHANNEL_URL, {
    positionPrecisionOverride: PUBLIC_CHANNEL_SAFE_POSITION_PRECISION,
  });
  const currentLora =
    (device.getEffectiveConfig("lora") as
      | Protobuf.Config.Config_LoRaConfig
      | undefined) ??
    device.config.lora ??
    create(Protobuf.Config.Config_LoRaConfigSchema);
  editor.setRadioSection("lora", {
    ...currentLora,
    ...importedLora,
    region: Protobuf.Config.Config_LoRaConfig_RegionCode.US,
  });

  const currentExternalNotification =
    (device.getEffectiveModuleConfig("externalNotification") as
      | Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig
      | undefined) ??
    create(Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfigSchema);
  editor.setModuleSection("externalNotification", {
    ...currentExternalNotification,
    enabled: true,
    active: true,
    alertBell: true,
    alertBellBuzzer: true,
    alertMessage: true,
    alertMessageBuzzer: true,
    outputBuzzer: 6,
    usePwm: true,
  });

  const currentTelemetry =
    (device.getEffectiveModuleConfig("telemetry") as
      | Protobuf.ModuleConfig.ModuleConfig_TelemetryConfig
      | undefined) ??
    create(Protobuf.ModuleConfig.ModuleConfig_TelemetryConfigSchema);
  editor.setModuleSection("telemetry", {
    ...currentTelemetry,
    deviceUpdateInterval: 300,
    environmentUpdateInterval: 300,
    environmentMeasurementEnabled: true,
    environmentScreenEnabled: true,
    environmentDisplayFahrenheit: true,
    airQualityEnabled: true,
    airQualityInterval: 300,
    deviceTelemetryEnabled: true,
  });

  applyOwner(editor, myNode, "Hel-TXT", "HT");
  editor.setCannedMessageModuleMessages(HEL_TXT_CANNED_MESSAGES);
  editor.setRingtoneMessage(HEL_TXT_RINGTONE);
}

function applyHpPreset({ editor, device, myNode }: PresetContext): void {
  const importedLora = importChannelUrl(editor, HP_CHANNEL_URL, {
    positionPrecisionOverride: PUBLIC_CHANNEL_SAFE_POSITION_PRECISION,
  });

  const currentBluetooth =
    (device.getEffectiveConfig("bluetooth") as
      | Protobuf.Config.Config_BluetoothConfig
      | undefined) ?? create(Protobuf.Config.Config_BluetoothConfigSchema);
  editor.setRadioSection("bluetooth", {
    ...currentBluetooth,
    mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
  });

  const currentDevice =
    (device.getEffectiveConfig("device") as
      | Protobuf.Config.Config_DeviceConfig
      | undefined) ?? create(Protobuf.Config.Config_DeviceConfigSchema);
  editor.setRadioSection("device", {
    ...currentDevice,
    tzdef: "EST5EDT,M3.2.0,M11.1.0",
  });

  const currentDisplay =
    (device.getEffectiveConfig("display") as
      | Protobuf.Config.Config_DisplayConfig
      | undefined) ?? create(Protobuf.Config.Config_DisplayConfigSchema);
  editor.setRadioSection("display", {
    ...currentDisplay,
    headingBold: true,
    units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
    use12hClock: true,
  });

  const currentPower =
    (device.getEffectiveConfig("power") as
      | Protobuf.Config.Config_PowerConfig
      | undefined) ?? create(Protobuf.Config.Config_PowerConfigSchema);
  editor.setRadioSection("power", {
    ...currentPower,
    isPowerSaving: true,
  });

  const currentLora =
    (device.getEffectiveConfig("lora") as
      | Protobuf.Config.Config_LoRaConfig
      | undefined) ??
    device.config.lora ??
    create(Protobuf.Config.Config_LoRaConfigSchema);
  editor.setRadioSection("lora", {
    ...currentLora,
    ...importedLora,
    region: Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET,
  });

  applyOwner(editor, myNode, "Paper", "WP");
  editor.setCannedMessageModuleMessages(HP_CANNED_MESSAGES);
}

function applyHp2Preset({ editor, device, myNode }: PresetContext): void {
  const currentDevice =
    (device.getEffectiveConfig("device") as
      | Protobuf.Config.Config_DeviceConfig
      | undefined) ?? create(Protobuf.Config.Config_DeviceConfigSchema);
  editor.setRadioSection("device", {
    ...currentDevice,
    tzdef: "EST5EDT,M3.2.0,M11.1.0",
  });

  const currentDisplay =
    (device.getEffectiveConfig("display") as
      | Protobuf.Config.Config_DisplayConfig
      | undefined) ?? create(Protobuf.Config.Config_DisplayConfigSchema);
  editor.setRadioSection("display", {
    ...currentDisplay,
    units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
    use12hClock: true,
  });

  const currentBluetooth =
    (device.getEffectiveConfig("bluetooth") as
      | Protobuf.Config.Config_BluetoothConfig
      | undefined) ?? create(Protobuf.Config.Config_BluetoothConfigSchema);
  editor.setRadioSection("bluetooth", {
    ...currentBluetooth,
    mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
  });

  const importedLora = importChannelUrl(editor, HP2_CHANNEL_URL);
  const currentLora =
    (device.getEffectiveConfig("lora") as
      | Protobuf.Config.Config_LoRaConfig
      | undefined) ??
    device.config.lora ??
    create(Protobuf.Config.Config_LoRaConfigSchema);
  editor.setRadioSection("lora", {
    ...currentLora,
    ...importedLora,
    region: Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET,
  });

  const currentExternalNotification =
    (device.getEffectiveModuleConfig("externalNotification") as
      | Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig
      | undefined) ??
    create(Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfigSchema);
  editor.setModuleSection("externalNotification", {
    ...currentExternalNotification,
    nagTimeout: 0,
  });

  applyOwner(editor, myNode, "HP2", "HP2");
  editor.setCannedMessageModuleMessages(HP2_CANNED_MESSAGES);
  editor.setRingtoneMessage(HP2_RINGTONE);
}

function applyOwner(
  editor: ConfigEditor,
  myNode: Protobuf.Mesh.NodeInfo | undefined,
  longPrefix: string,
  shortPrefix: string,
): void {
  const owner = create(Protobuf.Mesh.UserSchema, {
    ...(myNode?.user ??
      create(Protobuf.Mesh.UserSchema, {
        id: "",
        longName: "",
        shortName: "",
        isLicensed: false,
      })),
  });
  const suffix = deriveNodeSuffix(owner.id);
  editor.setOwner(
    create(Protobuf.Mesh.UserSchema, {
      ...owner,
      longName: suffix ? `${longPrefix} ${suffix}` : longPrefix,
      shortName: suffix ? `${shortPrefix}${suffix.slice(-2)}` : shortPrefix,
    }),
  );
}

function deriveNodeSuffix(nodeId: string): string {
  const matched = /!\w{4}(\w{4})/i.exec(nodeId);
  if (matched?.[1]) {
    return matched[1].toUpperCase();
  }

  const normalized = nodeId.replace(/[^\da-f]/gi, "").toUpperCase();
  return normalized.slice(-4);
}

function importChannelUrl(
  editor: ConfigEditor,
  channelUrl: string,
  options?: {
    positionPrecisionOverride?: number;
  },
): Protobuf.Config.Config_LoRaConfig | undefined {
  const channelSet = parseChannelUrl(channelUrl);

  channelSet.settings.forEach((settings, index) => {
    const normalizedSettings =
      options?.positionPrecisionOverride === undefined
        ? settings
        : create(Protobuf.Channel.ChannelSettingsSchema, {
            ...settings,
            moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
              ...settings.moduleSettings,
              positionPrecision: options.positionPrecisionOverride,
            }),
          });

    editor.setChannel(
      create(Protobuf.Channel.ChannelSchema, {
        index,
        role:
          index === 0
            ? Protobuf.Channel.Channel_Role.PRIMARY
            : Protobuf.Channel.Channel_Role.SECONDARY,
        settings: normalizedSettings,
      }),
    );
  });

  return channelSet.loraConfig;
}

function parseChannelUrl(channelUrl: string): Protobuf.AppOnly.ChannelSet {
  const channelsUrl = new URL(channelUrl);
  if (
    channelsUrl.hostname !== "meshtastic.org" ||
    channelsUrl.pathname !== "/e/"
  ) {
    throw new Error("Preset channel URL must point to meshtastic.org/e/.");
  }
  if (!channelsUrl.hash) {
    throw new Error(
      "Preset channel URL is missing its encoded channel payload.",
    );
  }

  const encoded = channelsUrl.hash.substring(1);
  const padded = encoded
    .padEnd(encoded.length + ((4 - (encoded.length % 4)) % 4), "=")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return fromBinary(Protobuf.AppOnly.ChannelSetSchema, toByteArray(padded));
}
