import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import {
  type DataRow,
  type Heading,
  Table,
} from "@components/generic/Table/index.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import {
  getWaypointIcon,
  getWaypointName,
} from "@components/PageComponents/Map/waypointPresentation.ts";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useNodesAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useDevice, type WaypointWithMetadata } from "@core/stores";
import { toLngLat } from "@core/utils/geo.ts";
import { useNavigate } from "@tanstack/react-router";
import { MapPinnedIcon } from "lucide-react";
import type { JSX } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const WaypointIconBadge = ({
  waypoint,
}: {
  waypoint: WaypointWithMetadata;
}) => (
  <div className="flex size-10 items-center justify-center rounded-full border border-amber-500 bg-amber-400 text-lg text-slate-900 shadow-sm shadow-slate-700/40">
    <span className="leading-none">{getWaypointIcon(waypoint)}</span>
  </div>
);

const WaypointsPageContent = ({
  splitPane = false,
}: {
  splitPane?: boolean;
}): JSX.Element => {
  const { t } = useTranslation(["ui", "map"]);
  const { waypoints, hardware } = useDevice();
  const nodes = useNodesAsProto();
  const myNode = useMyNodeAsProto();
  const navigate = useNavigate();

  const nodeNamesByNum = useMemo(
    () =>
      new Map(
        nodes.map((node) => [
          node.num,
          node.user?.longName?.trim() ||
            node.user?.shortName?.trim() ||
            `!${node.num}`,
        ]),
      ),
    [nodes],
  );

  const storedOnLabel = useMemo(() => {
    const currentNodeNum = myNode?.num ?? hardware.myNodeNum;

    if (!currentNodeNum) {
      return "This node";
    }

    return (
      nodeNamesByNum.get(currentNodeNum) ??
      myNode?.user?.longName?.trim() ??
      myNode?.user?.shortName?.trim() ??
      `!${currentNodeNum}`
    );
  }, [hardware.myNodeNum, myNode, nodeNamesByNum]);

  const headings: Heading[] = [
    { title: "", sortable: false },
    { title: "Name", sortable: true },
    { title: "Stored On", sortable: true },
    { title: "Channel", sortable: true },
    { title: "From", sortable: true },
    { title: "Expires", sortable: true },
    { title: "Coordinates", sortable: false },
    { title: "", sortable: false },
  ];

  const rows: DataRow[] = waypoints.map((waypoint) => {
    const [lng, lat] = toLngLat({
      latitudeI: waypoint.latitudeI,
      longitudeI: waypoint.longitudeI,
    });
    const waypointName = getWaypointName(waypoint);
    const fromLabel =
      nodeNamesByNum.get(waypoint.metadata.from) ??
      `!${waypoint.metadata.from}`;
    const expirySortValue =
      waypoint.expire && waypoint.expire !== 0
        ? waypoint.expire
        : Number.MAX_SAFE_INTEGER;

    return {
      id: waypoint.id,
      cells: [
        {
          content: <WaypointIconBadge waypoint={waypoint} />,
          sortValue: waypointName,
        },
        {
          content: (
            <button
              type="button"
              className="cursor-pointer text-left underline"
              onClick={() => navigate({ to: `/map/${lng}/${lat}/16` })}
            >
              {waypointName}
            </button>
          ),
          sortValue: waypointName,
        },
        {
          content: <Mono>{storedOnLabel}</Mono>,
          sortValue: storedOnLabel,
        },
        {
          content: <Mono>{waypoint.metadata.channel}</Mono>,
          sortValue: waypoint.metadata.channel,
        },
        {
          content: <Mono>{fromLabel}</Mono>,
          sortValue: fromLabel,
        },
        {
          content:
            waypoint.expire !== 0 ? (
              <TimeAgo timestamp={waypoint.expire * 1000} />
            ) : (
              <span>Never</span>
            ),
          sortValue: expirySortValue,
        },
        {
          content: (
            <Mono>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </Mono>
          ),
          sortValue: `${lat},${lng}`,
        },
        {
          content: (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs transition hover:bg-slate-800"
              onClick={() => navigate({ to: `/map/${lng}/${lat}/16` })}
            >
              <MapPinnedIcon size={12} />
              <span>Map</span>
            </button>
          ),
          sortValue: waypoint.id,
        },
      ],
    };
  });

  return (
    <PageLayout
      label={splitPane ? "" : "Waypoints"}
      leftBar={splitPane ? undefined : <Sidebar />}
      hideFooter={splitPane}
    >
      <div className="min-h-0 overflow-y-auto px-2 pb-3 pt-2">
        {waypoints.length > 0 ? (
          <Table headings={headings} rows={rows} />
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-900/30 px-4 py-6 text-sm text-slate-400">
            {t("layerTool.waypoints", { ns: "map" })}: 0
          </div>
        )}
      </div>
    </PageLayout>
  );
};

const WaypointsPage = (): JSX.Element => <WaypointsPageContent />;

export const SplitWaypointsPage = (): JSX.Element => (
  <WaypointsPageContent splitPane />
);

export default WaypointsPage;
