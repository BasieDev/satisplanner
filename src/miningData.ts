import type { BuildingType, ResourcePurity } from "./types";

export type MineableResource = {
  className: string;
  name: string;
  form: "solid";
};

export type WellResource = {
  className: string;
  name: string;
  form: "liquid" | "gas";
};

export const mineableResources: MineableResource[] = [
  { className: "Desc_OreIron_C", name: "Iron Ore", form: "solid" },
  { className: "Desc_OreCopper_C", name: "Copper Ore", form: "solid" },
  { className: "Desc_Stone_C", name: "Limestone", form: "solid" },
  { className: "Desc_Coal_C", name: "Coal", form: "solid" },
  { className: "Desc_OreGold_C", name: "Caterium Ore", form: "solid" },
  { className: "Desc_RawQuartz_C", name: "Raw Quartz", form: "solid" },
  { className: "Desc_Sulfur_C", name: "Sulfur", form: "solid" },
  { className: "Desc_OreBauxite_C", name: "Bauxite", form: "solid" },
  { className: "Desc_OreUranium_C", name: "Uranium", form: "solid" },
  { className: "Desc_SAM_C", name: "SAM", form: "solid" },
];

export const resourcePurities: ResourcePurity[] = ["Impure", "Normal", "Pure"];

export const wellResources: WellResource[] = [
  { className: "Desc_Water_C", name: "Water", form: "liquid" },
  { className: "Desc_LiquidOil_C", name: "Crude Oil", form: "liquid" },
  { className: "Desc_NitrogenGas_C", name: "Nitrogen Gas", form: "gas" },
];

const minerMk1Rates: Record<ResourcePurity, number> = {
  Impure: 30,
  Normal: 60,
  Pure: 120,
};

const minerRateMultipliers: Partial<Record<BuildingType, number>> = {
  Miner: 1,
  "Miner Mk.2": 2,
  "Miner Mk.3": 4,
};

const oilExtractorRates: Record<ResourcePurity, number> = {
  Impure: 60,
  Normal: 120,
  Pure: 240,
};

const resourceWellRates: Record<ResourcePurity, number> = {
  Impure: 30,
  Normal: 60,
  Pure: 120,
};

export const getMineableResource = (className?: string | null) =>
  className
    ? mineableResources.find((resource) => resource.className === className) ?? null
    : null;

export const getWellResource = (className?: string | null) =>
  className
    ? wellResources.find((resource) => resource.className === className) ?? null
    : null;

export const isMinerBuilding = (buildingType: BuildingType) =>
  buildingType in minerRateMultipliers;

export const getMinerRate = (
  purity: ResourcePurity = "Normal",
  buildingType: BuildingType = "Miner",
) => minerMk1Rates[purity] * (minerRateMultipliers[buildingType] ?? 1);

export const getOilExtractorRate = (purity: ResourcePurity = "Normal") =>
  oilExtractorRates[purity];

export const getResourceWellRate = (purity: ResourcePurity = "Normal") =>
  resourceWellRates[purity];
