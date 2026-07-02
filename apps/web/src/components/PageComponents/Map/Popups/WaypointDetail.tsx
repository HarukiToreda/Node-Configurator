import { TimeAgo } from "@components/generic/TimeAgo";
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
  hasPos,
  toLngLat,
} from "@core/utils/geo";
import type { Protobuf } from "@meshtastic/sdk";
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
}

export const WaypointDetail = ({ waypoint, myNode }: WaypointDetailProps) => {
  const { t } = useTranslation("map");
  const lockedToNode = useNodeAsProto(waypoint.lockedTo ?? 0);

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

          <div className="flex flex-wrap items-start gap-x-3">
            <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
              <ClockPlusIcon size={14} aria-hidden />
              <span className="truncate">
                {t("waypointDetail.createdDate")}
              </span>
            </dt>
            <dd className="ms-auto text-right">
              <time
                dateTime={new Date(waypoint.metadata.created).toISOString()}
              >
                <TimeAgo timestamp={waypoint.metadata.created} />
              </time>
            </dd>
          </div>

          {waypoint.metadata.updated && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <RotateCwIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.updated")}</span>
              </dt>
              <dd className="ms-auto text-right">
                <time
                  dateTime={new Date(waypoint.metadata.updated).toISOString()}
                >
                  <TimeAgo timestamp={waypoint.metadata.updated} />
                </time>
              </dd>
            </div>
          )}

          {waypoint.expire !== 0 && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <ClockFadingIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.expires")}</span>
              </dt>
              <dd className="ms-auto text-right">
                <time dateTime={new Date(waypoint.expire * 1000).toISOString()}>
                  <TimeAgo timestamp={waypoint.expire * 1000} />
                </time>
              </dd>
            </div>
          )}

          {distance != null && (
            <div className="flex flex-wrap items-start gap-x-3">
              <dt className="inline-flex min-w-0 items-center gap-2 text-slate-500">
                <MoveHorizontalIcon size={14} aria-hidden />
                <span className="truncate">{t("waypointDetail.distance")}</span>
              </dt>
              <dd className="ms-auto text-right">
                <data value={Math.round(distance)}>
                  {Math.round(distance)}{" "}
                  {distance === 1
                    ? t("unit.meter.one")
                    : t("unit.meter.plural")}
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
        </dl>
      </section>
    </article>
  );
};
