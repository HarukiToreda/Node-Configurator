const presets = [
  {
    id: "nrf-txt",
    name: "NRF-TXT",
    description:
      "A reusable NRF-TXT baseline preset. Load it, change any setting directly, then export the exact Meshtastic CLI script you want to run.",
    values: {
      owner_prefix: "NRF-TXT",
      short_prefix: "NT",
      device_buzzer_gpio: "33",
      device_tzdef: "EST5EDT,M3.2.0,M11.1.0",
      display_screen_on_secs: "60",
      display_heading_bold: true,
      display_units: "IMPERIAL",
      display_use_12h_clock: true,
      bluetooth_mode: "FIXED_PIN",
      canned_message: "Test|👍|👎|😀|Hello|Heard|Enabling GPS|share Location|Come to me|Going to you|Help|SOS",
      ringtone: "Bubble:d=16,o=5,b=140:a6,b6,d7",
      position_gps_mode: "DISABLED",
      external_notification_enabled: true,
      external_notification_active: true,
      external_notification_alert_bell: true,
      external_notification_alert_bell_buzzer: true,
      external_notification_alert_message: true,
      external_notification_alert_message_buzzer: true,
      external_notification_output: "35",
      external_notification_output_buzzer: "33",
      external_notification_use_pwm: true,
      seturl: "https://meshtastic.org/e/#CgcSAQE6AgggEhYIARj6ASALKAU4AUADSAFQG2gBwAYB",
      lora_region: "UNSET",
      telemetry_device_update_interval: "300",
      telemetry_environment_update_interval: "300",
      telemetry_environment_measurement_enabled: true,
      telemetry_environment_screen_enabled: true,
      telemetry_environment_display_fahrenheit: true,
      telemetry_air_quality_enabled: true,
      telemetry_air_quality_interval: "300",
      telemetry_device_telemetry_enabled: true,
    },
  },
];

