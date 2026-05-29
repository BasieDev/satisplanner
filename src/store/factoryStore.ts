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
  Storage: { width: 96, height: 128 },
};

type SavedDesign = {
  buildings: Building[];
  connections?: BuildingConnection[];
};

type FactoryState = {
  buildings: Building[];
  connections: BuildingConnection[];
  selectedTool: BuildingType | null;
  selectedBuildingId: string | null;
  selectedBuildingIds: string[];
  pendingConnection: ConnectionEndpoint | null;
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
  clearDesign: () => void;
  saveDesign: () => void;
  loadDesign: () => void;
};

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

const readSavedDesign = (): SavedDesign | null => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as SavedDesign) : null;
  } catch {
    return null;
  }
};

export const useFactoryStore = create<FactoryState>((set, get) => ({
  buildings: readSavedDesign()?.buildings ?? [],
  connections: readSavedDesign()?.connections ?? [],
  selectedTool: null,
  selectedBuildingId: null,
  selectedBuildingIds: [],
  pendingConnection: null,

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
              connection.from.buildingId === pendingConnection.buildingId &&
              connection.from.itemClassName === pendingConnection.itemClassName &&
              connection.to.buildingId === endpoint.buildingId &&
              connection.to.itemClassName === endpoint.itemClassName
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

  clearDesign: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    set({
      buildings: [],
      connections: [],
      selectedBuildingId: null,
      selectedBuildingIds: [],
      selectedTool: null,
      pendingConnection: null,
    });
  },

  saveDesign: () => {
    const design: SavedDesign = {
      buildings: get().buildings,
      connections: get().connections,
    };
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
    });
  },
}));
