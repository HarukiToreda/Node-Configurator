import { create } from "@bufbuild/protobuf";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Protobuf } from "@meshtastic/sdk";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WaypointDialog } from "./WaypointDialog.tsx";

const mockToast = vi.fn();
let mockUnits = Protobuf.Config.Config_DisplayConfig_DisplayUnits.METRIC;

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    getEffectiveConfig: () => ({
      units: mockUnits,
    }),
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      switch (key) {
        case "waypointDialog.editTitle":
          return "Edit Waypoint";
        case "waypointDialog.editDescription":
          return "Update this waypoint and resend it to the selected channel.";
        case "waypointDialog.geofence.mode.none":
          return "None";
        case "waypointDialog.geofence.mode.circle":
          return "Circle";
        case "waypointDialog.geofence.mode.box":
          return "Rectangular box";
        case "waypointDialog.geofence.radius.label":
          return `Circle radius (${String(options?.unit ?? "")})`;
        case "waypointDialog.geofence.box.widthLabel":
          return `Box width (${String(options?.unit ?? "")})`;
        case "waypointDialog.geofence.box.heightLabel":
          return `Box height (${String(options?.unit ?? "")})`;
        case "waypointDialog.update":
          return "Save waypoint";
        case "waypointDialog.submit":
          return "Create waypoint";
        case "waypointDialog.success.updatedTitle":
          return "Waypoint updated";
        case "waypointDialog.success.updatedDescription":
          return "The waypoint changes were sent to the selected channel.";
        case "waypointDialog.name.label":
          return "Name";
        case "channels:page.broadcastLabel":
          return "Primary";
        default:
          return key;
      }
    },
  }),
}));

