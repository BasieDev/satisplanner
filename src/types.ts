export const GRID_SIZE = 32;

export const BUILDING_TYPES = [
  "Miner",
  "Smelter",
  "Constructor",
  "Assembler",
  "Foundry",
  "Manufacturer",
  "Refinery",
  "Packager",
  "Blender",
  "Particle Accelerator",
  "Converter",
  "Quantum Encoder",
  "Nuclear Power Plant",
  "Storage",
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

export type Building = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  width: number;
  height: number;
  recipeClassName?: string | null;
  extractionItemClassName?: string | null;
  extractionPurity?: ResourcePurity;
};

export type ResourcePurity = "Impure" | "Normal" | "Pure";

export type PortSide = "input" | "output";

export type ConnectionEndpoint = {
  buildingId: string;
  itemClassName: string;
};

export type BuildingConnection = {
  id: string;
  from: ConnectionEndpoint;
  to: ConnectionEndpoint;
};
