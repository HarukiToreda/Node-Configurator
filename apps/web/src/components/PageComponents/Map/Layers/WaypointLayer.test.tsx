import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WaypointLayer } from "./WaypointLayer.tsx";

vi.mock("@core/hooks/useMapFitting", () => ({
  useMapFitting: () => ({
    focusLngLat: vi.fn(),
  }),
}));

vi.mock("@components/PageComponents/Map/Markers/NodeMarker.tsx", () => ({
  NodeMarker: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@components/PageComponents/Map/Popups/PopupWrapper.tsx", () => ({
  PopupWrapper: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@components/PageComponents/Map/Popups/WaypointDetail.tsx", () => ({
  WaypointDetail: () => <div>detail</div>,
}));

vi.mock("react-map-gl/maplibre", () => ({
  Source: ({
    children,
    data,
  }: {
    children: ReactNode;
    data: { features?: unknown[] };
  }) => (
    <div data-testid="source" data-feature-count={data.features?.length ?? 0}>
      {children}
    </div>
  ),
  Layer: () => <div data-testid="layer" />,
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    waypoints: [
      {
        id: 1,
        latitudeI: 409179958,
        longitudeI: -741981458,
        icon: 0x1f440,
        name: "1",
        geofenceRadius: 0,
        notifyOnEnter: false,
        notifyOnExit: false,
        notifyFavoritesOnly: false,
        metadata: {
          channel: 0,
          created: new Date("2026-07-03T12:00:00Z"),
          from: 0,
        },
      },
    ],
    getWaypoint: () => ({
      id: 1,
      latitudeI: 409179958,
      longitudeI: -741981458,
      icon: 0x1f440,
      name: "1",
      geofenceRadius: 100,
      notifyOnEnter: false,
      notifyOnExit: false,
      notifyFavoritesOnly: false,
      metadata: {
        channel: 0,
        created: new Date("2026-07-03T12:00:00Z"),
        from: 0,
      },
    }),
    getDisplayedWaypoints: () => [
      {
        id: 1,
        latitudeI: 409179958,
        longitudeI: -741981458,
        icon: 0x1f440,
        name: "1",
        geofenceRadius: 100,
        notifyOnEnter: false,
        notifyOnExit: false,
        notifyFavoritesOnly: false,
        metadata: {
          channel: 0,
          created: new Date("2026-07-03T12:00:00Z"),
          from: 0,
        },
      },
    ],
  }),
}));

describe("WaypointLayer", () => {
  it("renders a geofence overlay from displayed waypoint data", () => {
    const TestHarness = () => (
      <>
        {WaypointLayer({
          mapRef: undefined,
          myNode: undefined,
          isVisible: true,
          popupState: undefined,
          setPopupState: () => {},
          onEditWaypoint: () => {},
          onDeleteWaypoint: () => {},
        })}
      </>
    );

    render(
      <div>
        <TestHarness />
      </div>,
    );

    expect(screen.getByTestId("source")).toHaveAttribute(
      "data-feature-count",
      "1",
    );
  });
});
