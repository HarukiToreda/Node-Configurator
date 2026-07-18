import { fromBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { buildAndroidPresetDownload } from "./presets";

describe("buildAndroidPresetDownload", () => {
  it("exports the NRF-TXT Android profile in DeviceProfile format", () => {
    const download = buildAndroidPresetDownload("nrf-txt");
    const profile = fromBinary(
      Protobuf.ClientOnly.DeviceProfileSchema,
      download.bytes,
    );

    expect(download.fileName).toBe("nrf-txt_nodeConfig.cfg");
    expect(download.name).toBe("NRF-TXT");
    expect(download.mimeType).toBe("application/octet-stream");
    expect(profile.longName).toBe("NRF-TXT");
    expect(profile.shortName).toBe("NRTX");
    expect(profile.ringtone).toBe("Bubble:d=16,o=5,b=140:a6,b6,d7");
    expect(profile.cannedMessages).toContain("Hello");
    expect(profile.config?.device?.buzzerGpio).toBe(33);
    expect(profile.config?.lora?.region).toBe(
      Protobuf.Config.Config_LoRaConfig_RegionCode.US,
    );
    expect(profile.config?.bluetooth?.mode).toBe(
      Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
    );
    expect(profile.config?.bluetooth?.enabled).toBe(true);
    expect(profile.config?.display?.useLongNodeName).toBe(true);
    expect(profile.config?.display?.enableMessageBubbles).toBe(true);
    expect(profile.moduleConfig?.externalNotification?.outputBuzzer).toBe(33);
    expect(profile.moduleConfig?.telemetry?.deviceTelemetryEnabled).toBe(true);
  });

  it("exports the Hel-TXT Android profile in DeviceProfile format", () => {
    const download = buildAndroidPresetDownload("hel-txt");
    const profile = fromBinary(
      Protobuf.ClientOnly.DeviceProfileSchema,
      download.bytes,
    );

    expect(download.fileName).toBe("hel-txt_nodeConfig.cfg");
    expect(download.name).toBe("Hel-TXT");
    expect(profile.longName).toBe("Hel-TXT");
    expect(profile.shortName).toBe("HT");
    expect(profile.config?.device?.buzzerGpio).toBe(6);
    expect(profile.config?.bluetooth?.enabled).toBe(true);
    expect(profile.config?.position?.gpsEnGpio).toBe(3);
    expect(profile.moduleConfig?.externalNotification?.outputBuzzer).toBe(6);
    expect(profile.ringtone).toBe("Bubble:d=16,o=5,b=140:a6,b6,d7");
  });

  it("exports the HP Android profile in DeviceProfile format", () => {
    const download = buildAndroidPresetDownload("hp");
    const profile = fromBinary(
      Protobuf.ClientOnly.DeviceProfileSchema,
      download.bytes,
    );

    expect(download.fileName).toBe("hp_nodeConfig.cfg");
    expect(download.name).toBe("HP");
    expect(profile.longName).toBe("Paper");
    expect(profile.shortName).toBe("WP");
    expect(profile.config?.device?.tzdef).toBe("EST5EDT,M3.2.0,M11.1.0");
    expect(profile.config?.bluetooth?.enabled).toBe(true);
    expect(profile.config?.display?.use12hClock).toBe(true);
    expect(profile.config?.power?.isPowerSaving).toBe(true);
    expect(profile.cannedMessages).toContain("Hello");
  });

  it("exports the HP2 Android profile in DeviceProfile format", () => {
    const download = buildAndroidPresetDownload("hp2");
    const profile = fromBinary(
      Protobuf.ClientOnly.DeviceProfileSchema,
      download.bytes,
    );

    expect(download.fileName).toBe("hp2_nodeConfig.cfg");
    expect(download.name).toBe("HP2");
    expect(profile.longName).toBe("HP2");
    expect(profile.shortName).toBe("HP2");
    expect(profile.config?.device?.tzdef).toBe("EST5EDT,M3.2.0,M11.1.0");
    expect(profile.config?.display?.use12hClock).toBe(true);
    expect(profile.config?.display?.units).toBe(
      Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL,
    );
    expect(profile.config?.bluetooth?.mode).toBe(
      Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
    );
    expect(profile.config?.lora?.region).toBe(
      Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET,
    );
    expect(profile.moduleConfig?.externalNotification?.nagTimeout).toBe(0);
    expect(profile.ringtone).toBe("Bubble:d=16,o=5,b=140:a6,b6,d7");
    expect(profile.cannedMessages).toContain("Hello");
  });
});
