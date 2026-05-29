import {
  type DragEvent as ReactDragEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import {
  GRID_SIZE,
  BUILDING_TYPES,
  type Building,
  type BuildingType,
  type ConnectionEndpoint,
  type PortSide,
} from "../types";
import { useFactoryStore } from "../store/factoryStore";
import {
  formatRate,
  getPortAtEndpoint,
  getPositionedPorts,
  type PositionedPort,
} from "../factoryPorts";
import { getRecipeByClassName } from "../data/satisfactoryData";
import { buildingToolByType } from "../buildingCatalog";
import { getMineableResource } from "../miningData";
import { analyzeFactory } from "../factoryValidation";

const palette: Record<BuildingType, { fill: string; stroke: string }> = {
  Miner: {
    fill: "#b45309",
    stroke: "#f59e0b",
  },
  Smelter: {
    fill: "#7c2d12",
    stroke: "#fb923c",
  },
  Constructor: {
    fill: "#0f766e",
    stroke: "#2dd4bf",
  },
  Assembler: {
    fill: "#1d4ed8",
    stroke: "#60a5fa",
  },
  Foundry: {
    fill: "#7f1d1d",
    stroke: "#f87171",
  },
  Manufacturer: {
    fill: "#4c1d95",
    stroke: "#a78bfa",
  },
  Refinery: {
    fill: "#155e75",
    stroke: "#67e8f9",
  },
  Packager: {
    fill: "#166534",
    stroke: "#86efac",
  },
  Blender: {
    fill: "#854d0e",
    stroke: "#fbbf24",
  },
  "Particle Accelerator": {
    fill: "#581c87",
    stroke: "#d8b4fe",
  },
  Converter: {
    fill: "#365314",
    stroke: "#bef264",
  },
  "Quantum Encoder": {
    fill: "#312e81",
    stroke: "#a5b4fc",
  },
  "Nuclear Power Plant": {
    fill: "#14532d",
    stroke: "#4ade80",
  },
  Splitter: {
    fill: "#57534e",
    stroke: "#d6d3d1",
  },
  Merger: {
    fill: "#44403c",
    stroke: "#fbbf24",
  },
  Storage: {
    fill: "#334155",
    stroke: "#94a3b8",
  },
};

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
const WORLD_SIZE = 131_072;
const PAN_THRESHOLD = 5;
const RENDER_MARGIN = 768;

type Camera = {
  x: number;
  y: number;
};

type BeltDraft = {
  from: ConnectionEndpoint;
  fromPort: PositionedPort;
  pointer: { x: number; y: number };
  hasMoved: boolean;
};

type PanStart = {
  pointer: { x: number; y: number };
  camera: Camera;
  hasMoved: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampCamera = (camera: Camera, viewport: { width: number; height: number }) => ({
  x: clamp(camera.x, Math.min(0, viewport.width - WORLD_SIZE), 0),
  y: clamp(camera.y, Math.min(0, viewport.height - WORLD_SIZE), 0),
});

const screenToWorld = (point: { x: number; y: number }, camera: Camera) => ({
  x: point.x - camera.x,
  y: point.y - camera.y,
});

const rectsIntersect = (
  first: { left: number; top: number; right: number; bottom: number },
  second: { left: number; top: number; right: number; bottom: number },
) =>
  first.left <= second.right &&
  first.right >= second.left &&
  first.top <= second.bottom &&
  first.bottom >= second.top;

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

export function FactoryCanvas() {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const buildings = useFactoryStore((state) => state.buildings);
  const connections = useFactoryStore((state) => state.connections);
  const selectedTool = useFactoryStore((state) => state.selectedTool);
  const selectedBuildingIds = useFactoryStore((state) => state.selectedBuildingIds);
  const pendingConnection = useFactoryStore((state) => state.pendingConnection);
  const setSelectedBuilding = useFactoryStore((state) => state.setSelectedBuilding);
  const placeBuilding = useFactoryStore((state) => state.placeBuilding);
  const moveBuilding = useFactoryStore((state) => state.moveBuilding);
  const startConnection = useFactoryStore((state) => state.startConnection);
  const finishConnection = useFactoryStore((state) => state.finishConnection);
  const cancelConnection = useFactoryStore((state) => state.cancelConnection);
  const removeConnection = useFactoryStore((state) => state.removeConnection);
  const [beltDraft, setBeltDraft] = useState<BeltDraft | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<PanStart | null>(null);
  const pendingCameraRef = useRef<Camera | null>(null);
  const cameraFrameRef = useRef<number | null>(null);
  const isPanningRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const factoryIssues = useMemo(
    () => analyzeFactory(buildings, connections),
    [buildings, connections],
  );
  const primaryIssue = factoryIssues[0] ?? null;

  const visibleLeft = Math.max(0, -camera.x);
  const visibleTop = Math.max(0, -camera.y);
  const visibleRight = Math.min(WORLD_SIZE, -camera.x + size.width);
  const visibleBottom = Math.min(WORLD_SIZE, -camera.y + size.height);
  const firstGridX = Math.floor(visibleLeft / GRID_SIZE) * GRID_SIZE;
  const firstGridY = Math.floor(visibleTop / GRID_SIZE) * GRID_SIZE;
  const renderBounds = {
    left: Math.max(0, visibleLeft - RENDER_MARGIN),
    top: Math.max(0, visibleTop - RENDER_MARGIN),
    right: Math.min(WORLD_SIZE, visibleRight + RENDER_MARGIN),
    bottom: Math.min(WORLD_SIZE, visibleBottom + RENDER_MARGIN),
  };
  const visibleBuildings = buildings.filter((building) =>
    rectsIntersect(renderBounds, {
      left: building.x,
      top: building.y,
      right: building.x + building.width,
      bottom: building.y + building.height,
    }),
  );
  const { verticalLines, horizontalLines } = useMemo(() => {
    const nextVerticalLines = [];
    const nextHorizontalLines = [];

    for (let x = firstGridX; x <= visibleRight; x += GRID_SIZE) {
      nextVerticalLines.push(
        <Line
          key={`v-${x}`}
          points={[x, visibleTop, x, visibleBottom]}
          stroke={
            x % (GRID_SIZE * 8) === 0
              ? "rgba(148, 163, 184, 0.28)"
              : "rgba(148, 163, 184, 0.14)"
          }
          strokeWidth={1}
          listening={false}
          perfectDrawEnabled={false}
        />,
      );
    }

    for (let y = firstGridY; y <= visibleBottom; y += GRID_SIZE) {
      nextHorizontalLines.push(
        <Line
          key={`h-${y}`}
          points={[visibleLeft, y, visibleRight, y]}
          stroke={
            y % (GRID_SIZE * 8) === 0
              ? "rgba(148, 163, 184, 0.28)"
              : "rgba(148, 163, 184, 0.14)"
          }
          strokeWidth={1}
          listening={false}
          perfectDrawEnabled={false}
        />,
      );
    }

    return {
      verticalLines: nextVerticalLines,
      horizontalLines: nextHorizontalLines,
    };
  }, [
    firstGridX,
    firstGridY,
    visibleBottom,
    visibleLeft,
    visibleRight,
    visibleTop,
  ]);

  useEffect(
    () => () => {
      if (cameraFrameRef.current !== null) {
        window.cancelAnimationFrame(cameraFrameRef.current);
      }
    },
    [],
  );

  const scheduleCameraUpdate = (nextCamera: Camera) => {
    pendingCameraRef.current = nextCamera;

    if (cameraFrameRef.current !== null) {
      return;
    }

    cameraFrameRef.current = window.requestAnimationFrame(() => {
      cameraFrameRef.current = null;
      const cameraToApply = pendingCameraRef.current;
      pendingCameraRef.current = null;

      if (cameraToApply) {
        setCamera(cameraToApply);
      }
    });
  };

  const handleStageClick = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();

    if (!pointer) {
      return;
    }

    const worldPointer = screenToWorld(pointer, camera);

    if (selectedTool) {
      placeBuilding(selectedTool, worldPointer.x, worldPointer.y);
      return;
    }

    if (pendingConnection) {
      cancelConnection();
      return;
    }

    setSelectedBuilding(null);
  };

  const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    const clickedEmptyCanvas =
      event.target === stage || event.target.name() === "canvas-background";

    if (!pointer || !clickedEmptyCanvas) {
      return;
    }

    panStartRef.current = {
      pointer,
      camera,
      hasMoved: false,
    };
  };

  const updateBeltDraftPointer = (stage: Konva.Stage | null) => {
    const pointer = stage?.getPointerPosition();

    if (!pointer) {
      return;
    }

    const worldPointer = screenToWorld(pointer, camera);

    setBeltDraft((draft) =>
      draft
        ? {
            ...draft,
            pointer: worldPointer,
            hasMoved:
              draft.hasMoved ||
              Math.hypot(
                worldPointer.x - draft.fromPort.x,
                worldPointer.y - draft.fromPort.y,
              ) > 6,
          }
        : draft,
    );
  };

  const handleStageMouseMove = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const panStart = panStartRef.current;
    const pointer = event.target.getStage()?.getPointerPosition();

    if (panStart && pointer) {
      const deltaX = pointer.x - panStart.pointer.x;
      const deltaY = pointer.y - panStart.pointer.y;
      const hasMoved =
        panStart.hasMoved || Math.hypot(deltaX, deltaY) > PAN_THRESHOLD;

      if (hasMoved) {
        panStartRef.current = {
          ...panStart,
          hasMoved: true,
        };
        if (!isPanningRef.current) {
          isPanningRef.current = true;
          setIsPanning(true);
        }

        scheduleCameraUpdate(
          clampCamera(
            {
              x: panStart.camera.x + deltaX,
              y: panStart.camera.y + deltaY,
            },
            size,
          ),
        );
      }
    }

    if (beltDraft) {
      updateBeltDraftPointer(event.target.getStage());
    }
  };

  const handleStageMouseUp = () => {
    if (panStartRef.current?.hasMoved) {
      suppressNextClickRef.current = true;
    }

    panStartRef.current = null;
    isPanningRef.current = false;
    setIsPanning(false);

    if (beltDraft?.hasMoved) {
      cancelConnection();
      setBeltDraft(null);
    }
  };

  const handleStageMouseLeave = () => {
    panStartRef.current = null;
    isPanningRef.current = false;
    setIsPanning(false);
  };

  const handleCanvasDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("application/x-satisplanner-building")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleCanvasDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const buildingType = event.dataTransfer.getData(
      "application/x-satisplanner-building",
    ) as BuildingType;

    if (
      !ref.current ||
      !BUILDING_TYPES.includes(buildingType as (typeof BUILDING_TYPES)[number])
    ) {
      return;
    }

    event.preventDefault();
    const bounds = ref.current.getBoundingClientRect();
    placeBuilding(
      buildingType,
      event.clientX - bounds.left - camera.x,
      event.clientY - bounds.top - camera.y,
    );
  };

  const handlePortClick = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    buildingId: string,
    side: PortSide,
    port: PositionedPort,
  ) => {
    event.cancelBubble = true;

    if (beltDraft?.hasMoved) {
      return;
    }

    if (side === "output") {
      setSelectedBuilding(buildingId);
      startConnection({
        buildingId,
        itemClassName: port.itemClassName,
        portId: port.id,
      });
      return;
    }

    if (pendingConnection) {
      finishConnection({
        buildingId,
        itemClassName: port.itemClassName,
        portId: port.id,
      });
      setSelectedBuilding(buildingId);
    }
  };

  const handlePortMouseDown = (
    event: Konva.KonvaEventObject<MouseEvent>,
    buildingId: string,
    side: PortSide,
    port: PositionedPort,
  ) => {
    if (side !== "output") {
      return;
    }

    event.cancelBubble = true;
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    const worldPointer = pointer ? screenToWorld(pointer, camera) : port;
    const endpoint = {
      buildingId,
      itemClassName: port.itemClassName,
      portId: port.id,
    };

    setSelectedBuilding(buildingId);
    startConnection(endpoint);
    setBeltDraft({
      from: endpoint,
      fromPort: port,
      pointer: worldPointer,
      hasMoved: false,
    });
  };

  const handlePortMouseUp = (
    event: Konva.KonvaEventObject<MouseEvent>,
    buildingId: string,
    side: PortSide,
    port: PositionedPort,
  ) => {
    if (side !== "input" || !beltDraft) {
      return;
    }

    event.cancelBubble = true;
    finishConnection({
      buildingId,
      itemClassName: port.itemClassName,
      portId: port.id,
    });
    setSelectedBuilding(buildingId);
    setBeltDraft(null);
  };

  return (
    <section
      ref={ref}
      className={`relative h-full min-w-0 bg-slate-950 ${
        isPanning ? "cursor-grabbing" : selectedTool ? "cursor-crosshair" : "cursor-grab"
      }`}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-300 shadow-lg">
        {selectedTool
          ? `${selectedTool}: click to place, drag empty grid to pan`
          : "Drag empty grid to pan. Select or drag placed machines."}
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-slate-800 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-400 shadow-lg">
        World {Math.round(visibleLeft)}:{Math.round(visibleTop)} / {WORLD_SIZE}px
      </div>
      {primaryIssue ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-md border border-amber-300 bg-amber-300 px-4 py-3 text-sm text-slate-950 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold">{primaryIssue.title}</p>
              <p className="mt-1 leading-5">{primaryIssue.message}</p>
            </div>
            {factoryIssues.length > 1 ? (
              <span className="shrink-0 rounded bg-slate-950/10 px-2 py-1 text-xs font-semibold">
                +{factoryIssues.length - 1}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <Stage
        width={size.width}
        height={size.height}
        onClick={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseLeave}
      >
        <Layer x={camera.x} y={camera.y}>
          <Rect
            name="canvas-background"
            x={visibleLeft}
            y={visibleTop}
            width={size.width}
            height={size.height}
            fill="#0f172a"
          />
          {verticalLines}
          {horizontalLines}
        </Layer>

        <Layer x={camera.x} y={camera.y}>
          {connections.map((connection) => {
            const from = getPortAtEndpoint(
              buildings,
              connection.from.buildingId,
              "output",
              connection.from.itemClassName,
              connection.from.portId,
            );
            const to = getPortAtEndpoint(
              buildings,
              connection.to.buildingId,
              "input",
              connection.to.itemClassName,
              connection.to.portId,
            );

            if (!from || !to) {
              return null;
            }

            const middleX = (from.x + to.x) / 2;
            const beltBounds = {
              left: Math.min(from.x, to.x),
              top: Math.min(from.y, to.y),
              right: Math.max(from.x, to.x),
              bottom: Math.max(from.y, to.y),
            };

            if (!rectsIntersect(renderBounds, beltBounds)) {
              return null;
            }

            const points = [
              from.x,
              from.y,
              middleX,
              from.y,
              middleX,
              to.y,
              to.x,
              to.y,
            ];

            return (
              <Group
                key={connection.id}
                onClick={(event) => {
                  event.cancelBubble = true;
                }}
                onDblClick={() => removeConnection(connection.id)}
              >
                <Line
                  points={points}
                  stroke="#f59e0b"
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                  perfectDrawEnabled={false}
                />
                <Text
                  x={middleX - 72}
                  y={(from.y + to.y) / 2 - 34}
                  width={144}
                  height={22}
                  align="center"
                  verticalAlign="middle"
                  text={`${from.itemName} ${formatRate(from.ratePerMinute, from.form)}`}
                  fill="#fde68a"
                  fontSize={11}
                  listening={false}
                />
              </Group>
            );
          })}
          {beltDraft ? (
            <Line
              points={[
                beltDraft.fromPort.x,
                beltDraft.fromPort.y,
                (beltDraft.fromPort.x + beltDraft.pointer.x) / 2,
                beltDraft.fromPort.y,
                (beltDraft.fromPort.x + beltDraft.pointer.x) / 2,
                beltDraft.pointer.y,
                beltDraft.pointer.x,
                beltDraft.pointer.y,
              ]}
              stroke="#facc15"
              strokeWidth={3}
              dash={[8, 8]}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          ) : null}
        </Layer>

        <Layer x={camera.x} y={camera.y}>
          {visibleBuildings.map((building) => {
            const colors = palette[building.type];
            const isSelected = selectedBuildingIds.includes(building.id);
            const recipe = getRecipeByClassName(building.recipeClassName);
            const minedResource = getMineableResource(building.extractionItemClassName);

            return (
              <GroupBuilding
                key={building.id}
                building={building}
                label={buildingToolByType.get(building.type)?.label ?? building.type}
                recipeName={recipe?.name ?? minedResource?.name ?? null}
                fill={colors.fill}
                stroke={isSelected ? "#facc15" : colors.stroke}
                strokeWidth={isSelected ? 4 : 2}
                isSelected={isSelected}
                onSelect={setSelectedBuilding}
                onMove={moveBuilding}
              />
            );
          })}
        </Layer>

        <Layer x={camera.x} y={camera.y}>
          {visibleBuildings.flatMap((building) =>
            getPositionedPorts(building).map((port) => {
              const isPending =
                pendingConnection?.buildingId === building.id &&
                (pendingConnection.portId === port.id ||
                  (!pendingConnection.portId &&
                    pendingConnection.itemClassName === port.itemClassName)) &&
                port.side === "output";
              const canFinish =
                pendingConnection !== null &&
                port.side === "input" &&
                pendingConnection.buildingId !== building.id &&
                (port.itemClassName === "*" ||
                  pendingConnection.itemClassName === "*" ||
                  pendingConnection.itemClassName === port.itemClassName);

              return (
                <PortNode
                  key={`${building.id}-${port.id}`}
                  buildingId={building.id}
                  port={port}
                  isPending={isPending}
                  canFinish={canFinish}
                  onPortClick={handlePortClick}
                  onPortMouseDown={handlePortMouseDown}
                  onPortMouseUp={handlePortMouseUp}
                />
              );
            }),
          )}
        </Layer>
      </Stage>
    </section>
  );
}

type GroupBuildingProps = {
  building: Building;
  label: string;
  recipeName: string | null;
  fill: string;
  stroke: string;
  strokeWidth: number;
  isSelected: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onMove: (id: string, x: number, y: number, snapToGrid?: boolean) => void;
};

const GroupBuilding = memo(function GroupBuilding({
  building,
  label,
  recipeName,
  fill,
  stroke,
  strokeWidth,
  isSelected,
  onSelect,
  onMove,
}: GroupBuildingProps) {
  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    const node = event.target;
    onMove(building.id, node.x(), node.y(), true);
    node.position({
      x: snap(node.x()),
      y: snap(node.y()),
    });
  };

  return (
    <Group
      x={building.x}
      y={building.y}
      draggable
      onClick={(event) => {
        event.cancelBubble = true;
        onSelect(building.id, event.evt.ctrlKey || event.evt.metaKey);
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onSelect(building.id);
      }}
      onDragStart={() => {
        if (!isSelected) {
          onSelect(building.id);
        }
      }}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={0}
        y={0}
        width={building.width}
        height={building.height}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        cornerRadius={4}
        perfectDrawEnabled={false}
      />
      <Text
        x={0}
        y={building.height / 2 - (recipeName ? 20 : 9)}
        width={building.width}
        height={18}
        text={label}
        fill="#f8fafc"
        fontSize={13}
        fontStyle="bold"
        align="center"
        listening={false}
      />
      {recipeName ? (
        <Text
          x={8}
          y={building.height / 2 + 2}
          width={building.width - 16}
          height={18}
          text={recipeName}
          fill="#cbd5e1"
          fontSize={11}
          align="center"
          ellipsis
          listening={false}
        />
      ) : (
        <Text
          x={8}
          y={building.height / 2 + 4}
          width={building.width - 16}
          height={18}
          text={getBuildingSubtitle(building.type)}
          fill="#94a3b8"
          fontSize={11}
          align="center"
          ellipsis
          listening={false}
        />
      )}
    </Group>
  );
});

const getBuildingSubtitle = (type: BuildingType) => {
  if (type === "Storage") {
    return "buffer";
  }

  if (type === "Splitter") {
    return "1 in / 3 out";
  }

  if (type === "Merger") {
    return "3 in / 1 out";
  }

  return "assign recipe";
};

type PortNodeProps = {
  buildingId: string;
  port: PositionedPort;
  isPending: boolean;
  canFinish: boolean;
  onPortClick: (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    buildingId: string,
    side: PortSide,
    port: PositionedPort,
  ) => void;
  onPortMouseDown: (
    event: Konva.KonvaEventObject<MouseEvent>,
    buildingId: string,
    side: PortSide,
    port: PositionedPort,
  ) => void;
  onPortMouseUp: (
    event: Konva.KonvaEventObject<MouseEvent>,
    buildingId: string,
    side: PortSide,
    port: PositionedPort,
  ) => void;
};

function PortNode({
  buildingId,
  port,
  isPending,
  canFinish,
  onPortClick,
  onPortMouseDown,
  onPortMouseUp,
}: PortNodeProps) {
  const isOutput = port.side === "output";
  const labelX = isOutput ? port.x + 12 : port.x - 126;
  const labelAlign = isOutput ? "left" : "right";
  const fill = isPending ? "#facc15" : canFinish ? "#22c55e" : "#0f172a";
  const stroke = isOutput ? "#f59e0b" : "#38bdf8";

  return (
    <Group
      onClick={(event) => onPortClick(event, buildingId, port.side, port)}
      onTap={(event) => onPortClick(event, buildingId, port.side, port)}
      onMouseDown={(event) =>
        onPortMouseDown(event, buildingId, port.side, port)
      }
      onMouseUp={(event) => onPortMouseUp(event, buildingId, port.side, port)}
    >
      <Circle
        x={port.x}
        y={port.y}
        radius={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={3}
        perfectDrawEnabled={false}
      />
      <Text
        x={labelX}
        y={port.y - 36}
        width={114}
        height={24}
        align={labelAlign}
        verticalAlign="middle"
        text={`${port.itemName} ${formatRate(port.ratePerMinute, port.form)}`}
        fill="#cbd5e1"
        fontSize={10}
        listening={false}
      />
    </Group>
  );
}
