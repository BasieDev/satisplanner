import type { BuildingType } from "./types";

export type BuildingTool = {
  type: BuildingType;
  label: string;
  imageSrc: string;
  searchTags: string[];
};

export type BuildingCategory = {
  id: string;
  name: string;
  tools: BuildingTool[];
};

export const buildingCategories: BuildingCategory[] = [
  {
    id: "extraction",
    name: "Extraction",
    tools: [
      {
        type: "Miner",
        label: "Miner Mk.1",
        imageSrc: "/buildings/miner-mk1.png",
        searchTags: ["ore", "resource", "miner"],
      },
    ],
  },
  {
    id: "production",
    name: "Production",
    tools: [
      {
        type: "Smelter",
        label: "Smelter",
        imageSrc: "/buildings/smelter.png",
        searchTags: ["ingot", "ore"],
      },
      {
        type: "Constructor",
        label: "Constructor",
        imageSrc: "/buildings/constructor.png",
        searchTags: ["parts", "single input"],
      },
      {
        type: "Assembler",
        label: "Assembler",
        imageSrc: "/buildings/assembler.png",
        searchTags: ["two inputs", "parts"],
      },
      {
        type: "Foundry",
        label: "Foundry",
        imageSrc: "/buildings/foundry.png",
        searchTags: ["alloy", "ingot"],
      },
      {
        type: "Manufacturer",
        label: "Manufacturer",
        imageSrc: "/buildings/manufacturer.png",
        searchTags: ["advanced parts"],
      },
      {
        type: "Refinery",
        label: "Refinery",
        imageSrc: "/buildings/refinery.png",
        searchTags: ["oil", "fluid", "liquid"],
      },
      {
        type: "Packager",
        label: "Packager",
        imageSrc: "/buildings/packager.png",
        searchTags: ["fluid", "package"],
      },
      {
        type: "Blender",
        label: "Blender",
        imageSrc: "/buildings/blender.png",
        searchTags: ["fluid", "gas", "advanced"],
      },
      {
        type: "Particle Accelerator",
        label: "Particle Accelerator",
        imageSrc: "/buildings/particle-accelerator.png",
        searchTags: ["nuclear", "advanced"],
      },
      {
        type: "Converter",
        label: "Converter",
        imageSrc: "/buildings/converter.png",
        searchTags: ["sam", "conversion"],
      },
      {
        type: "Quantum Encoder",
        label: "Quantum Encoder",
        imageSrc: "/buildings/quantum-encoder.png",
        searchTags: ["quantum", "late game"],
      },
    ],
  },
  {
    id: "power",
    name: "Power",
    tools: [
      {
        type: "Nuclear Power Plant",
        label: "Nuclear Power Plant",
        imageSrc: "/buildings/nuclear-power-plant.png",
        searchTags: ["nuclear", "generator"],
      },
    ],
  },
  {
    id: "logistics",
    name: "Logistics",
    tools: [
      {
        type: "Storage",
        label: "Storage Container",
        imageSrc: "/buildings/storage-container.png",
        searchTags: ["buffer", "container", "storage"],
      },
    ],
  },
];

export const buildingToolByType = new Map(
  buildingCategories.flatMap((category) =>
    category.tools.map((tool) => [tool.type, tool] as const),
  ),
);
