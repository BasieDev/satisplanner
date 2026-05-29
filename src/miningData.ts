import type { ResourcePurity } from "./types";

export type MineableResource = {
  className: string;
  name: string;
  form: "solid";
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

const minerMk1Rates: Record<ResourcePurity, number> = {
  Impure: 30,
  Normal: 60,
  Pure: 120,
};

export const getMineableResource = (className?: string | null) =>
  className
    ? mineableResources.find((resource) => resource.className === className) ?? null
    : null;

export const getMinerRate = (purity: ResourcePurity = "Normal") =>
  minerMk1Rates[purity];
