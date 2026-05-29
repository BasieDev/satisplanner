import rawBuildings from "./raw/DocsBuildings.json";
import rawItems from "./raw/DocsItems.json";
import rawRecipes from "./raw/DocsRecipes.json";
import type { BuildingType } from "../types";

type RawItem = {
  className: string;
  name: string;
  description: string;
  form: string;
  stackSize: number;
  energy: number;
  sinkPoints: number;
  stable: boolean;
  experimental: boolean;
};

type RawBuilding = {
  className: string;
  name: string;
  description: string;
  powerUsage: number;
  powerGenerated: number;
  overclockable: boolean;
  somersloopSlots: number;
  isVehicle: boolean;
  stable: boolean;
  experimental: boolean;
};

type RawRecipe = {
  className: string;
  name: string;
  unlockedBy: string;
  duration: number;
  ingredients: RawRecipeAmount[];
  products: RawRecipeAmount[];
  producedIn: string[];
  inCraftBench: boolean;
  inWorkshop: boolean;
  inBuildGun: boolean;
  inCustomizer: boolean;
  alternate: boolean;
  minPower: number | null;
  maxPower: number | null;
  seasons: string[];
  stable: boolean;
  experimental: boolean;
};

type RawRecipeAmount = {
  item: string;
  amount: number;
};

export type SatisfactoryItem = {
  className: string;
  name: string;
  description: string;
  form: string;
  stackSize: number;
  energy: number;
  sinkPoints: number;
};

export type SatisfactoryBuilding = {
  className: string;
  name: string;
  description: string;
  powerUsage: number;
  powerGenerated: number;
  overclockable: boolean;
  somersloopSlots: number;
  isVehicle: boolean;
};

export type RecipeAmount = {
  className: string;
  name: string;
  amount: number;
  ratePerMinute: number;
  form: string;
};

export type RecipeCategory = "Factory" | "Manual" | "Build Gun" | "Customizer";

export type SatisfactoryRecipe = {
  className: string;
  name: string;
  unlockedBy: string;
  duration: number;
  ingredients: RecipeAmount[];
  products: RecipeAmount[];
  producedIn: string[];
  producedInClassNames: string[];
  category: RecipeCategory;
  alternate: boolean;
  variablePower: string | null;
  seasons: string[];
};

const itemRecords = rawItems as Record<string, RawItem[]>;
const buildingRecords = rawBuildings as Record<string, RawBuilding[]>;
const recipeRecords = rawRecipes as Record<string, RawRecipe[]>;

const flatten = <T>(records: Record<string, T[]>) => Object.values(records).flat();

const cleanWikiText = (value: string) =>
  value
    .replaceAll(/<br\s*\/?>/gi, ", ")
    .replaceAll(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replaceAll(/\[\[([^\]]+)\]\]/g, "$1")
    .replaceAll("&nbsp;", " ")
    .trim();

const rawItemList = flatten(itemRecords);
const rawBuildingList = flatten(buildingRecords);

const itemByClassName = new Map(rawItemList.map((item) => [item.className, item]));
const buildingByClassName = new Map(
  rawBuildingList.map((building) => [building.className, building]),
);

const normalizeAmount = (amount: RawRecipeAmount, duration: number): RecipeAmount => {
  const item = itemByClassName.get(amount.item);

  return {
    className: amount.item,
    name: item?.name ?? amount.item,
    amount: amount.amount,
    ratePerMinute: duration > 0 ? (amount.amount * 60) / duration : amount.amount,
    form: item?.form ?? "solid",
  };
};

const recipeCategory = (recipe: RawRecipe): RecipeCategory => {
  if (recipe.inBuildGun) {
    return "Build Gun";
  }

  if (recipe.inCustomizer) {
    return "Customizer";
  }

  if (recipe.producedIn.length > 0) {
    return "Factory";
  }

  return "Manual";
};

