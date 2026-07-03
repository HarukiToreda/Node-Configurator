import { create, toBinary } from "@bufbuild/protobuf";
import { Protobuf, type Types } from "@meshtastic/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const idbMem = new Map<string, string>();
vi.mock("idb-keyval", () => ({
  get: vi.fn((key: string) => Promise.resolve(idbMem.get(key))),
  set: vi.fn((key: string, val: string) => {
    idbMem.set(key, val);
    return Promise.resolve();
  }),
  del: vi.fn((k: string) => {
    idbMem.delete(k);
    return Promise.resolve();
  }),
}));

// Helper to load a fresh copy of the store with persist flag on/off
async function freshStore(persist = false) {
  vi.resetModules();

  // suppress console output from the store during tests (for github actions)
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});

  vi.doMock("@core/services/featureFlags", () => ({
    featureFlags: {
      get: vi.fn((key: string) => (key === "persistDevices" ? persist : false)),
    },
  }));

  const storeMod = await import("./index.ts");
  return storeMod;
}

function makeHardware(myNodeNum: number) {
  return create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum });
}
function makeRoute(from: number, time = Date.now() / 1000) {
  return {
    from,
    rxTime: time,
    portnum: Protobuf.Portnums.PortNum.ROUTING_APP,
    data: create(Protobuf.Mesh.RouteDiscoverySchema, {}),
  } as unknown as Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>;
}
function makeWaypoint(
  id: number,
  expire?: number,
  extra?: Partial<Protobuf.Mesh.Waypoint>,
) {
  return create(Protobuf.Mesh.WaypointSchema, { id, expire, ...extra });
}

function makeAdminMessage(fields: Record<string, any>) {
  return create(Protobuf.Admin.AdminMessageSchema, fields);
}

describe("DeviceStore – basic map ops & retention", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("addDevice returns same instance on repeated calls; getDevice(s) works; retention evicts oldest after cap", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();

    const a = state.addDevice(1);
    const b = state.addDevice(1);
    expect(a).toBe(b);
    expect(state.getDevice(1)).toBe(a);
    expect(state.getDevices().length).toBe(1);

    // DEVICESTORE_RETENTION_NUM = 10; create 11 to evict #1
    for (let i = 2; i <= 11; i++) {
      state.addDevice(i);
    }
    expect(state.getDevice(1)).toBeUndefined();
    expect(state.getDevice(11)).toBeDefined();
    expect(state.getDevices().length).toBe(10);
  });

  it("removeDevice deletes only that entry", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    state.addDevice(10);
    state.addDevice(11);
    expect(state.getDevices().length).toBe(2);

    state.removeDevice(10);
    expect(state.getDevice(10)).toBeUndefined();
    expect(state.getDevice(11)).toBeDefined();
    expect(state.getDevices().length).toBe(1);
  });
});

describe("DeviceStore – metadata, dialogs, unread counts, message draft", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("addMetadata stores by node id", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(1);

    const metadata = create(Protobuf.Mesh.DeviceMetadataSchema, {
      firmwareVersion: "1.2.3",
    });
    device.addMetadata(123, metadata);

    expect(useDeviceStore.getState().devices.get(1)?.metadata.get(123)).toEqual(
      metadata,
    );
  });

  it("dialogs set/get work and throw if device missing", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(5);

    device.setDialogOpen("reboot", true);
    expect(device.getDialogOpen("reboot")).toBe(true);
    device.setDialogOpen("reboot", false);
    expect(device.getDialogOpen("reboot")).toBe(false);

    // getDialogOpen uses getDevice or throws if device missing
    state.removeDevice(5);
    expect(() => device.getDialogOpen("reboot")).toThrow(/Device 5 not found/);
  });

  it("setMessageDraft stores the text", async () => {
    const { useDeviceStore } = await freshStore(false);
    const device = useDeviceStore.getState().addDevice(3);
    device.setMessageDraft("hello");

    expect(useDeviceStore.getState().devices.get(3)?.messageDraft).toBe(
      "hello",
    );
  });
});

