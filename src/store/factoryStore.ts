import { nanoid } from "nanoid";
import { create } from "zustand";
import {
  type Building,
  type BuildingConnection,
  type BuildingType,
  type ConnectionEndpoint,
  GRID_SIZE,
} from "../types";

const STORAGE_KEY = "satis-planner-design";

const buildingDefaults: Record<BuildingType, Pick<Building, "width" | "height">> = {
  Miner: { width: 96, height: 64 },
  Smelter: { width: 96, height: 96 },
  Constructor: { width: 128, height: 96 },
  Assembler: { width: 144, height: 112 },
  Foundry: { width: 128, height: 112 },
  Manufacturer: { width: 176, height: 144 },
  Refinery: { width: 160, height: 128 },
  Packager: { width: 128, height: 96 },
  Blender: { width: 176, height: 144 },
  "Particle Accelerator": { width: 192, height: 160 },
  Converter: { width: 144, height: 112 },
  "Quantum Encoder": { width: 192, height: 160 },
  "Nuclear Power Plant": { width: 192, height: 160 },
  Splitter: { width: 80, height: 80 },
  Merger: { width: 80, height: 80 },
  Storage: { width: 96, height: 128 },
};

export type SavedDesign = {
  version: 1;
  exportedAt?: string;
  buildings: Building[];
  connections: BuildingConnection[];
};

type FactoryClipboard = {
  buildings: Building[];
  connections: BuildingConnection[];
  pasteCount: number;
};

type FactoryState = {
  buildings: Building[];
  connections: BuildingConnection[];
  selectedTool: BuildingType | null;
  selectedBuildingId: string | null;
  selectedBuildingIds: string[];
  pendingConnection: ConnectionEndpoint | null;
  clipboard: FactoryClipboard | null;
  setSelectedTool: (tool: BuildingType | null) => void;
  setSelectedBuilding: (id: string | null, additive?: boolean) => void;
  placeBuilding: (type: BuildingType, x: number, y: number) => void;
  moveBuilding: (id: string, x: number, y: number, snapToGrid?: boolean) => void;
  setBuildingRecipe: (id: string, recipeClassName: string | null) => void;
  startConnection: (endpoint: ConnectionEndpoint) => void;
  finishConnection: (endpoint: ConnectionEndpoint) => void;
  cancelConnection: () => void;
  removeConnection: (id: string) => void;
  setMinerResource: (
    id: string,
    itemClassName: string | null,
    purity?: Building["extractionPurity"],
  ) => void;
  deleteSelectedBuildings: () => void;
  copySelectedBuildings: () => void;
  pasteCopiedBuildings: () => void;
  getDesignSnapshot: () => SavedDesign;
  importDesign: (design: unknown) => boolean;
  clearDesign: () => void;
  saveDesign: () => void;
  loadDesign: () => void;
};

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
const PASTE_OFFSET = GRID_SIZE * 2;

const endpointsMatch = (
  first: ConnectionEndpoint,
  second: ConnectionEndpoint,
) =>
  first.buildingId === second.buildingId &&
  (first.portId && second.portId
    ? first.portId === second.portId
    : first.itemClassName === second.itemClassName);

const readSavedDesign = (): SavedDesign | null => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeDesign(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
};

const normalizeDesign = (design: unknown): SavedDesign | null => {
  if (!design || typeof design !== "object") {
    return null;
  }

  const candidate = design as Partial<SavedDesign>;

  if (!Array.isArray(candidate.buildings)) {
    return null;
  }

  return {
    version: 1,
    exportedAt:
      typeof candidate.exportedAt === "string" ? candidate.exportedAt : undefined,
    buildings: candidate.buildings,
    connections: Array.isArray(candidate.connections) ? candidate.connections : [],
  };
};

const createDesignSnapshot = (
  buildings: Building[],
  connections: BuildingConnection[],
): SavedDesign => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  buildings,
  connections,
});

