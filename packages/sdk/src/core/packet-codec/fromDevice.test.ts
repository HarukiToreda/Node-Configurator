import { describe, expect, it } from "vitest";
import { fromDeviceStream } from "./fromDevice.ts";

async function readAllOutputs(chunks: Uint8Array[]) {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  const reader = source.pipeThrough(fromDeviceStream()).getReader();
  const outputs: Array<{ type: string; data: string | Uint8Array }> = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    outputs.push({
      type: value.type,
      data: value.data,
    });
  }

  reader.releaseLock();
  return outputs;
}

describe("fromDeviceStream", () => {
  it("emits plain serial text immediately when no packet framing is present", async () => {
    const outputs = await readAllOutputs([
      new TextEncoder().encode("booting...\r\n"),
    ]);

    expect(outputs).toEqual([
      {
        type: "debug",
        data: "booting...\r\n",
      },
    ]);
  });

  it("keeps packet framing intact while still streaming preceding debug text", async () => {
    const outputs = await readAllOutputs([
      new Uint8Array([
        ...new TextEncoder().encode("log line 1\n"),
        0x94,
      ]),
      new Uint8Array([0xc3, 0x00, 0x03, 0x01, 0x02, 0x03]),
    ]);

    expect(outputs).toHaveLength(2);
    expect(outputs[0]).toEqual({
      type: "debug",
      data: "log line 1\n",
    });
    expect(outputs[1]).toEqual({
      type: "packet",
      data: new Uint8Array([0x01, 0x02, 0x03]),
    });
  });
});