describe("DeviceStore – traceroutes & waypoints retention + merge on setHardware", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("addTraceRoute appends and enforces per-target and target caps", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(100);

    // Per target: cap = 100; push 101 for from=7
    for (let i = 0; i < 101; i++) {
      device.addTraceRoute(makeRoute(7, i));
    }

    const routesFor7 = useDeviceStore
      .getState()
      .devices.get(100)
      ?.traceroutes.get(7)!;
    expect(routesFor7.length).toBe(100);
    expect(routesFor7[0]?.rxTime).toBe(1); // first (0) evicted

    // Target map cap: 100 keys, add 101 unique "from"
    for (let from = 0; from <= 100; from++) {
      device.addTraceRoute(makeRoute(1000 + from));
    }

    const keys = Array.from(
      useDeviceStore.getState().devices.get(100)!.traceroutes.keys(),
    );
    expect(keys.length).toBe(100);
  });

  it("addWaypoint upserts by id and enforces retention; setHardware moves traceroutes + prunes expired waypoints", async () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();

    // Old device with myNodeNum=777 and some waypoints (one expired)
    const oldDevice = state.addDevice(1);
    const mockSendWaypoint = vi.fn();
    oldDevice.addConnection({ sendWaypoint: mockSendWaypoint } as any);

    oldDevice.setHardware(makeHardware(777));
    oldDevice.addWaypoint(
      makeWaypoint(1, Date.parse("2024-12-31T23:59:59Z")), // This is expired, will not be added
      0,
      0,
      new Date(),
    ); // expired
    oldDevice.addWaypoint(makeWaypoint(2, 0), 0, 0, new Date()); // no expire
    oldDevice.addWaypoint(
      makeWaypoint(3, Date.parse("2026-01-01T00:00:00Z")),
      0,
      0,
      new Date(),
    ); // ok
    oldDevice.addTraceRoute(makeRoute(55));
    oldDevice.addTraceRoute(makeRoute(56));

    // Upsert waypoint by id
    oldDevice.addWaypoint(
      makeWaypoint(2, Date.parse("2027-01-01T00:00:00Z")),
      0,
      0,
      new Date(),
    );

    const wps = useDeviceStore.getState().devices.get(1)!.waypoints;
    expect(wps.length).toBe(2);
    expect(wps.find((w) => w.id === 2)?.expire).toBe(
      Date.parse("2027-01-01T00:00:00Z"),
    );

    // Retention: push 102 total waypoints -> capped at 100. Oldest evicted
    for (let i = 3; i <= 102; i++) {
      oldDevice.addWaypoint(makeWaypoint(i), 0, 0, new Date());
    }

    expect(useDeviceStore.getState().devices.get(1)!.waypoints.length).toBe(
      100,
    );

    // Remove waypoint
    oldDevice.removeWaypoint(102, false);
    expect(mockSendWaypoint).not.toHaveBeenCalled();

    await oldDevice.removeWaypoint(101, true); // toMesh=true
    expect(mockSendWaypoint).toHaveBeenCalled();

    expect(useDeviceStore.getState().devices.get(1)!.waypoints.length).toBe(98);

    // New device shares myNodeNum; setHardware should:
    // - move traceroutes from old device
    // - copy waypoints minus expired
    // - delete old device entry
    const newDevice = state.addDevice(2);
    newDevice.setHardware(makeHardware(777));

    expect(state.getDevice(1)).toBeUndefined();
    expect(state.getDevice(2)).toBeDefined();

    // traceroutes moved:
    expect(state.getDevice(2)!.traceroutes.size).toBe(2);

    // Getter for waypoint by id works
    expect(newDevice.getWaypoint(1)).toBeUndefined();
    expect(newDevice.getWaypoint(2)).toBeUndefined();
    expect(newDevice.getWaypoint(3)).toBeTruthy();

    vi.useRealTimers();
  });

  it("preserves existing geofence data when a local echo without geofence fields comes back from node 0", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(10);

    device.setHardware(makeHardware(777));
    device.addWaypoint(
      makeWaypoint(42, 0, {
        name: "Fence",
        geofenceRadius: 30,
        notifyOnEnter: true,
      }),
      0,
      777,
      new Date("2026-07-03T12:00:00Z"),
    );

    device.addWaypoint(
      makeWaypoint(42, 0, {
        name: "Fence",
      }),
      0,
      0,
      new Date("2026-07-03T12:00:05Z"),
    );

    const waypoint = state.getDevice(10)?.getWaypoint(42);
    expect(waypoint?.geofenceRadius).toBe(30);
    expect(waypoint?.notifyOnEnter).toBe(true);
  });

  it("returns locally overridden waypoint fields through getWaypoint", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(11);

    device.addWaypoint(
      makeWaypoint(77, 0, {
        name: "Original",
      }),
      0,
      0,
      new Date("2026-07-03T12:00:00Z"),
    );

    device.setWaypointDisplayOverride(77, {
      geofenceRadius: 123,
      notifyOnExit: true,
    });

    const waypoint = state.getDevice(11)?.getWaypoint(77);
    expect(waypoint?.geofenceRadius).toBe(123);
    expect(waypoint?.notifyOnExit).toBe(true);
    expect(waypoint?.name).toBe("Original");
  });

  it("does not return expired waypoints from local display overrides", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(12);

    const expiredEpoch = Math.floor(Date.now() / 1000) - 60;
    device.setWaypointDisplayOverride(
      88,
      makeWaypoint(88, expiredEpoch, {
        name: "Expired",
        geofenceRadius: 100,
      }),
    );

    expect(state.getDevice(12)?.getWaypoint(88)).toBeUndefined();
    expect(state.getDevice(12)?.getDisplayedWaypoints()).toEqual([]);
  });

  it("returns the new box geofence after editing a circle waypoint", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(13);

    device.addWaypoint(
      makeWaypoint(99, 0, {
        name: "Fence",
        geofenceRadius: 61,
      }),
      0,
      777,
      new Date("2026-07-03T12:00:00Z"),
    );

    const editedWaypoint = makeWaypoint(99, 0, {
      name: "Fence",
      geofenceRadius: 0,
      boundingBox: create(Protobuf.Mesh.BoundingBoxSchema, {
        longitudeWestI: -741982000,
        latitudeSouthI: 409179000,
        longitudeEastI: -741980000,
        latitudeNorthI: 409181000,
      }),
    });

    device.addWaypoint(
      editedWaypoint,
      0,
      777,
      new Date("2026-07-03T12:05:00Z"),
    );
    device.setWaypointDisplayOverride(
      99,
      {
        id: 99,
        name: "Fence",
        geofenceRadius: 0,
        boundingBox: create(Protobuf.Mesh.BoundingBoxSchema, {
          longitudeWestI: -741982000,
          latitudeSouthI: 409179000,
          longitudeEastI: -741980000,
          latitudeNorthI: 409181000,
        }),
      },
      0,
      777,
      new Date("2026-07-03T12:05:00Z"),
    );

    const waypoint = state.getDevice(13)?.getWaypoint(99);
    expect(waypoint?.geofenceRadius).toBe(0);
    expect(waypoint?.boundingBox).toBeDefined();
  });

  it("returns no geofence after editing a circle waypoint to none", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(14);

    device.addWaypoint(
      makeWaypoint(100, 0, {
        name: "Fence",
        geofenceRadius: 61,
      }),
      0,
      777,
      new Date("2026-07-03T12:00:00Z"),
    );

    const editedWaypoint = makeWaypoint(100, 0, {
      name: "Fence",
      geofenceRadius: 0,
      boundingBox: undefined,
    });

    device.addWaypoint(
      editedWaypoint,
      0,
      777,
      new Date("2026-07-03T12:05:00Z"),
    );
    device.setWaypointDisplayOverride(
      100,
      {
        id: 100,
        name: "Fence",
        geofenceRadius: 0,
        boundingBox: undefined,
      },
      0,
      777,
      new Date("2026-07-03T12:05:00Z"),
    );

    const waypoint = state.getDevice(14)?.getWaypoint(100);
    expect(waypoint?.geofenceRadius).toBe(0);
    expect(waypoint?.boundingBox).toBeUndefined();
  });
});