const fieldGroups = [
  {
    title: "Identity",
    fields: [
      {
        id: "owner_prefix",
        label: "Owner Prefix",
        help: "Used with the parsed node id when generating --set-owner.",
        type: "text",
      },
      {
        id: "short_prefix",
        label: "Short Owner Prefix",
        help: "Prepended to the last two characters of the parsed id.",
        type: "text",
        maxLength: 3,
      },
    ],
  },
  {
    title: "Device",
    fields: [
      {
        id: "device_buzzer_gpio",
        label: "Buzzer GPIO",
        help: "device.buzzer_gpio",
        type: "number",
        command: { type: "set", key: "device.buzzer_gpio" },
      },
      {
        id: "device_tzdef",
        label: "Timezone Definition",
        help: "device.tzdef",
        type: "text",
        command: { type: "set", key: "device.tzdef", quote: true },
      },
    ],
  },
  {
    title: "Display",
    fields: [
      {
        id: "display_screen_on_secs",
        label: "Screen On Seconds",
        help: "display.screen_on_secs",
        type: "number",
        command: { type: "set", key: "display.screen_on_secs" },
      },
      {
        id: "display_heading_bold",
        label: "Bold Heading",
        help: "display.heading_bold",
        type: "checkbox",
        command: { type: "set", key: "display.heading_bold" },
      },
      {
        id: "display_units",
        label: "Units",
        help: "display.units",
        type: "select",
        options: ["METRIC", "IMPERIAL"],
        command: { type: "set", key: "display.units" },
      },
      {
        id: "display_use_12h_clock",
        label: "Use 12 Hour Clock",
        help: "display.use_12h_clock",
        type: "checkbox",
        command: { type: "set", key: "display.use_12h_clock" },
      },
    ],
  },
  {
    title: "Bluetooth",
    fields: [
      {
        id: "bluetooth_mode",
        label: "Bluetooth Mode",
        help: "bluetooth.mode",
        type: "text",
        command: { type: "set", key: "bluetooth.mode" },
      },
    ],
  },
  {
    title: "Messaging",
    fields: [
      {
        id: "canned_message",
        label: "Canned Messages",
        help: "meshtastic --set-canned-message",
        type: "textarea",
        command: { type: "setCannedMessage" },
      },
      {
        id: "ringtone",
        label: "Ringtone",
        help: "meshtastic --set-ringtone",
        type: "text",
        command: { type: "setRingtone" },
      },
    ],
  },
  {
    title: "Position",
    fields: [
      {
        id: "position_gps_mode",
        label: "GPS Mode",
        help: "position.gps_mode",
        type: "text",
        command: { type: "set", key: "position.gps_mode" },
      },
    ],
  },
  {
    title: "External Notification",
    fields: [
      {
        id: "external_notification_enabled",
        label: "Enabled",
        help: "external_notification.enabled",
        type: "checkbox",
        command: { type: "set", key: "external_notification.enabled" },
      },
      {
        id: "external_notification_active",
        label: "Active",
        help: "external_notification.active",
        type: "checkbox",
        command: { type: "set", key: "external_notification.active" },
      },
      {
        id: "external_notification_alert_bell",
        label: "Alert Bell",
        help: "external_notification.alert_bell",
        type: "checkbox",
        command: { type: "set", key: "external_notification.alert_bell" },
      },
      {
        id: "external_notification_alert_bell_buzzer",
        label: "Alert Bell Buzzer",
        help: "external_notification.alert_bell_buzzer",
        type: "checkbox",
        command: { type: "set", key: "external_notification.alert_bell_buzzer" },
      },
      {
        id: "external_notification_alert_message",
        label: "Alert Message",
        help: "external_notification.alert_message",
        type: "checkbox",
        command: { type: "set", key: "external_notification.alert_message" },
      },
      {
        id: "external_notification_alert_message_buzzer",
        label: "Alert Message Buzzer",
        help: "external_notification.alert_message_buzzer",
        type: "checkbox",
        command: { type: "set", key: "external_notification.alert_message_buzzer" },
      },
      {
        id: "external_notification_output",
        label: "Output GPIO",
        help: "external_notification.output",
        type: "number",
        command: { type: "set", key: "external_notification.output" },
      },
      {
        id: "external_notification_output_buzzer",
        label: "Output Buzzer GPIO",
        help: "external_notification.output_buzzer",
        type: "number",
        command: { type: "set", key: "external_notification.output_buzzer" },
      },
      {
        id: "external_notification_use_pwm",
        label: "Use PWM",
        help: "external_notification.use_pwm",
        type: "checkbox",
        command: { type: "set", key: "external_notification.use_pwm" },
      },
    ],
  },
  {
    title: "Channel",
    fields: [
      {
        id: "seturl",
        label: "Channel URL",
        help: "meshtastic --seturl",
        type: "textarea",
        command: { type: "setUrl" },
      },
      {
        id: "lora_region",
        label: "LoRa Region",
        help: "lora.region",
        type: "text",
        list: "region-options",
        command: { type: "set", key: "lora.region" },
      },
    ],
  },
  {
    title: "Telemetry",
    fields: [
      {
        id: "telemetry_device_update_interval",
        label: "Device Update Interval",
        help: "telemetry.device_update_interval",
        type: "number",
        command: { type: "set", key: "telemetry.device_update_interval" },
      },
      {
        id: "telemetry_environment_update_interval",
        label: "Environment Update Interval",
        help: "telemetry.environment_update_interval",
        type: "number",
        command: { type: "set", key: "telemetry.environment_update_interval" },
      },
      {
        id: "telemetry_environment_measurement_enabled",
        label: "Environment Measurement Enabled",
        help: "telemetry.environment_measurement_enabled",
        type: "checkbox",
        command: { type: "set", key: "telemetry.environment_measurement_enabled" },
      },
      {
        id: "telemetry_environment_screen_enabled",
        label: "Environment Screen Enabled",
        help: "telemetry.environment_screen_enabled",
        type: "checkbox",
        command: { type: "set", key: "telemetry.environment_screen_enabled" },
      },
      {
        id: "telemetry_environment_display_fahrenheit",
        label: "Display Fahrenheit",
        help: "telemetry.environment_display_fahrenheit",
        type: "checkbox",
        command: { type: "set", key: "telemetry.environment_display_fahrenheit" },
      },
      {
        id: "telemetry_air_quality_enabled",
        label: "Air Quality Enabled",
        help: "telemetry.air_quality_enabled",
        type: "checkbox",
        command: { type: "set", key: "telemetry.air_quality_enabled" },
      },
      {
        id: "telemetry_air_quality_interval",
        label: "Air Quality Interval",
        help: "telemetry.air_quality_interval",
        type: "number",
        command: { type: "set", key: "telemetry.air_quality_interval" },
      },
      {
        id: "telemetry_device_telemetry_enabled",
        label: "Device Telemetry Enabled",
        help: "telemetry.device_telemetry_enabled",
        type: "checkbox",
        command: { type: "set", key: "telemetry.device_telemetry_enabled" },
      },
    ],
  },
];

