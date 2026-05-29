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
      {
        type: "Miner Mk.2",
        label: "Miner Mk.2",
        imageSrc: "/buildings/miner-mk2.png",
        searchTags: ["ore", "resource", "miner"],
      },
      {
        type: "Miner Mk.3",
        label: "Miner Mk.3",
        imageSrc: "/buildings/miner-mk3.png",
        searchTags: ["ore", "resource", "miner"],
      },
      {
        type: "Water Extractor",
        label: "Water Extractor",
        imageSrc: "/buildings/water-extractor.png",
        searchTags: ["water", "fluid", "extractor"],
      },
      {
        type: "Oil Extractor",
        label: "Oil Extractor",
        imageSrc: "/buildings/oil-extractor.png",
        searchTags: ["oil", "fluid", "extractor"],
      },
      {
        type: "Resource Well Extractor",
        label: "Resource Well Extractor",
        imageSrc: "/buildings/resource-well-extractor.png",
        searchTags: ["resource well", "extractor", "fluid", "gas"],
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
        searchTags: ["advanced", "variable power"],
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
    id: "belt-logistics",
    name: "Belts",
    tools: [
      {
        type: "Splitter",
        label: "Conveyor Splitter",
        imageSrc: "/buildings/conveyor-splitter.png",
        searchTags: ["belt", "split", "logistics"],
      },
      {
        type: "Smart Splitter",
        label: "Smart Splitter",
        imageSrc: "/buildings/smart-splitter.png",
        searchTags: ["belt", "split", "logistics", "smart"],
      },
      {
        type: "Programmable Splitter",
        label: "Programmable Splitter",
        imageSrc: "/buildings/programmable-splitter.png",
        searchTags: ["belt", "split", "logistics", "programmable"],
      },
      {
        type: "Merger",
        label: "Conveyor Merger",
        imageSrc: "/buildings/conveyor-merger.png",
        searchTags: ["belt", "merge", "logistics"],
      },
      {
        type: "Priority Merger",
        label: "Priority Merger",
        imageSrc: "/buildings/priority-merger.png",
        searchTags: ["belt", "merge", "priority", "logistics"],
      },
      {
        type: "Storage",
        label: "Storage Container",
        imageSrc: "/buildings/storage-container.png",
        searchTags: ["buffer", "container", "storage", "belt"],
      },
      {
        type: "Industrial Storage Container",
        label: "Industrial Storage Container",
        imageSrc: "/buildings/industrial-storage-container.png",
        searchTags: ["buffer", "container", "storage", "belt"],
      },
    ],
  },
  {
    id: "fluids",
    name: "Fluids",
    tools: [
      {
        type: "Fluid Buffer",
        label: "Fluid Buffer",
        imageSrc: "/buildings/fluid-buffer.png",
        searchTags: ["fluid", "buffer", "storage", "pipe"],
      },
      {
        type: "Industrial Fluid Buffer",
        label: "Industrial Fluid Buffer",
        imageSrc: "/buildings/industrial-fluid-buffer.png",
        searchTags: ["fluid", "buffer", "storage", "pipe"],
      },
      {
        type: "Pipeline Junction",
        label: "Pipeline Junction",
        imageSrc: "/buildings/pipeline-junction.png",
        searchTags: ["pipe", "pipeline", "fluid", "junction"],
      },
      {
        type: "Pipeline T-Junction",
        label: "Pipeline T-Junction",
        imageSrc: "/buildings/pipeline-t-junction.png",
        searchTags: ["pipe", "pipeline", "fluid", "junction"],
      },
      {
        type: "Pipeline Pump Mk.1",
        label: "Pipeline Pump Mk.1",
        imageSrc: "/buildings/pipeline-pump-mk1.png",
        searchTags: ["pipe", "pipeline", "fluid", "pump"],
      },
      {
        type: "Pipeline Pump Mk.2",
        label: "Pipeline Pump Mk.2",
        imageSrc: "/buildings/pipeline-pump-mk2.png",
        searchTags: ["pipe", "pipeline", "fluid", "pump"],
      },
      {
        type: "Valve",
        label: "Valve",
        imageSrc: "/buildings/valve.png",
        searchTags: ["pipe", "pipeline", "fluid", "valve"],
      },
    ],
  },
];

export const buildingToolByType = new Map(
  buildingCategories.flatMap((category) =>
    category.tools.map((tool) => [tool.type, tool] as const),
  ),
);
