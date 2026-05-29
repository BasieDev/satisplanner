import { type Building, type PortSide } from "./types";
import { getRecipeByClassName, type RecipeAmount } from "./data/satisfactoryData";
import { getMineableResource, getMinerRate } from "./miningData";

export type PortDefinition = {
  id: string;
  side: PortSide;
  itemClassName: string;
  itemName: string;
  ratePerMinute: number | null;
  form: string;
};

export type PositionedPort = PortDefinition & {
  x: number;
  y: number;
};

const anyItemPort = (side: PortSide): PortDefinition => ({
  id: `${side}:*`,
  side,
  itemClassName: "*",
  itemName: "Any item",
  ratePerMinute: null,
  form: "solid",
});

const amountToPort = (
  amount: RecipeAmount,
  side: PortSide,
  index: number,
): PortDefinition => ({
  id: `${side}:${amount.className}:${index}`,
  side,
  itemClassName: amount.className,
  itemName: amount.name,
  ratePerMinute: amount.ratePerMinute,
  form: amount.form,
});

export const getBuildingPorts = (building: Building): PortDefinition[] => {
  if (building.type === "Storage") {
    return [anyItemPort("input"), anyItemPort("output")];
  }

  if (building.type === "Miner") {
    const resource = getMineableResource(building.extractionItemClassName);

    if (!resource) {
      return [];
    }

    return [
      {
        id: `output:${resource.className}:0`,
        side: "output",
        itemClassName: resource.className,
        itemName: resource.name,
        ratePerMinute: getMinerRate(building.extractionPurity),
        form: resource.form,
      },
    ];
  }

  const recipe = getRecipeByClassName(building.recipeClassName);

  if (!recipe) {
    return [];
  }

  return [
    ...recipe.ingredients.map((amount, index) =>
      amountToPort(amount, "input", index),
    ),
    ...recipe.products.map((amount, index) =>
      amountToPort(amount, "output", index),
    ),
  ];
};

export const getPositionedPorts = (building: Building): PositionedPort[] => {
  const ports = getBuildingPorts(building);
  const inputs = ports.filter((port) => port.side === "input");
  const outputs = ports.filter((port) => port.side === "output");

  const positionSide = (
    sidePorts: PortDefinition[],
    side: PortSide,
  ): PositionedPort[] =>
    sidePorts.map((port, index) => ({
      ...port,
      x: side === "input" ? building.x : building.x + building.width,
      y:
        building.y +
        ((index + 1) * building.height) / (sidePorts.length + 1),
    }));

  return [...positionSide(inputs, "input"), ...positionSide(outputs, "output")];
};

export const getPortAtEndpoint = (
  buildings: Building[],
  buildingId: string,
  side: PortSide,
  itemClassName: string,
) => {
  const building = buildings.find((candidate) => candidate.id === buildingId);

  if (!building) {
    return null;
  }

  return (
    getPositionedPorts(building).find(
      (port) => port.side === side && port.itemClassName === itemClassName,
    ) ?? null
  );
};

const rateFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export const formatRate = (ratePerMinute: number | null, form: string) => {
  if (ratePerMinute === null) {
    return "rate set by belt";
  }

  const unit = form === "liquid" || form === "gas" ? " m3/min" : "/min";
  return `${rateFormatter.format(ratePerMinute)}${unit}`;
};