export const satisfactoryItems: SatisfactoryItem[] = rawItemList
  .filter((item) => item.stable || item.experimental)
  .map((item) => ({
    className: item.className,
    name: item.name,
    description: item.description,
    form: item.form,
    stackSize: item.stackSize,
    energy: item.energy,
    sinkPoints: item.sinkPoints,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const satisfactoryBuildings: SatisfactoryBuilding[] = rawBuildingList
  .filter((building) => building.stable || building.experimental)
  .map((building) => ({
    className: building.className,
    name: building.name,
    description: building.description,
    powerUsage: building.powerUsage,
    powerGenerated: building.powerGenerated,
    overclockable: building.overclockable,
    somersloopSlots: building.somersloopSlots,
    isVehicle: building.isVehicle,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const satisfactoryRecipes: SatisfactoryRecipe[] = flatten(recipeRecords)
  .filter((recipe) => recipe.stable || recipe.experimental)
  .map((recipe) => ({
    className: recipe.className,
    name: recipe.name,
    unlockedBy: cleanWikiText(recipe.unlockedBy),
    duration: recipe.duration,
    ingredients: recipe.ingredients.map((ingredient) =>
      normalizeAmount(ingredient, recipe.duration),
    ),
    products: recipe.products.map((product) =>
      normalizeAmount(product, recipe.duration),
    ),
    producedIn: recipe.producedIn.map(
      (buildingClassName) =>
        buildingByClassName.get(buildingClassName)?.name ?? buildingClassName,
    ),
    producedInClassNames: recipe.producedIn,
    category: recipeCategory(recipe),
    alternate: recipe.alternate,
    variablePower:
      recipe.minPower !== null && recipe.maxPower !== null
        ? `${recipe.minPower}-${recipe.maxPower} MW`
        : null,
    seasons: recipe.seasons,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const factoryRecipes = satisfactoryRecipes.filter(
  (recipe) => recipe.category === "Factory",
);

const recipeByClassName = new Map(
  satisfactoryRecipes.map((recipe) => [recipe.className, recipe]),
);

export const datasetSummary = {
  itemCount: satisfactoryItems.length,
  buildingCount: satisfactoryBuildings.length,
  recipeCount: satisfactoryRecipes.length,
  factoryRecipeCount: factoryRecipes.length,
};

const machineClassNamesByBuildingType: Partial<Record<BuildingType, string[]>> = {
  Smelter: ["Desc_SmelterMk1_C"],
  Constructor: ["Desc_ConstructorMk1_C"],
  Assembler: ["Desc_AssemblerMk1_C"],
  Foundry: ["Desc_FoundryMk1_C"],
  Manufacturer: ["Desc_ManufacturerMk1_C"],
  Refinery: ["Desc_OilRefinery_C"],
  Packager: ["Desc_Packager_C"],
  Blender: ["Desc_Blender_C"],
  "Particle Accelerator": ["Desc_HadronCollider_C"],
  Converter: ["Desc_Converter_C"],
  "Quantum Encoder": ["Desc_QuantumEncoder_C"],
};

export const getRecipesForPlacedBuilding = (buildingType: BuildingType) => {
  const machineClassNames = machineClassNamesByBuildingType[buildingType] ?? [];

  return factoryRecipes.filter((recipe) =>
    recipe.producedInClassNames.some((machineClassName) =>
      machineClassNames.includes(machineClassName),
    ),
  );
};

export const getRecipeByClassName = (className?: string | null) =>
  className ? recipeByClassName.get(className) ?? null : null;

export const recipeProducesQuery = (
  recipe: SatisfactoryRecipe,
  normalizedQuery: string,
) =>
  recipe.name.toLowerCase().includes(normalizedQuery) ||
  recipe.products.some((product) =>
    product.name.toLowerCase().includes(normalizedQuery),
  );

export const recipeExactNameMatchesQuery = (
  recipe: SatisfactoryRecipe,
  normalizedQuery: string,
) => recipe.name.toLowerCase() === normalizedQuery;

export const recipeGeneralMatchesQuery = (
  recipe: SatisfactoryRecipe,
  normalizedQuery: string,
) =>
  [
    recipe.name,
    recipe.category,
    recipe.unlockedBy,
    ...recipe.producedIn,
    ...recipe.products.map((product) => product.name),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
