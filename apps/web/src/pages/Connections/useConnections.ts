import {
  startConfigHeartbeat,
  startMaintenanceHeartbeat,
  stopHeartbeat,
} from "@app/core/connections/heartbeat.ts";
import { buildMeshDevice } from "@app/core/connections/sdkClient.ts";
import {
  closeTransport,
  openTransport,
  probeConnection,
} from "@app/core/connections/transports.ts";
import type {
  Connection,
  ConnectionId,
  ConnectionStatus,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import { createConnectionFromInput } from "@app/pages/Connections/utils";
import { meshRegistry } from "@core/meshRegistry.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { createLogger, DeviceStatusEnum } from "@meshtastic/sdk";
import { useCallback, useRef } from "react";

const log = createLogger("useConnections");

const cachedTransports = new Map<ConnectionId, SerialPort>();
const configSubscriptions = new Map<ConnectionId, () => void>();

// Auto-reconnect bookkeeping. Meshtastic devices reboot after certain config
// commits (LoRa/device/bluetooth/etc.), which drops the USB serial
// connection. Without this, the UI is left stale until the user manually
// reconnects. `manualDisconnects` suppresses auto-reconnect for
// user-initiated disconnects/removals.
const manualDisconnects = new Set<ConnectionId>();
const reconnectTimers = new Map<ConnectionId, ReturnType<typeof setTimeout>>();
const reconnectAttempts = new Map<ConnectionId, number>();
const RECONNECT_DELAYS_MS = [2_000, 3_000, 5_000, 8_000, 8_000, 8_000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS_MS.length;

function clearReconnect(id: ConnectionId): void {
  const timer = reconnectTimers.get(id);
  if (timer) {
    clearTimeout(timer);
  }
  reconnectTimers.delete(id);
  reconnectAttempts.delete(id);
}

export function useConnections() {
  const connections = useDeviceStore((s) => s.savedConnections);
  const addSavedConnection = useDeviceStore((s) => s.addSavedConnection);
  const updateSavedConnection = useDeviceStore((s) => s.updateSavedConnection);
  const removeSavedConnectionFromStore = useDeviceStore(
    (s) => s.removeSavedConnection,
  );
  const setActiveConnectionId = useDeviceStore((s) => s.setActiveConnectionId);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);

  // `connect` and `setupMeshDevice` are mutually recursive (connect calls
  // setupMeshDevice; setupMeshDevice schedules a reconnect that needs to call
  // connect again after a device-initiated disconnect/reboot). A ref avoids
  // a useCallback dependency cycle.
  const connectRef =
    useRef<
      (
        id: ConnectionId,
        opts?: { allowPrompt?: boolean; isAutoReconnect?: boolean },
      ) => Promise<boolean>
    >(null);

  const scheduleReconnect = useCallback((id: ConnectionId) => {
    if (manualDisconnects.has(id)) {
      log.debug("scheduleReconnect: skipped, manual disconnect", { id });
      return;
    }
    if (reconnectTimers.has(id)) {
      log.debug("scheduleReconnect: already scheduled", { id });
      return;
    }

    const attempt = reconnectAttempts.get(id) ?? 0;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      log.warn("scheduleReconnect: giving up after max attempts", { id });
      clearReconnect(id);
      return;
    }

    const delay =
      RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    log.info("scheduleReconnect: scheduling reconnect attempt", {
      id,
      attempt,
      delay,
    });

    const timer = setTimeout(() => {
      reconnectTimers.delete(id);
      if (manualDisconnects.has(id)) {
        return;
      }
      reconnectAttempts.set(id, attempt + 1);

      // The device rebooted and re-enumerated on USB; the previously granted
      // SerialPort object may no longer be usable, so drop it and let
      // openTransport re-resolve the port by vendor/product id.
      cachedTransports.delete(id);
      configSubscriptions.get(id)?.();
      configSubscriptions.delete(id);
      stopHeartbeat(id);

      void connectRef.current?.(id, { isAutoReconnect: true }).then((ok) => {
        if (ok) {
          clearReconnect(id);
        } else {
          scheduleReconnect(id);
        }
      });
    }, delay);
    reconnectTimers.set(id, timer);
  }, []);

  const updateStatus = useCallback(
    (id: ConnectionId, status: ConnectionStatus, error?: string) => {
      updateSavedConnection(id, {
        status,
        error: error || undefined,
        ...(status === "disconnected" ? { lastConnectedAt: Date.now() } : {}),
      });
    },
    [updateSavedConnection],
  );

  const teardown = useCallback(async (id: ConnectionId, conn?: Connection) => {
    log.debug("teardown: enter", { id });
    manualDisconnects.add(id);
    clearReconnect(id);
    stopHeartbeat(id);
    configSubscriptions.get(id)?.();
    configSubscriptions.delete(id);

    if (conn?.meshDeviceId) {
      const device = useDeviceStore.getState().getDevice(conn.meshDeviceId);
      try {
        await device?.connection?.disconnect();
        log.debug("teardown: transport disconnect awaited");
      } catch (error) {
        const err = error as Error;
        log.warn("teardown: transport disconnect threw", {
          name: err?.name,
          message: err?.message,
        });
      }
    }

    closeTransport(cachedTransports.get(id));
    cachedTransports.delete(id);
    log.debug("teardown: done", { id });
  }, []);

  const removeConnection = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((entry) => entry.id === id);
      await teardown(id, conn);
      if (conn?.meshDeviceId) {
        try {
          useDeviceStore.getState().removeDevice(conn.meshDeviceId);
        } catch {}
      }
      meshRegistry.unregister(id);
      removeSavedConnectionFromStore(id);
      manualDisconnects.delete(id);
    },
    [connections, removeSavedConnectionFromStore, teardown],
  );

  const setupMeshDevice = useCallback(
    async (
      id: ConnectionId,
      transport: Awaited<ReturnType<typeof openTransport>>["transport"],
      serialPort?: SerialPort,
    ): Promise<number> => {
      const conn = connections.find((entry) => entry.id === id);
      let deviceId = conn?.meshDeviceId;
      if (deviceId && !useDeviceStore.getState().getDevice(deviceId)) {
        deviceId = undefined;
      }
      deviceId = deviceId ?? randId();

      const device = addDevice(deviceId);
      device.setConnectionPhase("configuring");
      updateStatus(id, "configuring");
      log.debug("setupMeshDevice: building MeshDevice", { id, deviceId });

      const meshDevice = await buildMeshDevice(id, deviceId, transport);
      log.debug("setupMeshDevice: MeshDevice built", { id });

      if (!meshRegistry.has(id)) {
        meshRegistry.register(id, meshDevice.meshClient);
      }
      meshRegistry.setActive(id);

      setSelectedDevice(deviceId);
      device.addConnection(meshDevice);
      subscribeAll(device, meshDevice);

      if (serialPort) {
        cachedTransports.set(id, serialPort);
      }

      setActiveConnectionId(id);
      device.setConnectionId(id);

      let configuredHandled = false;
      const markConfigured = (source: string): void => {
        if (configuredHandled) {
          return;
        }
        configuredHandled = true;
        log.info("connect transitioned to configured", { id, source });
        device.setConnectionPhase("configured");
        updateStatus(id, "configured");
        startMaintenanceHeartbeat(id, meshDevice);

        const epochSeconds = Math.floor(Date.now() / 1000);
        log.info("syncing node time from web client", {
          id,
          epochSeconds,
          isoTime: new Date(epochSeconds * 1000).toISOString(),
        });
        void meshDevice.setTimeOnly(epochSeconds).catch((error) => {
          const err = error as Error;
          log.warn("time sync failed", {
            id,
            name: err?.name,
            message: err?.message,
          });
        });
      };

      const unsubConfigComplete = meshDevice.events.onConfigComplete.subscribe(
        () => markConfigured("onConfigComplete"),
      );
      const unsubStatusSignal = meshDevice.meshClient.device.status.subscribe(
        (status) => {
          if (status === DeviceStatusEnum.DeviceConfigured) {
            markConfigured("device.status");
          } else if (
            status === DeviceStatusEnum.DeviceDisconnected ||
            status === DeviceStatusEnum.DeviceError
          ) {
            log.info("device disconnected - scheduling reconnect", {
              id,
              status,
            });
            stopHeartbeat(id);
            updateStatus(id, "disconnected");
            scheduleReconnect(id);
          }
        },
      );

      if (
        meshDevice.meshClient.device.status.value ===
        DeviceStatusEnum.DeviceConfigured
      ) {
        markConfigured("initial-check");
      }

      const unsubRebooted = meshDevice.events.onRebooted.subscribe(() => {
        log.info("device rebooted - re-entering configuring", { id });
        stopHeartbeat(id);
        configuredHandled = false;
        device.setConnectionPhase("configuring");
        updateStatus(id, "configuring");
      });

      configSubscriptions.set(id, () => {
        unsubConfigComplete();
        unsubStatusSignal();
        unsubRebooted();
      });

      log.debug("setupMeshDevice: calling configure()", { id });
      meshDevice
        .configure()
        .then(() => {
          log.debug(
            "setupMeshDevice: configure() resolved, sending heartbeat",
            { id },
          );
          return meshDevice
            .heartbeat()
            .then(() => startConfigHeartbeat(id, meshDevice));
        })
        .catch((error) => {
          const err = error as Error;
          log.error("setupMeshDevice: configure() rejected", {
            id,
            name: err?.name,
            message: err?.message,
          });
          updateStatus(id, "error", err?.message ?? String(error));
        });

      updateSavedConnection(id, { meshDeviceId: deviceId });
      return deviceId;
    },
    [
      connections,
      addDevice,
      setSelectedDevice,
      setActiveConnectionId,
      updateSavedConnection,
      updateStatus,
      scheduleReconnect,
    ],
  );

  const connect = useCallback(
    async (
      id: ConnectionId,
      opts?: { allowPrompt?: boolean; isAutoReconnect?: boolean },
    ) => {
      const conn = useDeviceStore
        .getState()
        .savedConnections.find((entry) => entry.id === id);
      if (!conn) {
        log.warn("connect: unknown connection id", { id });
        return false;
      }
      if (!opts?.isAutoReconnect) {
        manualDisconnects.delete(id);
        clearReconnect(id);
      }
      if (conn.status === "configured" || conn.status === "connected") {
        log.debug("connect: already connected", { id, status: conn.status });
        return true;
      }

      log.info("connect: enter", {
        id,
        type: conn.type,
        allowPrompt: !!opts?.allowPrompt,
      });
      updateStatus(id, "connecting");

      try {
        const result = await openTransport(conn, {
          allowPrompt: opts?.allowPrompt,
          cachedSerialPort: cachedTransports.get(id),
        });
        log.debug("connect: openTransport ok", { id });
        await setupMeshDevice(id, result.transport, result.serialPort);
        log.info(
          "connect: setupMeshDevice resolved, awaiting onConfigComplete",
          { id },
        );
        return true;
      } catch (error) {
        const err = error as Error;
        log.error("connect: failed", {
          id,
          name: err?.name,
          message: err?.message,
        });
        updateStatus(id, "error", err?.message ?? String(error));
        return false;
      }
    },
    [setupMeshDevice, updateStatus],
  );
  connectRef.current = connect;

  const disconnect = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((entry) => entry.id === id);
      if (!conn) {
        return;
      }

      try {
        await teardown(id, conn);
        if (conn.meshDeviceId) {
          const device = useDeviceStore.getState().getDevice(conn.meshDeviceId);
          if (device) {
            device.setConnectionId(null);
            device.setConnectionPhase("disconnected");
          }
        }
      } finally {
        updateSavedConnection(id, { status: "disconnected", error: undefined });
      }
    },
    [connections, teardown, updateSavedConnection],
  );

  const addConnection = useCallback(
    (input: NewConnection) => {
      const conn = createConnectionFromInput(input);
      addSavedConnection(conn);
      return conn;
    },
    [addSavedConnection],
  );

  const addConnectionAndConnect = useCallback(
    async (input: NewConnection) => {
      const conn = addConnection(input);
      await connect(conn.id, { allowPrompt: true });
      return conn;
    },
    [addConnection, connect],
  );

  const connectSerial = useCallback(async () => {
    if (!("serial" in navigator)) {
      throw new Error("Web Serial not supported");
    }

    const serial = (
      navigator as Navigator & {
        serial: {
          requestPort: (
            options: Record<string, unknown>,
          ) => Promise<SerialPort>;
        };
      }
    ).serial;

    const port = await serial.requestPort({});
    const info =
      (
        port as SerialPort & {
          getInfo?: () => { usbVendorId?: number; usbProductId?: number };
        }
      ).getInfo?.() ?? {};
    const usbVendorId = info.usbVendorId;
    const usbProductId = info.usbProductId;
    const vendorLabel = usbVendorId?.toString(16) ?? "?";
    const productLabel = usbProductId?.toString(16) ?? "?";

    const existingConnections = [...useDeviceStore.getState().savedConnections];
    for (const existing of existingConnections) {
      await removeConnection(existing.id);
    }

    const connection = addConnection({
      type: "serial",
      name: `USB ${vendorLabel}:${productLabel}`,
      usbVendorId,
      usbProductId,
    });
    cachedTransports.set(connection.id, port);
    const ok = await connect(connection.id, { allowPrompt: false });
    return { connection, ok };
  }, [addConnection, connect, removeConnection]);

  const refreshStatuses = useCallback(async () => {
    const candidates = connections.filter(
      (entry) =>
        entry.status !== "connected" &&
        entry.status !== "configured" &&
        entry.status !== "configuring",
    );
    await Promise.all(
      candidates.map(async (entry) => {
        const status = await probeConnection(entry);
        updateSavedConnection(entry.id, { status });
      }),
    );
  }, [connections, updateSavedConnection]);

  const syncConnectionStatuses = useCallback(() => {
    const activeConnection = connections.find(
      (entry) => entry.meshDeviceId === selectedDeviceId,
    );
    connections.forEach((entry) => {
      const shouldBeConnected = activeConnection?.id === entry.id;
      const isConnectedState =
        entry.status === "connected" ||
        entry.status === "configured" ||
        entry.status === "configuring";
      if (!shouldBeConnected && isConnectedState) {
        updateSavedConnection(entry.id, { status: "disconnected" });
      }
    });
  }, [connections, selectedDeviceId, updateSavedConnection]);

  return {
    connections,
    addConnection,
    addConnectionAndConnect,
    connect,
    connectSerial,
    disconnect,
    removeConnection,
    refreshStatuses,
    setDefaultConnection: (_id: ConnectionId) => {},
    syncConnectionStatuses,
  };
}
