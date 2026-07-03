import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import type {
  ButtonHTMLAttributes,
  ClassAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";
import * as React from "react";
import type { JSX } from "react/jsx-runtime";
import { describe, expect, it, vi } from "vitest";
import { WaypointDialog } from "./WaypointDialog.tsx";

const mockToast = vi.fn();

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    getEffectiveConfig: () => ({
      units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.METRIC,
    }),
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      switch (key) {
        case "waypointDialog.name.label":
          return "Name";
        case "waypointDialog.icon.fieldAria":
          return "Select waypoint icon";
        case "waypointDialog.icon.pickAria":
          return `Use ${String(options?.icon ?? "")} as waypoint icon`;
        case "waypointDialog.geofence.mode.label":
          return "Fence type";
        case "waypointDialog.geofence.mode.circle":
          return "Circle";
        case "waypointDialog.geofence.mode.box":
          return "Rectangular box";
        case "waypointDialog.geofence.mode.none":
          return "None";
        case "waypointDialog.geofence.radius.label":
          return `Circle radius (${String(options?.unit ?? "")})`;
        case "waypointDialog.submit":
          return "Create waypoint";
        case "waypointDialog.update":
          return "Save waypoint";
        case "waypointDialog.success.title":
          return "Waypoint created";
        case "waypointDialog.success.description":
          return "The waypoint was sent to the selected channel.";
        default:
          return key;
      }
    },
  }),
}));

vi.mock("@components/UI/Button.tsx", async () => {
  const actual = await vi.importActual("@components/UI/Button.tsx");
  return {
    ...actual,
    Button: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLButtonElement> &
        ButtonHTMLAttributes<HTMLButtonElement>,
    ) => <button {...props} />,
  };
});

vi.mock("@components/UI/Input.tsx", async () => {
  const actual = await vi.importActual("@components/UI/Input.tsx");
  return {
    ...actual,
    Input: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLInputElement> &
        InputHTMLAttributes<HTMLInputElement>,
    ) => <input {...props} />,
  };
});

vi.mock("@components/UI/Label.tsx", async () => {
  const actual = await vi.importActual("@components/UI/Label.tsx");
  return {
    ...actual,
    Label: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLLabelElement> &
        LabelHTMLAttributes<HTMLLabelElement>,
    ) => <label {...props} />,
  };
});

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

vi.mock("@components/UI/Switch.tsx", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (value: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@components/UI/Select.tsx", async () => {
  const ReactModule = await import("react");
  const SelectContext = ReactModule.createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
  }>({});

  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
  }) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );

  const SelectTrigger = ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  );
  const SelectValue = () => null;
  const SelectContent = ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  );
  const SelectGroup = ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  );
  const SelectLabel = ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  );
  const SelectItem = ({
    value,
    children,
  }: {
    value: string;
    children: ReactNode;
  }) => {
    const ctx = ReactModule.useContext(SelectContext);
    return (
      <button type="button" onClick={() => ctx.onValueChange?.(value)}>
        {children}
      </button>
    );
  };

  return {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
  };
});

describe("WaypointDialog", () => {
  it("submits a circular geofence radius", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <WaypointDialog
        open
        onOpenChange={() => {}}
        latitude={40.9179958}
        longitude={-74.1981458}
        channels={[{ index: 0, label: "Primary" }]}
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

    fireEvent.click(screen.getByRole("button", { name: "Circle" }));

    fireEvent.change(screen.getByLabelText("Circle radius (meters)"), {
      target: { value: "100" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save waypoint" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const [waypointArg] = onSubmit.mock.calls[0] as [
      Protobuf.Mesh.Waypoint,
      number,
    ];
    expect(waypointArg.geofenceRadius).toBe(100);
    expect(waypointArg.boundingBox).toBeUndefined();
  });
});
