import { TimeAgo } from "@components/generic/TimeAgo";
import { Button } from "@components/UI/Button.tsx";
import { Separator } from "@components/UI/Separator.tsx";
import {
  getWaypointIcon,
  getWaypointName,
} from "@components/PageComponents/Map/waypointPresentation.ts";
import { useNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import type { WaypointWithMetadata } from "@core/stores";
import {
  bearingDegrees,
  distanceMeters,
  formatDistanceForDisplay,
  hasPos,
  toLngLat,
} from "@core/utils/geo";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import {
  ClockFadingIcon,
  ClockPlusIcon,
  CompassIcon,
  MapPinnedIcon,
  MoveHorizontalIcon,
  NavigationIcon,
  RotateCwIcon,
  UserLockIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface WaypointDetailProps {
  waypoint: WaypointWithMetadata;
  myNode?: Protobuf.Mesh.NodeInfo;
  onEdit: () => void;
  onDelete: () => void;
}

export const WaypointDetail = ({
  waypoint,
  myNode,
  onEdit,
  onDelete,
}: WaypointDetailProps) => {
  const { t } = useTranslation("map");
  const { getEffectiveConfig } = useDevice();
  const lockedToNode = useNodeAsProto(waypoint.lockedTo ?? 0);
  const boundingBox = waypoint.boundingBox;
  const useImperial =
    getEffectiveConfig("display")?.units ===
    Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL;

  const waypointLngLat = toLngLat({
    latitudeI: waypoint.latitudeI,
    longitudeI: waypoint.longitudeI,
  });

  const distance = hasPos(myNode?.position)
    ? distanceMeters(toLngLat(myNode?.position), waypointLngLat)
    : undefined;

  const bearing = hasPos(myNode?.position)
    ? bearingDegrees(toLngLat(myNode?.position), waypointLngLat)
    : undefined;

  const boundingBoxWidth =
    boundingBox != null
      ? distanceMeters(
          [boundingBox.longitudeWestI / 1e7, waypointLngLat[1]],
          [boundingBox.longitudeEastI / 1e7, waypointLngLat[1]],
        )
      : undefined;

  const boundingBoxHeight =
    boundingBox != null
      ? distanceMeters(
          [waypointLngLat[0], boundingBox.latitudeSouthI / 1e7],
          [waypointLngLat[0], boundingBox.latitudeNorthI / 1e7],
        )
      : undefined;

  const geofenceAlerts = [
    waypoint.notifyOnEnter ? t("waypointDetail.alertEnter") : undefined,
    waypoint.notifyOnExit ? t("waypointDetail.alertExit") : undefined,
    waypoint.notifyFavoritesOnly
      ? t("waypointDetail.alertFavoritesOnly")
      : undefined,
  ].filter((value): value is string => Boolean(value));
  const distanceDisplay =
    distance != null
      ? formatDistanceForDisplay(distance, useImperial)
      : undefined;
  const radiusDisplay =
    waypoint.geofenceRadius > 0
      ? formatDistanceForDisplay(waypoint.geofenceRadius, useImperial)
      : undefined;
  const boxWidthDisplay =
    boundingBoxWidth != null
      ? formatDistanceForDisplay(boundingBoxWidth, useImperial)
      : undefined;
  const boxHeightDisplay =
    boundingBoxHeight != null
      ? formatDistanceForDisplay(boundingBoxHeight, useImperial)
      : undefined;
  const createdDate =
    waypoint.metadata?.created != null
      ? new Date(waypoint.metadata.created)
      : undefined;
  const updatedDate =
    waypoint.metadata?.updated != null
      ? new Date(waypoint.metadata.updated)
      : undefined;
  const hasValidCreatedDate =
    createdDate != null && !Number.isNaN(createdDate.getTime());
  const hasValidUpdatedDate =
    updatedDate != null && !Number.isNaN(updatedDate.getTime());
  const expiryDate =
    waypoint.expire !== 0 ? new Date(waypoint.expire * 1000) : undefined;
  const hasValidExpiryDate =
    expiryDate != null && !Number.isNaN(expiryDate.getTime());

  return (
    <article
      aria-labelledby={`wp-${waypoint.id}-title`}
      className="flex flex-col gap-2 px-1 text-sm dark:text-slate-900"
    >
      <header className="my-1 flex items-center justify-between">
        <h3
          id={`wp-${waypoint.id}-title`}
          className="flex items-center gap-2 font-semibold text-slate-900"
        >
          <span aria-hidden>{getWaypointIcon(waypoint)}</span>
          <span>{getWaypointName(waypoint)}</span>
        </h3>
      </header>

      {waypoint.description && (
        <p className="inline-flex items-center gap-1">{waypoint.description}</p>
      )}

      <Separator className="dark:bg-slate-200" role="separator" />

      <section aria-label={t("waypointDetail.details")}>
        <dl className="space-y-1.5">
          <div className="flex flex-wrap items-start gap-x-3">
            <dt className="inline-flex min-w-0 items-top gap-2 text-slate-500">
              <MapPinnedIcon size={14} aria-hidden className="mt-1" />
              <span className="truncate">
                {t("waypointDetail.longitude")}
                <br />
                {t("waypointDetail.latitude")}
              </span>
            </dt>
            <dd className="ms-auto text-right">
              <data value={waypointLngLat[0]}>{waypointLngLat[0]}</data>
              <br />
              <data value={waypointLngLat[1]}>{waypointLngLat[1]}</data>
            </dd>
          </div>

          {hasValidCreatedDate && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <ClockPlusIcon size={14} aria-hidden />
                <span className="truncate">
                  {t("waypointDetail.createdDate")}
                </span>
              </dt>
              <dd className="ms-auto text-right">
                <time dateTime={createdDate.toISOString()}>
                  <TimeAgo timestamp={createdDate} />
                </time>
              </dd>
            </div>
          )}

          {hasValidUpdatedDate && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <RotateCwIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.updated")}</span>
              </dt>
              <dd className="ms-auto text-right">
                <time dateTime={updatedDate.toISOString()}>
                  <TimeAgo timestamp={updatedDate} />
                </time>
              </dd>
            </div>
          )}

          {hasValidExpiryDate && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <ClockFadingIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.expires")}</span>
              </dt>
              <dd className="ms-auto text-right">
                <time dateTime={expiryDate.toISOString()}>
                  <TimeAgo timestamp={expiryDate} />
                </time>
              </dd>
            </div>
          )}

          {distanceDisplay != null && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <MoveHorizontalIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.distance")}</span>
              </dt>
              <dd className="ms-auto text-right">
                <data value={distance ?? 0}>
                  {distanceDisplay.value} {distanceDisplay.unitLabel}
                </data>
              </dd>
            </div>
          )}

          {bearing != null && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <CompassIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.bearing")}</span>
              </dt>
              <dd className="ms-auto inline-flex items-center text-right">
                <NavigationIcon
                  size={16}
                  aria-hidden
                  className="mr-2 shrink-0 origin-center transition-transform"
                  style={{ transform: `rotate(${bearing - 45}deg)` }}
                />
                <data value={Math.round(bearing)}>{Math.round(bearing)}</data>
                <span aria-hidden>{t("unit.degree.suffix")}</span>
              </dd>
            </div>
          )}

          {waypoint.lockedTo != null && waypoint.lockedTo !== 0 && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <UserLockIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.lockedTo")}</span>
              </dt>
              <dd className="ms-auto text-right">
                {lockedToNode?.user?.longName ?? t("unknown.longName")}
              </dd>
            </div>
          )}

          {radiusDisplay != null && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <MapPinnedIcon size={14} aria-hidden />
                <span className="truncate">
                  {t("waypointDetail.geofenceRadius")}
                </span>
              </dt>
              <dd className="ms-auto text-right">
                <data value={waypoint.geofenceRadius}>
                  {radiusDisplay.value} {radiusDisplay.unitLabel}
                </data>
              </dd>
            </div>
          )}

          {boxWidthDisplay != null && boxHeightDisplay != null && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <MapPinnedIcon size={14} aria-hidden />
                <span className="truncate">
                  {t("waypointDetail.geofenceBox")}
                </span>
              </dt>
              <dd className="ms-auto text-right">
                {t("waypointDetail.boxSize", {
                  width: `${boxWidthDisplay.value} ${boxWidthDisplay.unitLabel}`,
                  height: `${boxHeightDisplay.value} ${boxHeightDisplay.unitLabel}`,
                })}
              </dd>
            </div>
          )}

          {geofenceAlerts.length > 0 && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <MapPinnedIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.alerts")}</span>
              </dt>
              <dd className="ms-auto text-right">
                {geofenceAlerts.join(", ")}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          {t("waypointDetail.edit")}
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          {t("waypointDetail.delete")}
        </Button>
      </div>
    </article>
  );
};
