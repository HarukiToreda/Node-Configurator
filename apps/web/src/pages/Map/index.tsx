import { create } from "@bufbuild/protobuf";
import {
  defaultVisibilityState,
  MapLayerTool,
  type VisibilityState,
} from "@app/components/PageComponents/Map/Tools/MapLayerTool.tsx";
import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { WaypointDialog } from "@components/Dialog/WaypointDialog.tsx";
import { BaseMap } from "@components/Map.tsx";
import {
  HeatmapLayer,
  type HeatmapMode,
} from "@components/PageComponents/Map/Layers/HeatmapLayer.tsx";
import { NodesLayer } from "@components/PageComponents/Map/Layers/NodesLayer.tsx";
import { PrecisionLayer } from "@components/PageComponents/Map/Layers/PrecisionLayer.tsx";
import {
  SNRLayer,
  SNRTooltip,
  type SNRTooltipProps,
} from "@components/PageComponents/Map/Layers/SNRLayer.tsx";
import { WaypointLayer } from "@components/PageComponents/Map/Layers/WaypointLayer.tsx";
import type { PopupState } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { waypointNeedsReplacement } from "@components/PageComponents/Map/waypointGeofence.ts";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useMapFitting } from "@core/hooks/useMapFitting.ts";
import { useToast } from "@core/hooks/useToast.ts";
import {
  useMyNodeAsProto,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { useDevice, type WaypointWithMetadata } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { hasPos, toLngLat } from "@core/utils/geo.ts";
import { Protobuf } from "@meshtastic/sdk";
import { numberToHexUnpadded } from "@noble/curves/utils.js";
import { FunnelIcon, LocateFixedIcon } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { type MapLayerMouseEvent, Popup, useMap } from "react-map-gl/maplibre";

interface ContextMenuState {
  latitude: number;
  longitude: number;
}

const MapPageContent = ({ splitPane = false }: { splitPane?: boolean }) => {
  const { t } = useTranslation(["map", "channels"]);
  const { toast } = useToast();
  const allNodes = useNodesAsProto();
  const device = useDevice();
  const getNode = useCallback(
    (n: number) => allNodes.find((node) => node.num === n),
    [allNodes],
  );
  const validNodes = useMemo(
    () =>
      allNodes.filter((n): n is Protobuf.Mesh.NodeInfo =>
        Boolean(n.position?.latitudeI),
      ),
    [allNodes],
  );
  const myNode = useMyNodeAsProto();
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();
  const { default: mapRef } = useMap();
  const { focusLngLat, fitToNodes } = useMapFitting(mapRef);

  const hasFitBoundsOnce = useRef(false);
  const [snrHover, setSnrHover] = useState<SNRTooltipProps>();
  const [expandedCluster, setExpandedCluster] = useState<string | undefined>();
  const [popupState, setPopupState] = useState<PopupState | undefined>();
  const [contextMenuState, setContextMenuState] = useState<
    ContextMenuState | undefined
  >();
  const [editingWaypoint, setEditingWaypoint] = useState<
    WaypointWithMetadata | undefined
  >();
  const [waypointDialogState, setWaypointDialogState] = useState<
    ContextMenuState | undefined
  >();

  const [visibilityState, setVisibilityState] = useState<VisibilityState>(
    () => defaultVisibilityState,
  );
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("density");

  // Filters
  const [filterState, setFilterState] = useState<FilterState>(
    () => defaultFilterValues,
  );
  const deferredFilterState = useDeferredValue(filterState);

  const filteredNodes = useMemo(
    () => validNodes.filter((node) => nodeFilter(node, deferredFilterState)),
    [validNodes, deferredFilterState, nodeFilter],
  );

  // Map fitting
  const getMapBounds = useCallback(() => {
    if (!hasFitBoundsOnce.current) {
      fitToNodes(validNodes);
      hasFitBoundsOnce.current = true;
    }
  }, [fitToNodes, validNodes]);

  // SNR lines
  const snrLayerElementId = useId();
  const snrLayerElement = useMemo(
    () => (
      <SNRLayer
        id={snrLayerElementId}
        filteredNodes={filteredNodes}
        myNode={myNode}
        visibilityState={visibilityState}
      />
    ),
    [filteredNodes, myNode, visibilityState, snrLayerElementId],
  );

  // Heatmap
  const heatmapLayerElementId = useId();
  const heatmapLayerElement = useMemo(
    () => (
      <HeatmapLayer
        id={heatmapLayerElementId}
        filteredNodes={filteredNodes}
        isVisible={visibilityState.heatmap}
        mode={heatmapMode}
      />
    ),
    [
      filteredNodes,
      visibilityState.heatmap,
      heatmapMode,
      heatmapLayerElementId,
    ],
  );

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const {
        features,
        point: { x, y },
      } = event;
      const hoveredFeature = features?.[0];

      if (hoveredFeature) {
        const { from, to, snr, name, shortName, num } =
          hoveredFeature.properties;

        // Handle Heatmap Hover
        if (
          hoveredFeature.layer.id === `${heatmapLayerElementId}-interaction` &&
          name !== undefined
        ) {
          setSnrHover({
            pos: { x, y },
            snr: snr, // Single node SNR
            from:
              name ||
              shortName ||
              t("fallbackName", {
                last4: numberToHexUnpadded(num).slice(-4).toUpperCase(),
              }),
            to: undefined, // Single node
          });
          return;
        }

        // Handle SNR Line Hover
        const fromLong =
          getNode(from)?.user?.longName ??
          t("fallbackName", {
            last4: numberToHexUnpadded(from).slice(-4).toUpperCase(),
          });

        const toLong =
          getNode(to)?.user?.longName ??
          t("fallbackName", {
            last4: numberToHexUnpadded(to).slice(-4).toUpperCase(),
          });

        setSnrHover({ pos: { x, y }, snr, from: fromLong, to: toLong });
      } else {
        setSnrHover(undefined);
      }
    },
    [getNode, t, heatmapLayerElementId],
  );

  // Node markers & clusters
  const onMapBackgroundClick = useCallback(() => {
    setExpandedCluster(undefined);
    setContextMenuState(undefined);
  }, []);

  const onMapContextMenu = useCallback((event: MapLayerMouseEvent) => {
    event.originalEvent.preventDefault();
    setContextMenuState({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
    });
  }, []);

  const markerElements = useMemo(
    () => (
      <NodesLayer
        mapRef={mapRef}
        filteredNodes={filteredNodes}
        myNode={myNode}
        expandedCluster={expandedCluster}
        setExpandedCluster={setExpandedCluster}
        popupState={popupState}
        setPopupState={setPopupState}
        isVisible={visibilityState.nodeMarkers}
      />
    ),
    [
      filteredNodes,
      expandedCluster,
      mapRef,
      myNode,
      popupState,
      visibilityState.nodeMarkers,
    ],
  );

  // Precision circles
  const precisionCirclesElementId = useId();
  const precisionCirclesElement = useMemo(
    () => (
      <PrecisionLayer
        id={precisionCirclesElementId}
        filteredNodes={filteredNodes}
        isVisible={visibilityState.positionPrecision}
      />
    ),
    [
      filteredNodes,
      visibilityState.positionPrecision,
      precisionCirclesElementId,
    ],
  );

  // Waypoints
  const waypointLayerElement = useMemo(
    () => (
      <WaypointLayer
        mapRef={mapRef}
        myNode={myNode}
        isVisible={visibilityState.waypoints}
        popupState={popupState}
        setPopupState={setPopupState}
        onEditWaypoint={(waypoint) => {
          const [longitude, latitude] = toLngLat({
            latitudeI: waypoint.latitudeI,
            longitudeI: waypoint.longitudeI,
          });
          setEditingWaypoint(waypoint);
          setWaypointDialogState({ latitude, longitude });
        }}
        onDeleteWaypoint={async (waypoint) => {
          if (!globalThis.confirm(t("waypointDetail.deleteConfirm"))) {
            return;
          }

          try {
            await device.removeWaypoint(waypoint.id, true);
            setPopupState(undefined);
            toast({
              title: t("waypointDetail.deleteSuccessTitle"),
              description: t("waypointDetail.deleteSuccessDescription"),
            });
          } catch {
            toast({
              title: t("waypointDetail.deleteErrorTitle"),
              description: t("waypointDetail.deleteErrorDescription"),
            });
          }
        }}
      />
    ),
    [device, mapRef, myNode, popupState, t, toast, visibilityState.waypoints],
  );

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

  const handleCreateWaypoint = useCallback(
    async (
      waypoint: Protobuf.Mesh.Waypoint,
      channelIndex: number,
      localDisplayWaypoint?: Partial<Protobuf.Mesh.Waypoint>,
    ) => {
      if (!device.connection) {
        throw new Error("No active device connection");
      }

      void device.connection
        .sendWaypoint(waypoint, "broadcast", channelIndex)
        .catch(() => {
          toast({
            title: t("waypointDialog.error.title"),
            description: t("waypointDialog.error.description"),
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
      setContextMenuState(undefined);
      setWaypointDialogState(undefined);
    },
    [device, myNode?.num, t, toast],
  );

  const handleEditWaypoint = useCallback(
    async (
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
              title: t("waypointDetail.deleteErrorTitle"),
              description: t("waypointDetail.deleteErrorDescription"),
            });
          });
      }

      void device.connection
        .sendWaypoint(waypoint, "broadcast", channelIndex)
        .catch(() => {
          toast({
            title: t("waypointDialog.error.updatedTitle"),
            description: t("waypointDialog.error.updatedDescription"),
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
      setWaypointDialogState(undefined);
      setPopupState({ type: "waypoint", waypointId: waypoint.id });
    },
    [device, editingWaypoint, myNode?.num, t, toast],
  );

  return (
    <PageLayout
      label={splitPane ? "" : "Map"}
      noPadding
      actions={[]}
      leftBar={splitPane ? undefined : <Sidebar />}
      hideFooter={splitPane}
    >
      <div className="relative min-h-0 flex-1">
        <BaseMap
          onLoad={getMapBounds}
          onMouseMove={onMouseMove}
          onClick={onMapBackgroundClick}
          onContextMenu={onMapContextMenu}
          interactiveLayerIds={[
            snrLayerElementId,
            `${heatmapLayerElementId}-interaction`,
          ]}
        >
          {heatmapLayerElement}
          {markerElements}
          {snrLayerElement}
          {precisionCirclesElement}
          {waypointLayerElement}

          {contextMenuState && (
            <Popup
              anchor="top"
              longitude={contextMenuState.longitude}
              latitude={contextMenuState.latitude}
              closeButton={false}
              closeOnClick={false}
              onClose={() => setContextMenuState(undefined)}
              offset={16}
            >
              <div className="min-w-36 p-1">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setEditingWaypoint(undefined);
                    setWaypointDialogState({
                      latitude: contextMenuState.latitude,
                      longitude: contextMenuState.longitude,
                    });
                  }}
                >
                  {t("mapContextMenu.dropWaypoint")}
                </Button>
              </div>
            </Popup>
          )}

          {snrHover && (
            <SNRTooltip
              pos={snrHover.pos}
              snr={snrHover.snr}
              from={snrHover.from}
              to={snrHover.to}
            />
          )}
        </BaseMap>
        <div
          className={cn(
            "flex flex-col space-y-1 top-21 right-2.5",
            splitPane ? "absolute" : "fixed",
          )}
        >
          {myNode && hasPos(myNode?.position) && (
            <button
              type="button"
              className={cn(
                "rounded align-center",
                "w-[29px] px-1 py-1 shadow-l outline-[2px] outline-stone-600/20",
                "bg-stone-50 hover:bg-stone-200 dark:bg-stone-200 dark:hover:bg-stone-300 ",
                "text-slate-600 hover:text-slate-700",
                "dark:text-slate-600 hover:dark:text-slate-700",
              )}
              aria-label={t("mapMenu.locateAria")}
              onClick={() => focusLngLat(toLngLat(myNode.position))}
            >
              <LocateFixedIcon className="w-[21px]" />
            </button>
          )}

          <FilterControl
            filterState={filterState}
            defaultFilterValues={defaultFilterValues}
            setFilterState={setFilterState}
            isDirty={isFilterDirty(filterState)}
            parameters={{
              popoverContentProps: {
                side: "bottom",
                align: "end",
                sideOffset: 7,
              },
              popoverTriggerClassName: cn(
                "w-[29px] px-1 py-1 rounded shadow-l outline-[2px] outline-stone-600/20 ",
                "dark:text-slate-600 dark:hover:text-slate-700 bg-stone-50 hover:bg-stone-200 dark:bg-stone-200 dark:hover:bg-stone-300 dark:active:bg-stone-300",
                isFilterDirty(filterState)
                  ? "text-slate-100 dark:text-slate-100 bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-700 hover:text-slate-200 dark:hover:text-slate-200 active:bg-green-800 dark:active:bg-green-800 outline-green-600 dark:outline-green-700"
                  : "",
              ),
              triggerIcon: <FunnelIcon className="w-[21px]" />,
              showTextSearch: true,
            }}
          />

          <MapLayerTool
            visibilityState={visibilityState}
            setVisibilityState={setVisibilityState}
            heatmapMode={heatmapMode}
            setHeatmapMode={setHeatmapMode}
          />
        </div>
        {waypointDialogState && (
          <WaypointDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setEditingWaypoint(undefined);
                setWaypointDialogState(undefined);
                setContextMenuState(undefined);
              }
            }}
            latitude={waypointDialogState.latitude}
            longitude={waypointDialogState.longitude}
            channels={waypointChannels}
            myNodeNum={myNode?.num ?? device.hardware.myNodeNum}
            initialWaypoint={editingWaypoint}
            onSubmit={
              editingWaypoint ? handleEditWaypoint : handleCreateWaypoint
            }
          />
        )}
      </div>
    </PageLayout>
  );
};

const MapPage = () => <MapPageContent />;

export const SplitMapPage = () => <MapPageContent splitPane />;

export default MapPage;
