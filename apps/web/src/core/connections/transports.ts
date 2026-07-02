import type { Connection } from "@core/stores/deviceStore/types";
import { createLogger } from "@meshtastic/sdk";
import {
  SerialConnectError,
  TransportWebSerial,
} from "@meshtastic/transport-web-serial";
import { Result } from "better-result";
import type { AnyTransport } from "./sdkClient.ts";

const log = createLogger("transports");

export interface OpenTransportOptions {
  allowPrompt?: boolean;
  cachedSerialPort?: SerialPort;
}

export interface OpenTransportResult {
  transport: AnyTransport;
  serialPort?: SerialPort;
}

export async function openTransport(
  conn: Connection,
  opts: OpenTransportOptions = {},
): Promise<OpenTransportResult> {
  return openSerial(conn, opts);
}

export { SerialConnectError };

async function openSerial(
  conn: Connection & {
    type: "serial";
    usbVendorId?: number;
    usbProductId?: number;
  },
  opts: OpenTransportOptions,
): Promise<OpenTransportResult> {
  log.debug("openSerial: enter", {
    hasCached: !!opts.cachedSerialPort,
    allowPrompt: !!opts.allowPrompt,
    vid: conn.usbVendorId,
    pid: conn.usbProductId,
  });

  if (!("serial" in navigator)) {
    throw new Error("Web Serial not supported");
  }

  const serial = (
    navigator as Navigator & {
      serial: {
        getPorts: () => Promise<SerialPort[]>;
        requestPort: (options: Record<string, unknown>) => Promise<SerialPort>;
      };
    }
  ).serial;

  let port = opts.cachedSerialPort;
  if (!port) {
    const ports = await serial.getPorts();
    log.debug("openSerial: getPorts", { count: ports.length });
    if (ports && conn.usbVendorId && conn.usbProductId) {
      port = ports.find((entry: SerialPort) => {
        const info =
          (
            entry as SerialPort & {
              getInfo?: () => { usbVendorId?: number; usbProductId?: number };
            }
          ).getInfo?.() ?? {};
        return (
          info.usbVendorId === conn.usbVendorId &&
          info.usbProductId === conn.usbProductId
        );
      });
    }
  }

  if (!port && opts.allowPrompt) {
    log.debug("openSerial: requesting port via picker");
    port = await serial.requestPort({});
  }

  if (!port) {
    log.warn("openSerial: no port resolved");
    throw new Error("Serial port not available. Re-select the port.");
  }

  log.debug("openSerial: resolved port", {
    readable: !!port.readable,
    writable: !!port.writable,
  });

  const result = await TransportWebSerial.createFromPort(port);
  if (Result.isError(result)) {
    log.error("openSerial: createFromPort returned Err", {
      kind: result.error.kind,
      userMessage: result.error.userMessage,
    });
    throw result.error;
  }

  log.info("openSerial: transport ready");
  return { transport: result.value, serialPort: port };
}

export async function probeConnection(
  conn: Connection,
): Promise<"online" | "configured" | "disconnected" | "error"> {
  if (!("serial" in navigator)) {
    return "disconnected";
  }

  try {
    const ports: SerialPort[] = await (
      navigator as Navigator & {
        serial: { getPorts: () => Promise<SerialPort[]> };
      }
    ).serial.getPorts();

    const hasPermission = ports.some((entry: SerialPort) => {
      const info =
        (
          entry as SerialPort & {
            getInfo?: () => { usbVendorId?: number; usbProductId?: number };
          }
        ).getInfo?.() ?? {};
      return (
        info.usbVendorId === conn.usbVendorId &&
        info.usbProductId === conn.usbProductId
      );
    });

    return hasPermission ? "online" : "disconnected";
  } catch {
    return "disconnected";
  }
}

export function closeTransport(handle: SerialPort | undefined): void {
  if (!handle) {
    return;
  }

  const port = handle as SerialPort & { close?: () => Promise<void> };
  if (port.close) {
    try {
      port.close();
    } catch {}
  }
}
