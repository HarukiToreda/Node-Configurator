import type { WaypointWithMetadata } from "@core/stores";

const WAYPOINT_NAME_FALLBACK = "Waypoint";
const WAYPOINT_ICON_FALLBACK = "W";

export const getWaypointName = (
  waypoint: Pick<WaypointWithMetadata, "name">,
) => {
  const trimmedName = waypoint.name?.trim();

  return trimmedName?.length ? trimmedName : WAYPOINT_NAME_FALLBACK;
};

export const getWaypointIcon = (
  waypoint: Pick<WaypointWithMetadata, "icon">,
) => {
  if (typeof waypoint.icon !== "number" || waypoint.icon <= 0) {
    return WAYPOINT_ICON_FALLBACK;
  }

  try {
    return String.fromCodePoint(waypoint.icon);
  } catch {
    return WAYPOINT_ICON_FALLBACK;
  }
};