describe("DeviceStore – persistence partialize & rehydrate", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("partialize stores only DeviceData; onRehydrateStorage rebuilds only devices with myNodeNum set (orphans dropped)", async () => {
    // First run: persist=true
    {
      const { useDeviceStore } = await freshStore(true);
      const state = useDeviceStore.getState();

      const orphan = state.addDevice(500); // no myNodeNum -> should be dropped
      orphan.addWaypoint(makeWaypoint(123), 0, 0, new Date());

      const good = state.addDevice(501);
      good.setHardware(makeHardware(42)); // sets myNodeNum
      good.addTraceRoute(makeRoute(77));
      good.addWaypoint(makeWaypoint(1), 0, 0, new Date());
      // ensure some ephemeral fields differ so we can verify methods work after rehydrate
      good.setMessageDraft("draft");
    }

    // Reload: persist=true -> rehydrate from idbMem
    {
      const { useDeviceStore } = await freshStore(true);
      const state = useDeviceStore.getState();

      expect(state.getDevice(500)).toBeUndefined(); // orphan dropped
      const device = state.getDevice(501)!;
      expect(device).toBeDefined();

      // methods should work
      device.addWaypoint(makeWaypoint(2), 0, 0, new Date());
      expect(
        useDeviceStore.getState().devices.get(501)!.waypoints.length,
      ).toBeGreaterThan(0);

      // traceroutes survived
      expect(
        useDeviceStore.getState().devices.get(501)!.traceroutes.size,
      ).toBeGreaterThan(0);
    }
  });

  it("removing a device persists across reload", async () => {
    {
      const { useDeviceStore } = await freshStore(true);
      const state = useDeviceStore.getState();
      const device = state.addDevice(900);
      device.setHardware(makeHardware(9)); // ensure it will be rehydrated
      expect(state.getDevice(900)).toBeDefined();
      state.removeDevice(900);
      expect(state.getDevice(900)).toBeUndefined();
    }
    {
      const { useDeviceStore } = await freshStore(true);
      expect(useDeviceStore.getState().getDevice(900)).toBeUndefined();
    }
  });
});

describe("DeviceStore – connection & sendAdminMessage", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("sendAdminMessage calls through to connection.sendPacket with correct args", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.addDevice(77);

    const sendPacket = vi.fn();
    device.addConnection({ sendPacket } as any);

    const message = makeAdminMessage({ logVerbosity: 1 });
    device.sendAdminMessage(message);

    expect(sendPacket).toHaveBeenCalledTimes(1);
    const [bytes, port, dest] = sendPacket.mock.calls[0]!;
    expect(port).toBe(Protobuf.Portnums.PortNum.ADMIN_APP);
    expect(dest).toBe("self");

    // sanity: encoded bytes match toBinary on the same schema
    const expected = toBinary(Protobuf.Admin.AdminMessageSchema, message);
    expect(bytes).toBeInstanceOf(Uint8Array);

    // compare content length as minimal assertion (exact byte-for-byte is fine too)
    expect((bytes as Uint8Array).length).toBe(expected.length);
  });
});
