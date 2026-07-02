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
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useMapFitting } from "@core/hooks/useMapFitting.ts";
import {
  useMyNodeAsProto,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { useDevice } from "@core/stores";
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
  const [waypointDialogOpen, setWaypointDialogOpen] = useState(false);

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
      />
    ),
    [mapRef, myNode, visibilityState.waypoints, popupState],
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
    async (waypoint: Protobuf.Mesh.Waypoint, channelIndex: number) => {
      if (!device.connection) {
        throw new Error("No active device connection");
      }

      await device.connection.sendWaypoint(waypoint, "broadcast", channelIndex);
      device.addWaypoint(
        waypoint,
        channelIndex,
        myNode?.num ?? device.hardware.myNodeNum ?? 0,
        new Date(),
      );
      setContextMenuState(undefined);
      setWaypointDialogOpen(false);
    },
    [device, myNode?.num],
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
                    setWaypointDialogOpen(true);
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
        {contextMenuState && (
          <WaypointDialog
            open={waypointDialogOpen}
            onOpenChange={(open) => {
              setWaypointDialogOpen(open);
              if (!open) {
                setContextMenuState(undefined);
              }
            }}
            latitude={contextMenuState.latitude}
            longitude={contextMenuState.longitude}
            channels={waypointChannels}
            myNodeNum={myNode?.num ?? device.hardware.myNodeNum}
            onSubmit={handleCreateWaypoint}
          />
        )}
      </div>
    </PageLayout>
  );
};

const MapPage = () => <MapPageContent />;

export const SplitMapPage = () => <MapPageContent splitPane />;

export default MapPage;