export const useFactoryStore = create<FactoryState>((set, get) => ({
  buildings: readSavedDesign()?.buildings ?? [],
  connections: readSavedDesign()?.connections ?? [],
  selectedTool: null,
  selectedBuildingId: null,
  selectedBuildingIds: [],
  pendingConnection: null,
  clipboard: null,

  setSelectedTool: (tool) =>
    set({
      selectedTool: tool,
      selectedBuildingId: null,
      selectedBuildingIds: [],
      pendingConnection: null,
    }),

  setSelectedBuilding: (id, additive = false) =>
    set((state) => {
      if (!id) {
        return {
          selectedBuildingId: null,
          selectedBuildingIds: [],
          selectedTool: null,
          pendingConnection: null,
        };
      }

      if (!additive) {
        return {
          selectedBuildingId: id,
          selectedBuildingIds: [id],
          selectedTool: null,
          pendingConnection: null,
        };
      }

      const isAlreadySelected = state.selectedBuildingIds.includes(id);
      const selectedBuildingIds = isAlreadySelected
        ? state.selectedBuildingIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedBuildingIds, id];

      return {
        selectedBuildingId:
          selectedBuildingIds[selectedBuildingIds.length - 1] ?? null,
        selectedBuildingIds,
        selectedTool: null,
        pendingConnection: null,
      };
    }),

  placeBuilding: (type, x, y) => {
    const building: Building = {
      id: nanoid(),
      type,
      x: snap(x),
      y: snap(y),
      recipeClassName: null,
      extractionItemClassName: null,
      extractionPurity: type === "Miner" ? "Normal" : undefined,
      ...buildingDefaults[type],
    };

    set((state) => ({
      buildings: [...state.buildings, building],
      selectedBuildingId: building.id,
      selectedBuildingIds: [building.id],
      pendingConnection: null,
    }));
  },

  moveBuilding: (id, x, y, snapToGrid = true) =>
    set((state) => {
      const draggedBuilding = state.buildings.find((building) => building.id === id);

      if (!draggedBuilding) {
        return state;
      }

      const targetX = snapToGrid ? snap(x) : x;
      const targetY = snapToGrid ? snap(y) : y;
      const selectedBuildingIds = state.selectedBuildingIds.includes(id)
        ? state.selectedBuildingIds
        : [id];
      const deltaX = targetX - draggedBuilding.x;
      const deltaY = targetY - draggedBuilding.y;

      return {
        buildings: state.buildings.map((building) =>
          selectedBuildingIds.includes(building.id)
            ? {
                ...building,
                x: building.x + deltaX,
                y: building.y + deltaY,
              }
            : building,
        ),
      };
    }),

  setBuildingRecipe: (id, recipeClassName) =>
    set((state) => ({
      buildings: state.buildings.map((building) =>
        building.id === id ? { ...building, recipeClassName } : building,
      ),
      connections: state.connections.filter(
        (connection) =>
          connection.from.buildingId !== id && connection.to.buildingId !== id,
      ),
      pendingConnection:
        state.pendingConnection?.buildingId === id ? null : state.pendingConnection,
    })),

  startConnection: (endpoint) =>
    set({
      pendingConnection: endpoint,
      selectedTool: null,
    }),

  finishConnection: (endpoint) => {
    const pendingConnection = get().pendingConnection;

    if (!pendingConnection || pendingConnection.buildingId === endpoint.buildingId) {
      set({ pendingConnection: null });
      return;
    }

    const itemMatches =
      endpoint.itemClassName === "*" ||
      pendingConnection.itemClassName === "*" ||
      pendingConnection.itemClassName === endpoint.itemClassName;

    if (!itemMatches) {
      set({ pendingConnection: null });
      return;
    }

    set((state) => ({
      connections: [
        ...state.connections.filter(
          (connection) =>
            !(
              endpointsMatch(connection.from, pendingConnection) &&
              endpointsMatch(connection.to, endpoint)
            ),
        ),
        {
          id: nanoid(),
          from: pendingConnection,
          to: endpoint,
        },
      ],
      pendingConnection: null,
    }));
  },

  cancelConnection: () => set({ pendingConnection: null }),

  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((connection) => connection.id !== id),
    })),

  setMinerResource: (id, itemClassName, purity) =>
    set((state) => ({
      buildings: state.buildings.map((building) =>
        building.id === id
          ? {
              ...building,
              extractionItemClassName: itemClassName,
              extractionPurity: purity ?? building.extractionPurity ?? "Normal",
            }
          : building,
      ),
      connections: state.connections.filter(
        (connection) =>
          connection.from.buildingId !== id && connection.to.buildingId !== id,
      ),
      pendingConnection:
        state.pendingConnection?.buildingId === id ? null : state.pendingConnection,
    })),

  deleteSelectedBuildings: () =>
    set((state) => {
      if (state.selectedBuildingIds.length === 0) {
        return state;
      }

      const selectedBuildingIds = new Set(state.selectedBuildingIds);

      return {
        buildings: state.buildings.filter(
          (building) => !selectedBuildingIds.has(building.id),
        ),
        connections: state.connections.filter(
          (connection) =>
            !selectedBuildingIds.has(connection.from.buildingId) &&
            !selectedBuildingIds.has(connection.to.buildingId),
        ),
        selectedBuildingId: null,
        selectedBuildingIds: [],
        pendingConnection: null,
      };
    }),

  copySelectedBuildings: () =>
    set((state) => {
      if (state.selectedBuildingIds.length === 0) {
        return state;
      }

      const selectedBuildingIds = new Set(state.selectedBuildingIds);
      const copiedBuildings = state.buildings
        .filter((building) => selectedBuildingIds.has(building.id))
        .map((building) => ({ ...building }));
      const copiedConnections = state.connections
        .filter(
          (connection) =>
            selectedBuildingIds.has(connection.from.buildingId) &&
            selectedBuildingIds.has(connection.to.buildingId),
        )
        .map((connection) => ({
          ...connection,
          from: { ...connection.from },
          to: { ...connection.to },
        }));

      return {
        clipboard: {
          buildings: copiedBuildings,
          connections: copiedConnections,
          pasteCount: 0,
        },
      };
    }),

  pasteCopiedBuildings: () =>
    set((state) => {
      if (!state.clipboard || state.clipboard.buildings.length === 0) {
        return state;
      }

      const offset = PASTE_OFFSET * (state.clipboard.pasteCount + 1);
      const idMap = new Map<string, string>();
      const pastedBuildings = state.clipboard.buildings.map((building) => {
        const id = nanoid();
        idMap.set(building.id, id);

        return {
          ...building,
          id,
          x: snap(building.x + offset),
          y: snap(building.y + offset),
        };
      });
      const pastedConnections: BuildingConnection[] =
        state.clipboard.connections.flatMap((connection) => {
          const fromBuildingId = idMap.get(connection.from.buildingId);
          const toBuildingId = idMap.get(connection.to.buildingId);

          if (!fromBuildingId || !toBuildingId) {
            return [];
          }

          return [
            {
              id: nanoid(),
              from: {
                ...connection.from,
                buildingId: fromBuildingId,
              },
              to: {
                ...connection.to,
                buildingId: toBuildingId,
              },
            },
          ];
        });
      const selectedBuildingIds = pastedBuildings.map((building) => building.id);

      return {
        buildings: [...state.buildings, ...pastedBuildings],
        connections: [...state.connections, ...pastedConnections],
        selectedBuildingId: selectedBuildingIds[selectedBuildingIds.length - 1] ?? null,
        selectedBuildingIds,
        selectedTool: null,
        pendingConnection: null,
        clipboard: {
          ...state.clipboard,
          pasteCount: state.clipboard.pasteCount + 1,
        },
      };
    }),

  getDesignSnapshot: () =>
    createDesignSnapshot(get().buildings, get().connections),

  importDesign: (design) => {
    const normalizedDesign = normalizeDesign(design);

    if (!normalizedDesign) {
      return false;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedDesign));
    set({
      buildings: normalizedDesign.buildings,
      connections: normalizedDesign.connections,
      selectedBuildingId: null,
      selectedBuildingIds: [],
      selectedTool: null,
      pendingConnection: null,
      clipboard: null,
    });

    return true;
  },

  clearDesign: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    set({
      buildings: [],
      connections: [],
      selectedBuildingId: null,
      selectedBuildingIds: [],
      selectedTool: null,
      pendingConnection: null,
      clipboard: null,
    });
  },

  saveDesign: () => {
    const design = createDesignSnapshot(get().buildings, get().connections);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
  },

  loadDesign: () => {
    const design = readSavedDesign();
    set({
      buildings: design?.buildings ?? [],
      connections: design?.connections ?? [],
      selectedBuildingId: null,
      selectedBuildingIds: [],
      selectedTool: null,
      pendingConnection: null,
      clipboard: null,
    });
  },
}));
