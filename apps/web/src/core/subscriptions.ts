import { useNewNodeNum } from "@core/hooks/useNewNodeNum";
import { type Device } from "@core/stores";
import { type MeshDevice, Protobuf, Types } from "@meshtastic/sdk";

const SUPPRESSED_CLIENT_NOTIFICATION_MESSAGES = new Set([
  "Precise position is not allowed on a public (open / known-key) channel; reduced to coarse precision",
]);

/**
 * Wires up the legacy MeshDevice event stream into the web's Zustand stores.
 *
 * Note: the SDK now owns chat persistence (via SqlocalMessageRepository) and
 * the entire NodesClient surface — node info, user, position, lastHeard /
 * snr, favourite / ignored flags, and PKI-error tracking. This handler no
 * longer mirrors any of that into the legacy stores; what remains is
 * device-store-only state (waypoints, traceroutes, neighbour info, dialog
 * open triggers, unread counts).
 */
export const subscribeAll = (device: Device, connection: MeshDevice) => {
  const serialDecoder = new TextDecoder();
  const ansiPattern = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
  let serialBuffer = "";
  let serialBufferTimestamp = new Date();
  let serialBufferFrom: number | undefined;
  let serialBufferChannel: number | undefined;
  let serialLineIndex = 0;

  const sanitizeSerialText = (text: string): string =>
    text
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .replaceAll("\0", "");

  const pushSerialLine = (text: string) => {
    const line = text.trimEnd();
    const visibleLine = line.replace(ansiPattern, "").trim();
    if (!visibleLine.length) {
      return;
    }

    device.addSerialLogEntry({
      id: `serial-line-${device.id}-${serialLineIndex++}`,
      timestamp: serialBufferTimestamp,
      source: "serial",
      text: line,
      from: serialBufferFrom,
      channel: serialBufferChannel,
    });
  };

  const appendSerialText = (
    text: string,
    meta: { timestamp: Date; from?: number; channel?: number },
  ) => {
    const sanitized = sanitizeSerialText(text);
    if (!sanitized.length) {
      return;
    }

    if (!serialBuffer.length) {
      serialBufferTimestamp = meta.timestamp;
      serialBufferFrom = meta.from;
      serialBufferChannel = meta.channel;
    }

    serialBuffer += sanitized;

    while (true) {
      const newlineIndex = serialBuffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      pushSerialLine(serialBuffer.slice(0, newlineIndex));
      serialBuffer = serialBuffer.slice(newlineIndex + 1);
      serialBufferTimestamp = meta.timestamp;
      serialBufferFrom = meta.from;
      serialBufferChannel = meta.channel;
    }
  };

  const flushSerialBuffer = () => {
    if (!serialBuffer.length) {
      return;
    }

    pushSerialLine(serialBuffer);
    serialBuffer = "";
  };

  connection.events.onDeviceMetadataPacket.subscribe((metadataPacket) => {
    device.addMetadata(metadataPacket.from, metadataPacket.data);
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    switch (routingPacket.data.variant.case) {
      case "errorReason": {
        if (
          routingPacket.data.variant.value === Protobuf.Mesh.Routing_Error.NONE
        ) {
          return;
        }
        console.info(`Routing Error: ${routingPacket.data.variant.value}`);
        break;
      }
      case "routeReply": {
        console.info(`Route Reply: ${routingPacket.data.variant.value}`);
        break;
      }
      case "routeRequest": {
        console.info(`Route Request: ${routingPacket.data.variant.value}`);
        break;
      }
    }
  });

  connection.events.onDeviceStatus.subscribe((status) => {
    if (
      status === Types.DeviceStatusEnum.DeviceDisconnected ||
      status === Types.DeviceStatusEnum.DeviceError
    ) {
      flushSerialBuffer();
    }
    device.setStatus(status);
  });

  connection.events.onWaypointPacket.subscribe((waypoint) => {
    const { data, channel, from, rxTime } = waypoint;
    device.addWaypoint(data, channel, from, rxTime);
  });

  connection.events.onMyNodeInfo.subscribe((nodeInfo) => {
    useNewNodeNum(device.id, nodeInfo);
  });

  // onUserPacket / onPositionPacket / onNodeInfoPacket and device-metrics
  // telemetry (battery / channel utilisation / voltage) are folded into nodes by
  // the SDK NodesClient (see packages/sdk/src/features/nodes/NodesClient.ts).

  connection.events.onChannelPacket.subscribe((channel) => {
    device.addChannel(channel);
  });
  connection.events.onConfigPacket.subscribe((config) => {
    device.setConfig(config);
  });
  connection.events.onModuleConfigPacket.subscribe((moduleConfig) => {
    device.setModuleConfig(moduleConfig);
  });

  // Inbound message handling (persistence, unread counts) lives entirely on
  // the SDK ChatClient now — see ChatClient + chat.unread.

  connection.events.onTraceRoutePacket.subscribe((traceRoutePacket) => {
    device.addTraceRoute({
      ...traceRoutePacket,
    });
  });

  connection.events.onPendingSettingsChange.subscribe((state) => {
    device.setPendingSettingsChanges(state);
  });

  // onMeshPacket → lastHeard / snr per-node updates are handled by the SDK
  // NodesClient.

  connection.events.onClientNotificationPacket.subscribe(
    (clientNotificationPacket) => {
      if (
        SUPPRESSED_CLIENT_NOTIFICATION_MESSAGES.has(
          clientNotificationPacket.message,
        )
      ) {
        return;
      }

      device.addClientNotification(clientNotificationPacket);
      device.setDialogOpen("clientNotification", true);
    },
  );

  connection.events.onNeighborInfoPacket.subscribe((neighborInfo) => {
    device.addNeighborInfo(neighborInfo.from, neighborInfo.data);
  });

  connection.events.onSerialPacket.subscribe((serialPacket) => {
    const text = serialDecoder.decode(serialPacket.data, { stream: true });
    appendSerialText(text, {
      timestamp: serialPacket.rxTime,
      from: serialPacket.from,
      channel: serialPacket.channel,
    });
  });

  connection.events.onDeviceDebugLog.subscribe((debugBytes) => {
    const text = serialDecoder.decode(debugBytes, { stream: true });
    appendSerialText(text, {
      timestamp: new Date(),
    });
  });

  connection.events.onLogRecord.subscribe((logRecord) => {
    device.addSerialLogEntry({
      id: `log-${logRecord.time}-${logRecord.source}-${logRecord.message}`,
      timestamp: logRecord.time
        ? new Date(logRecord.time * 1000)
        : new Date(),
      source: "logRecord",
      text: logRecord.message,
      level: logRecord.level,
      origin: logRecord.source,
    });
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    if (routingPacket.data.variant.case === "errorReason") {
      switch (routingPacket.data.variant.value) {
        case Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          break;
        case Protobuf.Mesh.Routing_Error.NO_CHANNEL:
        case Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          // Per-node error tracking lives on the SDK NodesClient
          // (client.nodes.errors); the dialog open trigger stays here so the
          // legacy device-store-driven dialog manager keeps working.
          device.setDialogOpen("refreshKeys", true);
          break;
        default:
          break;
      }
    }
  });
};
