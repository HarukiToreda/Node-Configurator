import { NodeMarker } from "@components/PageComponents/Map/Markers/NodeMarker.tsx";
import type { PopupState } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { PopupWrapper } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { WaypointDetail } from "@components/PageComponents/Map/Popups/WaypointDetail.tsx";
import {
  getWaypointIcon,
  getWaypointName,
} from "@components/PageComponents/Map/waypointPresentation.ts";
import { useMapFitting } from "@core/hooks/useMapFitting";
import { useDevice, type WaypointWithMetadata } from "@core/stores";
import { toLngLat } from "@core/utils/geo.ts";
import type { Protobuf } from "@meshtastic/sdk";
import { circle } from "@turf/turf";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { useCallback, useId, useMemo } from "react";
import { Layer, Source, type MapRef } from "react-map-gl/maplibre";

export interface WaypointLayerProps {
  mapRef: MapRef | undefined;
  myNode: Protobuf.Mesh.NodeInfo | undefined;
  isVisible: boolean;
  popupState: PopupState | undefined;
  setPopupState: (state: PopupState | undefined) => void;
  onEditWaypoint: (waypoint: WaypointWithMetadata) => void;
  onDeleteWaypoint: (waypoint: WaypointWithMetadata) => void;
}

function generateGeofenceFeatures(
  waypoints: WaypointWithMetadata[],
): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [];

  for (const waypoint of waypoints) {
    const [lng, lat] = toLngLat({
      latitudeI: waypoint.latitudeI,
      longitudeI: waypoint.longitudeI,
    });
    const hasValidCenter =
      Number.isFinite(lng) && Number.isFinite(lat) && !(lng === 0 && lat === 0);

    if (waypoint.geofenceRadius > 0 && hasValidCenter) {
      features.push(
        circle([lng, lat], waypoint.geofenceRadius, {
          steps: 64,
          units: "meters",
        }) as Feature<Polygon>,
      );
    }

    const boundingBox = waypoint.boundingBox;
    if (!boundingBox) {
      continue;
    }

    const west = boundingBox.longitudeWestI / 1e7;
    const south = boundingBox.latitudeSouthI / 1e7;
    const east = boundingBox.longitudeEastI / 1e7;
    const north = boundingBox.latitudeNorthI / 1e7;

    if (
      !Number.isFinite(west) ||
      !Number.isFinite(south) ||
      !Number.isFinite(east) ||
      !Number.isFinite(north) ||
      west === east ||
      south === north
    ) {
      continue;
    }

    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export const WaypointLayer = ({
  mapRef,
  myNode,
  isVisible,
  popupState,
  setPopupState,
  onEditWaypoint,
  onDeleteWaypoint,
}: WaypointLayerProps): React.ReactNode[] => {
  const device = useDevice();
  const { focusLngLat } = useMapFitting(mapRef);
  const geofenceLayerId = useId();
  const displayedWaypoints = device.getDisplayedWaypoints();
  const selectedWaypoint = useMemo(
    () =>
      popupState?.type !== "waypoint"
        ? undefined
        : (displayedWaypoints.find(
            (waypoint) => waypoint.id === popupState.waypointId,
          ) ?? undefined),
    [displayedWaypoints, popupState],
  );

  const geofenceFeatures = useMemo(
    () => generateGeofenceFeatures(displayedWaypoints),
    [displayedWaypoints],
  );
  const selectedGeofenceFeatures = useMemo(
    () =>
      selectedWaypoint
        ? generateGeofenceFeatures([selectedWaypoint])
        : ({
            type: "FeatureCollection",
            features: [],
          } as FeatureCollection<Polygon>),
    [selectedWaypoint],
  );

  const onMarkerClick = useCallback(
    (waypoint: WaypointWithMetadata, e: { originalEvent: MouseEvent }) => {
      e.originalEvent?.stopPropagation();
      setPopupState({ type: "waypoint", waypointId: waypoint.id });
      if (waypoint.longitudeI && waypoint.latitudeI) {
        focusLngLat(
          toLngLat({
            longitudeI: waypoint.longitudeI,
            latitudeI: waypoint.latitudeI,
          }),
          { offsetY: 180 },
        );
      }
    },
    [focusLngLat, setPopupState],
  );

  const rendered: React.ReactNode[] = [];
  if (!isVisible) {
    return rendered;
  }

  if (geofenceFeatures.features.length > 0) {
    rendered.push(
      <Source
        key={`${geofenceLayerId}-source`}
        id={`${geofenceLayerId}-source`}
        type="geojson"
        data={geofenceFeatures}
      >
        <Layer
          id={`${geofenceLayerId}-fill`}
          type="fill"
          paint={{
            "fill-color": "#fbbf24",
            "fill-opacity": 0.18,
          }}
        />
        <Layer
          id={`${geofenceLayerId}-line`}
          type="line"
          paint={{
            "line-color": "#f59e0b",
            "line-opacity": 0.95,
            "line-width": 3,
          }}
        />
      </Source>,
    );
  }

  if (selectedGeofenceFeatures.features.length > 0) {
    rendered.push(
      <Source
        key={`${geofenceLayerId}-selected-source`}
        id={`${geofenceLayerId}-selected-source`}
        type="geojson"
        data={selectedGeofenceFeatures}
      >
        <Layer
          id={`${geofenceLayerId}-selected-glow`}
          type="line"
          paint={{
            "line-color": "#38bdf8",
            "line-opacity": 0.4,
            "line-width": 10,
            "line-blur": 2,
          }}
        />
        <Layer
          id={`${geofenceLayerId}-selected-fill`}
          type="fill"
          paint={{
            "fill-color": "#38bdf8",
            "fill-opacity": 0.12,
          }}
        />
        <Layer
          id={`${geofenceLayerId}-selected-line`}
          type="line"
          paint={{
            "line-color": "#38bdf8",
            "line-opacity": 1,
            "line-width": 4,
          }}
          layout={{
            "line-join": "round",
            "line-cap": "round",
          }}
        />
      </Source>,
    );
  }

  for (const waypoint of displayedWaypoints) {
    const [lng, lat] = toLngLat({
      latitudeI: waypoint.latitudeI,
      longitudeI: waypoint.longitudeI,
    });

    rendered.push(
      <NodeMarker
        key={`waypoint-${waypoint.id}`}
        id={waypoint.id}
        lng={lng}
        lat={lat}
        label={getWaypointIcon(waypoint)}
        longLabel={getWaypointName(waypoint)}
        tooltipLabel={getWaypointName(waypoint)}
        avatarClassName="bg-amber-400 border-amber-500 text-slate-900"
        markerVariant="text"
        markerShape="triangle"
        onClick={(_, e) => onMarkerClick(waypoint, e)}
      />,
    );
  }

  if (selectedWaypoint) {
    const [lng, lat] = toLngLat({
      latitudeI: selectedWaypoint.latitudeI,
      longitudeI: selectedWaypoint.longitudeI,
    });

    rendered.push(
      <PopupWrapper
        key={`popup-waypoint-${selectedWaypoint.id}`}
        lng={lng}
        lat={lat}
        offset={[0, 25]}
        onClose={() => setPopupState(undefined)}
      >
        <WaypointDetail
          waypoint={selectedWaypoint}
          myNode={myNode}
          onEdit={() => onEditWaypoint(selectedWaypoint)}
          onDelete={() => onDeleteWaypoint(selectedWaypoint)}
        />
      </PopupWrapper>,
    );
  }

  return rendered;
};
