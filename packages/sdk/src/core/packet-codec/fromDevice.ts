import type { DeviceOutput } from "../transport/Transport.ts";

/**
 * Transforms a raw byte stream from the device into typed DeviceOutput chunks
 * by parsing the 0x94 0xC3 framing header and length prefix.
 */
export const fromDeviceStream: () => TransformStream<
  Uint8Array,
  DeviceOutput
> = () => {
  let byteBuffer = new Uint8Array([]);
  const textDecoder = new TextDecoder();

  const emitDebug = (
    controller: TransformStreamDefaultController<DeviceOutput>,
    bytes: Uint8Array,
    flush = false,
  ): void => {
    if (!bytes.length && !flush) {
      return;
    }

    const text = flush
      ? textDecoder.decode(bytes)
      : textDecoder.decode(bytes, { stream: true });

    if (text.length) {
      controller.enqueue({
        type: "debug",
        data: text,
      });
    }
  };

  return new TransformStream<Uint8Array, DeviceOutput>({
    transform(chunk: Uint8Array, controller): void {
      byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);

      while (byteBuffer.length !== 0) {
        const framingIndex = byteBuffer.indexOf(0x94);

        if (framingIndex === -1) {
          emitDebug(controller, byteBuffer);
          byteBuffer = new Uint8Array([]);
          break;
        }

        if (framingIndex > 0) {
          emitDebug(controller, byteBuffer.subarray(0, framingIndex));
          byteBuffer = byteBuffer.subarray(framingIndex);
          continue;
        }

        if (byteBuffer.length === 1) {
          break;
        }

        if (byteBuffer[1] !== 0xc3) {
          emitDebug(controller, byteBuffer.subarray(0, 1));
          byteBuffer = byteBuffer.subarray(1);
          continue;
        }

        const msb = byteBuffer[2];
        const lsb = byteBuffer[3];

        if (
          msb === undefined ||
          lsb === undefined ||
          byteBuffer.length < 4 + (msb << 8) + lsb
        ) {
          break;
        }

        const packetLength = (msb << 8) + lsb;
        const packet = byteBuffer.subarray(4, 4 + packetLength);

        const malformedDetectorIndex = packet.indexOf(0x94);
        if (
          malformedDetectorIndex !== -1 &&
          packet[malformedDetectorIndex + 1] === 0xc3
        ) {
          console.warn(
            `Malformed packet found, discarding: ${byteBuffer
              .subarray(0, Math.max(0, malformedDetectorIndex - 1))
              .toString()}`,
          );

          byteBuffer = byteBuffer.subarray(malformedDetectorIndex);
          continue;
        }

        byteBuffer = byteBuffer.subarray(4 + packetLength);
        controller.enqueue({
          type: "packet",
          data: packet,
        });
      }
    },
    flush(controller): void {
      emitDebug(controller, byteBuffer, true);
      byteBuffer = new Uint8Array([]);
    },
  });
};