vi.mock("@components/UI/Dialog.tsx", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogClose: () => null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock("@components/UI/Popover.tsx", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("WaypointDialog real select behavior", () => {
  it("submits a circle geofence when selected through the real select", async () => {
    mockUnits = Protobuf.Config.Config_DisplayConfig_DisplayUnits.METRIC;
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <WaypointDialog
        open
        onOpenChange={() => {}}
        latitude={40.9179958}
        longitude={-74.1981458}
        channels={[{ index: 0, label: "Primary" }]}
        myNodeNum={123}
        initialWaypoint={
          {
            ...create(Protobuf.Mesh.WaypointSchema, {
              id: 7,
              name: "1",
              icon: 0x1f440,
              latitudeI: 409179958,
              longitudeI: -741981458,
              expire: 0,
            }),
            metadata: {
              channel: 0,
              created: new Date("2026-07-03T12:00:00Z"),
              from: 0,
            },
          } as any
        }
        onSubmit={onSubmit}
      />,
    );

    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[3]!);
    await user.click(screen.getByRole("option", { name: "Circle" }));
    await user.type(screen.getByLabelText("Circle radius (meters)"), "100");
    await user.click(screen.getByRole("button", { name: "Save waypoint" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [waypointArg, , localDisplayWaypoint] = onSubmit.mock.calls[0] as [
      Protobuf.Mesh.Waypoint,
      number,
      Partial<Protobuf.Mesh.Waypoint>,
    ];
    expect(waypointArg.geofenceRadius).toBe(100);
    expect(localDisplayWaypoint.geofenceRadius).toBe(100);
  });

  it("submits a 200 foot circle geofence in create mode without alerts", async () => {
    mockUnits = Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL;
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <WaypointDialog
        open
        onOpenChange={() => {}}
        latitude={40.9166789}
        longitude={-74.1971909}
        channels={[{ index: 0, label: "Primary" }]}
        myNodeNum={123}
        onSubmit={onSubmit}
      />,
    );

    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[3]!);
    await user.click(screen.getByRole("option", { name: "Circle" }));
    await user.type(screen.getByLabelText("Circle radius (feet)"), "200");
    await user.type(screen.getByLabelText("Name"), "test");
    const emojiButtons = screen.getAllByRole("button");
    const thumbsUpButton = emojiButtons.find((button) =>
      button.textContent?.includes("👍"),
    );
    if (!thumbsUpButton) {
      throw new Error("Thumbs up emoji button not found");
    }
    await user.click(thumbsUpButton);
    await user.click(screen.getByRole("button", { name: "Create waypoint" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [waypointArg, , localDisplayWaypoint] = onSubmit.mock.calls[0] as [
      Protobuf.Mesh.Waypoint,
      number,
      Partial<Protobuf.Mesh.Waypoint>,
    ];
    expect(waypointArg.geofenceRadius).toBeGreaterThan(0);
    expect(localDisplayWaypoint.geofenceRadius).toBeGreaterThan(0);
  });

  it("switches an edited waypoint from circle to box", async () => {
    mockUnits = Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL;
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <WaypointDialog
        open
        onOpenChange={() => {}}
        latitude={40.9166789}
        longitude={-74.1971909}
        channels={[{ index: 0, label: "Primary" }]}
        myNodeNum={123}
        initialWaypoint={
          {
            ...create(Protobuf.Mesh.WaypointSchema, {
              id: 9,
              name: "test",
              icon: 0x1f44d,
              latitudeI: 409166789,
              longitudeI: -741971909,
              expire: Math.floor(Date.now() / 1000) + 3600,
              geofenceRadius: 61,
            }),
            metadata: {
              channel: 0,
              created: new Date("2026-07-03T12:00:00Z"),
              from: 0,
            },
          } as any
        }
        onSubmit={onSubmit}
      />,
    );

    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[3]!);
    await user.click(screen.getByRole("option", { name: "Rectangular box" }));
    await user.type(screen.getByLabelText("Box width (feet)"), "300");
    await user.type(screen.getByLabelText("Box height (feet)"), "150");
    await user.click(screen.getByRole("button", { name: "Save waypoint" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [waypointArg, , localDisplayWaypoint] = onSubmit.mock.calls[0] as [
      Protobuf.Mesh.Waypoint,
      number,
      Partial<Protobuf.Mesh.Waypoint>,
    ];
    expect(waypointArg.geofenceRadius).toBe(0);
    expect(waypointArg.boundingBox).toBeDefined();
    expect(localDisplayWaypoint.geofenceRadius).toBe(0);
    expect(localDisplayWaypoint.boundingBox).toBeDefined();
  });

  it("switches an edited waypoint from circle to none", async () => {
    mockUnits = Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL;
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <WaypointDialog
        open
        onOpenChange={() => {}}
        latitude={40.9166789}
        longitude={-74.1971909}
        channels={[{ index: 0, label: "Primary" }]}
        myNodeNum={123}
        initialWaypoint={
          {
            ...create(Protobuf.Mesh.WaypointSchema, {
              id: 10,
              name: "test",
              icon: 0x1f44d,
              latitudeI: 409166789,
              longitudeI: -741971909,
              expire: Math.floor(Date.now() / 1000) + 3600,
              geofenceRadius: 61,
            }),
            metadata: {
              channel: 0,
              created: new Date("2026-07-03T12:00:00Z"),
              from: 0,
            },
          } as any
        }
        onSubmit={onSubmit}
      />,
    );

    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[3]!);
    await user.click(screen.getByRole("option", { name: "None" }));
    await user.click(screen.getByRole("button", { name: "Save waypoint" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [waypointArg, , localDisplayWaypoint] = onSubmit.mock.calls[0] as [
      Protobuf.Mesh.Waypoint,
      number,
      Partial<Protobuf.Mesh.Waypoint>,
    ];
    expect(waypointArg.geofenceRadius).toBe(0);
    expect(waypointArg.boundingBox).toBeUndefined();
    expect(localDisplayWaypoint.geofenceRadius).toBe(0);
    expect(localDisplayWaypoint.boundingBox).toBeUndefined();
  });
});
