import type {
  Connection,
  ConnectionStatus,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import { randId } from "@app/core/utils/randId";
import { Cable, type LucideIcon } from "lucide-react";

export function createConnectionFromInput(input: NewConnection): Connection {
  return {
    id: randId(),
    name: input.name,
    createdAt: Date.now(),
    status: "disconnected" as ConnectionStatus,
    type: "serial",
    usbVendorId: input.usbVendorId,
    usbProductId: input.usbProductId,
  };
}

export function connectionTypeIcon(): LucideIcon {
  return Cable;
}

export function formatConnectionSubtext(conn: Connection): string {
  const v = conn.usbVendorId ? conn.usbVendorId.toString(16) : "?";
  const p = conn.usbProductId ? conn.usbProductId.toString(16) : "?";
  return `USB ${v}:${p}`;
}
