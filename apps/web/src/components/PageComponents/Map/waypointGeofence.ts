import type { WaypointWithMetadata } from "@core/stores";
import type { Protobuf } from "@meshtastic/sdk";

export const waypointNeedsReplacement = (
  previousWaypoint: WaypointWithMetadata | undefined,
  nextWaypoint: Partial<Protobuf.Mesh.Waypoint> | undefined,
): boolean => {
  if (!previousWaypoint || !nextWaypoint) {
    return false;
  }

  const nextRadius = nextWaypoint.geofenceRadius ?? 0;
  const nextBoundingBox = nextWaypoint.boundingBox;

  return (
    (previousWaypoint.geofenceRadius > 0 && nextRadius === 0) ||
    (previousWaypoint.boundingBox !== undefined &&
      nextBoundingBox === undefined)
  );
};
