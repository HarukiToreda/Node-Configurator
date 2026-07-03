import { WaypointDialog } from "@components/Dialog/WaypointDialog.tsx";
import { Button } from "@components/UI/Button.tsx";
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
import { waypointNeedsReplacement } from "@components/PageComponents/Map/waypointGeofence.ts";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useNodesAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice, type WaypointWithMetadata } from "@core/stores";
import { toLngLat } from "@core/utils/geo.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useNavigate } from "@tanstack/react-router";
import { create } from "@bufbuild/protobuf";
import { MapPinnedIcon } from "lucide-react";
import type { JSX } from "react";
import { useMemo, useState } from "react";
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
  const { t } = useTranslation(["ui", "map", "channels"]);
  const device = useDevice();
  const { hardware } = device;
  const { toast } = useToast();
  const nodes = useNodesAsProto();
  const myNode = useMyNodeAsProto();
  const navigate = useNavigate();
  const [editingWaypoint, setEditingWaypoint] = useState<
    WaypointWithMetadata | undefined
  >();
  const displayedWaypoints = device.getDisplayedWaypoints();

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

  const waypointChannels = useMemo(() => {
    const channels = Array.from(device.channels.values())
      .filter(
        (channel) => channel.role !== Protobuf.Channel.Channel_Role.DISABLED,
      )
      .sort((a, b) => a.index - b.index);

    if (channels.length === 0) {
      return [{ index: 0, label: t("channels:page.broadcastLabel") }];
    }

    return channels.map((channel) => {
      const trimmedChannelName = channel.settings?.name?.trim();

      return {
        index: channel.index,
        label:
          channel.index === 0
            ? t("channels:page.broadcastLabel")
            : trimmedChannelName?.length
              ? trimmedChannelName
              : `${t("channels:page.channelIndex", { index: channel.index })}`,
      };
    });
  }, [device.channels, t]);

  const handleDeleteWaypoint = async (waypoint: WaypointWithMetadata) => {
    if (!globalThis.confirm(t("waypointDetail.deleteConfirm", { ns: "map" }))) {
      return;
    }

    try {
      await device.removeWaypoint(waypoint.id, true);
      toast({
        title: t("waypointDetail.deleteSuccessTitle", { ns: "map" }),
        description: t("waypointDetail.deleteSuccessDescription", {
          ns: "map",
        }),
      });
    } catch {
      toast({
        title: t("waypointDetail.deleteErrorTitle", { ns: "map" }),
        description: t("waypointDetail.deleteErrorDescription", { ns: "map" }),
      });
    }
  };

  const handleEditWaypoint = async (
    waypoint: Protobuf.Mesh.Waypoint,
    channelIndex: number,
    localDisplayWaypoint?: Partial<Protobuf.Mesh.Waypoint>,
  ) => {
    if (!device.connection) {
      throw new Error("No active device connection");
    }

    const previousWaypoint = editingWaypoint;
    const needsReplacement =
      previousWaypoint &&
      waypointNeedsReplacement(previousWaypoint, localDisplayWaypoint);

    if (
      previousWaypoint &&
      (previousWaypoint.metadata.channel !== channelIndex || needsReplacement)
    ) {
      const deleteWaypoint = create(Protobuf.Mesh.WaypointSchema, {
        id: previousWaypoint.id,
        lockedTo: 0,
        name: "",
        description: "",
        icon: 0,
        expire: 1,
      });

      void device.connection
        .sendWaypoint(
          deleteWaypoint,
          "broadcast",
          previousWaypoint.metadata.channel,
        )
        .catch(() => {
          toast({
            title: t("waypointDetail.deleteErrorTitle", { ns: "map" }),
            description: t("waypointDetail.deleteErrorDescription", {
              ns: "map",
            }),
          });
        });
    }

    void device.connection
      .sendWaypoint(waypoint, "broadcast", channelIndex)
      .catch(() => {
        toast({
          title: t("waypointDialog.error.updatedTitle", { ns: "map" }),
          description: t("waypointDialog.error.updatedDescription", {
            ns: "map",
          }),
        });
      });
    const submittedAt = new Date();
    device.addWaypoint(
      waypoint,
      channelIndex,
      myNode?.num ?? device.hardware.myNodeNum ?? 0,
      submittedAt,
    );
    device.setWaypointDisplayOverride(
      waypoint.id,
      localDisplayWaypoint ?? waypoint,
      channelIndex,
      myNode?.num ?? device.hardware.myNodeNum ?? 0,
      submittedAt,
    );
    setEditingWaypoint(undefined);
  };

  const rows: DataRow[] = displayedWaypoints.map((waypoint) => {
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
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs transition hover:bg-slate-800"
                onClick={() => navigate({ to: `/map/${lng}/${lat}/16` })}
              >
                <MapPinnedIcon size={12} />
                <span>Map</span>
              </button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingWaypoint(waypoint)}
              >
                {t("waypointDetail.edit", { ns: "map" })}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleDeleteWaypoint(waypoint)}
              >
                {t("waypointDetail.delete", { ns: "map" })}
              </Button>
            </div>
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
        {displayedWaypoints.length > 0 ? (
          <Table headings={headings} rows={rows} />
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-900/30 px-4 py-6 text-sm text-slate-400">
            {t("layerTool.waypoints", { ns: "map" })}: 0
          </div>
        )}
      </div>
      {editingWaypoint && (
        <WaypointDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingWaypoint(undefined);
            }
          }}
          latitude={toLngLat(editingWaypoint)[1]}
          longitude={toLngLat(editingWaypoint)[0]}
          channels={waypointChannels}
          myNodeNum={myNode?.num ?? device.hardware.myNodeNum}
          initialWaypoint={editingWaypoint}
          onSubmit={handleEditWaypoint}
        />
      )}
    </PageLayout>
  );
};

const WaypointsPage = (): JSX.Element => <WaypointsPageContent />;

export const SplitWaypointsPage = (): JSX.Element => (
  <WaypointsPageContent splitPane />
);

export default WaypointsPage;