const regionOptions = [
  "UNSET",
  "US",
  "EU_868",
  "EU_433",
  "AU_915",
  "NZ_865",
  "JP",
  "KR",
  "TW",
  "RU",
  "IN",
  "TH",
  "UA_433",
  "UA_868",
  "CN",
  "LORA_24",
];

const elements = {
  presetSelect: document.querySelector("#preset-select"),
  presetCount: document.querySelector("#preset-count"),
  description: document.querySelector("#preset-description"),
  scriptOutput: document.querySelector("#script-output"),
  settingsGroups: document.querySelector("#settings-groups"),
  groupTemplate: document.querySelector("#settings-group-template"),
  fieldTemplate: document.querySelector("#setting-field-template"),
  regionOptions: document.querySelector("#region-options"),
  copyButton: document.querySelector("#copy-script-button"),
  downloadButton: document.querySelector("#download-script-button"),
  resetButton: document.querySelector("#reset-preset-button"),
};

const state = {
  activePresetId: presets[0].id,
  values: structuredClone(presets[0].values),
};

function populatePresetOptions() {
  presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    elements.presetSelect.append(option);
  });

  elements.presetCount.textContent = `${presets.length} preset${presets.length === 1 ? "" : "s"}`;
}

function populateRegions() {
  regionOptions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    elements.regionOptions.append(option);
  });
}

function getActivePreset() {
  return presets.find((preset) => preset.id === state.activePresetId);
}

function quotePowerShell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function normalizeValue(field, rawValue) {
  if (field.type === "checkbox") {
    return Boolean(rawValue);
  }

  return String(rawValue ?? "").trim();
}

function formatCommandValue(value, shouldQuote) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return shouldQuote ? quotePowerShell(value) : value;
}

function createInput(field) {
  if (field.type === "textarea") {
    const textarea = document.createElement("textarea");
    textarea.rows = field.id === "seturl" ? 3 : 4;
    return textarea;
  }

  if (field.type === "select") {
    const select = document.createElement("select");
    field.options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      select.append(option);
    });
    return select;
  }

  if (field.type === "checkbox") {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checkbox-input";
    return checkbox;
  }

  const input = document.createElement("input");
  input.type = field.type;
  if (field.list) {
    input.setAttribute("list", field.list);
  }
  if (field.maxLength) {
    input.maxLength = field.maxLength;
  }
  return input;
}

function updateValue(fieldId, value) {
  state.values[fieldId] = value;
  renderScript();
}

function renderField(field, list) {
  const fragment = elements.fieldTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".setting-row");
  const label = fragment.querySelector(".setting-label");
  const key = fragment.querySelector(".setting-key");
  const inputWrap = fragment.querySelector(".setting-input-wrap");
  const input = createInput(field);

  label.textContent = field.label;
  key.textContent = field.help;
  input.dataset.fieldId = field.id;

  if (field.type === "checkbox") {
    input.checked = Boolean(state.values[field.id]);
    input.addEventListener("change", () => updateValue(field.id, input.checked));
    row.classList.add("checkbox-row");
    inputWrap.classList.add("checkbox-wrap");
  } else {
    input.value = state.values[field.id] ?? "";
    input.addEventListener("input", () => updateValue(field.id, normalizeValue(field, input.value)));
  }

  inputWrap.append(input);
  list.append(fragment);
}

function renderSettingsEditor() {
  elements.settingsGroups.innerHTML = "";

  fieldGroups.forEach((group) => {
    const fragment = elements.groupTemplate.content.cloneNode(true);
    const title = fragment.querySelector("h3");
    const list = fragment.querySelector("ul");
    title.textContent = group.title;

    group.fields.forEach((field) => renderField(field, list));
    elements.settingsGroups.append(fragment);
  });
}

function buildCommands() {
  const commands = [];

  fieldGroups.forEach((group) => {
    group.fields.forEach((field) => {
      if (!field.command) {
        return;
      }

      const value = state.values[field.id];
      if (field.command.type === "set") {
        commands.push(`meshtastic --set ${field.command.key} ${formatCommandValue(value, field.command.quote)}`);
        return;
      }

      if (field.command.type === "setCannedMessage") {
        commands.push(`meshtastic --set-canned-message ${quotePowerShell(value)}`);
        return;
      }

      if (field.command.type === "setRingtone") {
        commands.push(`meshtastic --set-ringtone ${quotePowerShell(value)}`);
        return;
      }

      if (field.command.type === "setUrl") {
        commands.push(`meshtastic --seturl ${quotePowerShell(value)}`);
      }
    });
  });

  return commands;
}

