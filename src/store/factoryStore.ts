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
  pendingConnection: ConnectionEndpoint | null;
  setSelectedTool: (tool: BuildingType | null) => void;
  setSelectedBuilding: (id: string | null) => void;
  placeBuilding: (type: BuildingType, x: number, y: number) => void;
  moveBuilding: (id: string, x: number, y: number) => void;
  setBuildingRecipe: (id: string, recipeClassName: string | null) => void;
  startConnection: (endpoint: ConnectionEndpoint) => void;
  finishConnection: (endpoint: ConnectionEndpoint) => void;
  cancelConnection: () => void;
  removeConnection: (id: string) => void;
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
  pendingConnection: null,

  setSelectedTool: (tool) =>
    set({
      selectedTool: tool,
      selectedBuildingId: null,
      pendingConnection: null,
    }),

  setSelectedBuilding: (id) =>
    set({
      selectedBuildingId: id,
      selectedTool: null,
      pendingConnection: null,
    }),

  placeBuilding: (type, x, y) => {
    const building: Building = {
      id: nanoid(),
      type,
      x: snap(x),
      y: snap(y),
      recipeClassName: null,
      ...buildingDefaults[type],
    };

    set((state) => ({
      buildings: [...state.buildings, building],
      selectedBuildingId: building.id,
      pendingConnection: null,
    }));
  },

  moveBuilding: (id, x, y) =>
    set((state) => ({
      buildings: state.buildings.map((building) =>
        building.id === id
          ? {
              ...building,
              x: snap(x),
              y: snap(y),
            }
          : building,
      ),
    })),

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

  clearDesign: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    set({
      buildings: [],
      connections: [],
      selectedBuildingId: null,
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
      selectedTool: null,
      pendingConnection: null,
    });
  },
}));
