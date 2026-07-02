import type { Protobuf } from "@meshtastic/sdk";

type ValidConfigType = Exclude<
  keyof Protobuf.LocalOnly.LocalConfig,
  "version" | "$typeName"
>;
type ValidModuleConfigType = Exclude<
  keyof Protobuf.LocalOnly.LocalModuleConfig,
  "version" | "$typeName"
>;

interface Dialogs {
  import: boolean;
  QR: boolean;
  shutdown: boolean;
  reboot: boolean;
  deviceName: boolean;
  nodeRemoval: boolean;
  pkiBackup: boolean;
  nodeDetails: boolean;
  unsafeRoles: boolean;
  refreshKeys: boolean;
  deleteMessages: boolean;
  managedMode: boolean;
  clientNotification: boolean;
  resetNodeDb: boolean;
  clearAllStores: boolean;
  factoryResetDevice: boolean;
  factoryResetConfig: boolean;
}

type DialogVariant = keyof Dialogs;

type Page = "messages" | "map" | "settings" | "channels" | "nodes";

export type ConnectionId = number;
export type ConnectionType = "serial";
export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "disconnecting"
  | "configuring"
  | "configured"
  | "online"
  | "error";

export type Connection = {
  id: ConnectionId;
  type: ConnectionType;
  name: string;
  createdAt: number;
  lastConnectedAt?: number;
  isDefault?: boolean;
  status: ConnectionStatus;
  error?: string;
  meshDeviceId?: number;
} & NewConnection;

export type NewConnection =
  | {
      type: "serial";
      name: string;
      usbVendorId?: number;
      usbProductId?: number;
    };

type WaypointWithMetadata = Protobuf.Mesh.Waypoint & {
  metadata: {
    channel: number; // Channel on which the waypoint was received
    created: Date; // Timestamp when the waypoint was received
    updated?: Date; // Timestamp when the waypoint was last updated
    from: number; // Node number of the device that sent the waypoint
  };
};

type SerialLogEntry = {
  id: string;
  timestamp: Date;
  source: "serial" | "logRecord";
  text: string;
  level?: Protobuf.Mesh.LogRecord_Level;
  origin?: string;
  from?: number;
  channel?: number;
};

export type {
  Page,
  Dialogs,
  DialogVariant,
  ValidConfigType,
  ValidModuleConfigType,
  WaypointWithMetadata,
  SerialLogEntry,
};