function buildCommandsUntil(stopKey) {
  const commands = [];
  let reachedStop = false;

  fieldGroups.forEach((group) => {
    group.fields.forEach((field) => {
      if (!field.command || reachedStop) {
        return;
      }

      const value = state.values[field.id];
      if (field.command.type === "set") {
        commands.push(`meshtastic --set ${field.command.key} ${formatCommandValue(value, field.command.quote)}`);
      } else if (field.command.type === "setCannedMessage") {
        commands.push(`meshtastic --set-canned-message ${quotePowerShell(value)}`);
      } else if (field.command.type === "setRingtone") {
        commands.push(`meshtastic --set-ringtone ${quotePowerShell(value)}`);
      } else if (field.command.type === "setUrl") {
        commands.push(`meshtastic --seturl ${quotePowerShell(value)}`);
      }

      if (field.command.key === stopKey) {
        reachedStop = true;
      }
    });
  });

  return commands;
}

function buildCommandsAfter(stopKey) {
  const allCommands = buildCommands();
  const stopIndex = allCommands.findIndex((command) => command.includes(`--set ${stopKey} `));
  return stopIndex === -1 ? allCommands : allCommands.slice(stopIndex + 1);
}

function buildOwnerBlock() {
  return [
    "$info = meshtastic --info | Out-String",
    "if ($info -notmatch '!\\w{4}(\\w{4})') {",
    "  throw 'Unable to parse node id from meshtastic --info output.'",
    "}",
    "$id = $Matches[1]",
    "$suffixLength = [Math]::Min(2, $id.Length)",
    `$short = ${quotePowerShell(state.values.short_prefix)} + $id.Substring($id.Length - $suffixLength)`,
    `meshtastic --wait-to-disconnect 2 --set-owner (${quotePowerShell(state.values.owner_prefix)} + ' ' + $id)`,
    "meshtastic --set-owner-short $short",
  ].join("\n");
}

function renderScript() {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "",
    "if (-not (Get-Command meshtastic -ErrorAction SilentlyContinue)) {",
    "  throw 'meshtastic CLI not found in PATH.'",
    "}",
    "",
    ...buildCommandsUntil("external_notification.use_pwm"),
    buildOwnerBlock(),
    ...buildCommandsAfter("external_notification.use_pwm"),
    "",
    `Write-Host ${quotePowerShell(`${getActivePreset().name} preset applied.`)}`,
  ].join("\n");

  elements.scriptOutput.textContent = script;
}

function loadPreset(presetId) {
  const preset = presets.find((item) => item.id === presetId);
  state.activePresetId = preset.id;
  state.values = structuredClone(preset.values);
  elements.presetSelect.value = preset.id;
  elements.description.textContent = preset.description;
  renderSettingsEditor();
  renderScript();
}

async function copyScript() {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(elements.scriptOutput.textContent);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = elements.scriptOutput.textContent;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Copy command failed");
  }
}

function buildScriptBlob() {
  const utf8Bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  return new Blob([utf8Bom, elements.scriptOutput.textContent], { type: "text/plain;charset=utf-8" });
}

function signalCopyState(label) {
  const previousText = elements.copyButton.textContent;
  elements.copyButton.textContent = label;
  window.setTimeout(() => {
    elements.copyButton.textContent = previousText;
  }, 1400);
}

function downloadScript() {
  const preset = getActivePreset();
  const blob = buildScriptBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${preset.id}.ps1`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function registerEvents() {
  elements.presetSelect.addEventListener("change", (event) => {
    loadPreset(event.target.value);
  });

  elements.resetButton.addEventListener("click", () => {
    loadPreset(state.activePresetId);
  });

  elements.copyButton.addEventListener("click", async () => {
    try {
      await copyScript();
      signalCopyState("Copied");
    } catch {
      signalCopyState("Copy failed");
    }
  });

  elements.downloadButton.addEventListener("click", downloadScript);
}

populatePresetOptions();
populateRegions();
registerEvents();
loadPreset(state.activePresetId);
