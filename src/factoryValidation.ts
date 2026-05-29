import { buildingToolByType } from "./buildingCatalog";
import {
  formatRate,
  getBuildingPorts,
  getPortAtEndpoint,
  type PortDefinition,
} from "./factoryPorts";
import type { Building, BuildingConnection, PortSide } from "./types";

export type FactoryIssue = {
  id: string;
  title: string;
  message: string;
};

const endpointKey = (
  buildingId: string,
  side: PortSide,
  itemClassName: string,
) => `${buildingId}:${side}:${itemClassName}`;

const buildingLabel = (building: Building) =>
  buildingToolByType.get(building.type)?.label ?? building.type;

const portLabel = (port: PortDefinition) =>
  `${port.itemName} ${formatRate(port.ratePerMinute, port.form)}`;

const getBuilding = (buildings: Building[], id: string) =>
  buildings.find((building) => building.id === id) ?? null;

export const analyzeFactory = (
  buildings: Building[],
  connections: BuildingConnection[],
): FactoryIssue[] => {
  const issues: FactoryIssue[] = [];
  const inputSupply = new Map<string, number>();
  const inputHasUnknownSupply = new Set<string>();
  const outputDemand = new Map<string, number>();
  const connectedInputs = new Set<string>();

  for (const building of buildings) {
    const ports = getBuildingPorts(building);

    if (building.type === "Miner" && !building.extractionItemClassName) {
      issues.push({
        id: `miner-resource:${building.id}`,
        title: "Miner has no resource",
        message: `${buildingLabel(building)} needs a mined resource before its output rate can be checked.`,
      });
    }

    if (
      building.type !== "Miner" &&
      building.type !== "Storage" &&
      !building.recipeClassName
    ) {
      issues.push({
        id: `recipe:${building.id}`,
        title: "Machine has no recipe",
        message: `${buildingLabel(building)} needs a recipe before bottlenecks can be checked.`,
      });
    }

    for (const port of ports) {
      if (port.side === "input") {
        inputSupply.set(endpointKey(building.id, "input", port.itemClassName), 0);
      }

      if (port.side === "output") {
        outputDemand.set(endpointKey(building.id, "output", port.itemClassName), 0);
      }
    }
  }

  for (const connection of connections) {
    const fromBuilding = getBuilding(buildings, connection.from.buildingId);
    const toBuilding = getBuilding(buildings, connection.to.buildingId);
    const fromPort = getPortAtEndpoint(
      buildings,
      connection.from.buildingId,
      "output",
      connection.from.itemClassName,
    );
    const toPort = getPortAtEndpoint(
      buildings,
      connection.to.buildingId,
      "input",
      connection.to.itemClassName,
    );

    if (!fromBuilding || !toBuilding || !fromPort || !toPort) {
      issues.push({
        id: `stale:${connection.id}`,
        title: "Broken belt connection",
        message: "A belt points to a missing or changed port. Delete and reconnect it.",
      });
      continue;
    }

    const inputKey = endpointKey(
      toBuilding.id,
      "input",
      connection.to.itemClassName,
    );
    const outputKey = endpointKey(
      fromBuilding.id,
      "output",
      connection.from.itemClassName,
    );

    connectedInputs.add(inputKey);

    if (fromPort.ratePerMinute === null) {
      inputHasUnknownSupply.add(inputKey);
    } else {
      inputSupply.set(inputKey, (inputSupply.get(inputKey) ?? 0) + fromPort.ratePerMinute);
    }

    if (toPort.ratePerMinute !== null) {
      outputDemand.set(
        outputKey,
        (outputDemand.get(outputKey) ?? 0) + toPort.ratePerMinute,
      );
    }
  }

  for (const building of buildings) {
    const inputs = getBuildingPorts(building).filter(
      (port) => port.side === "input" && port.ratePerMinute !== null,
    );

    for (const input of inputs) {
      const key = endpointKey(building.id, "input", input.itemClassName);
      const required = input.ratePerMinute ?? 0;
      const supplied = inputSupply.get(key) ?? 0;

      if (!connectedInputs.has(key)) {
        issues.push({
          id: `missing:${key}`,
          title: "Missing input",
          message: `${buildingLabel(building)} needs ${portLabel(input)} but has no connected supply.`,
        });
        continue;
      }

      if (inputHasUnknownSupply.has(key)) {
        issues.push({
          id: `unknown:${key}`,
          title: "Unknown supply rate",
          message: `${buildingLabel(building)} receives ${input.itemName} from a source with no configured rate.`,
        });
        continue;
      }

      if (supplied + 0.001 < required) {
        issues.push({
          id: `underfed:${key}`,
          title: "Input bottleneck",
          message: `${buildingLabel(building)} needs ${formatRate(required, input.form)} ${input.itemName} but only receives ${formatRate(supplied, input.form)}.`,
        });
      }
    }
  }

  for (const building of buildings) {
    const outputs = getBuildingPorts(building).filter(
      (port) => port.side === "output" && port.ratePerMinute !== null,
    );

    for (const output of outputs) {
      const key = endpointKey(building.id, "output", output.itemClassName);
      const available = output.ratePerMinute ?? 0;
      const demanded = outputDemand.get(key) ?? 0;

      if (demanded > available + 0.001) {
        issues.push({
          id: `overdraw:${key}`,
          title: "Output overdrawn",
          message: `${buildingLabel(building)} makes ${formatRate(available, output.form)} ${output.itemName}, but connected machines demand ${formatRate(demanded, output.form)}.`,
        });
      }
    }
  }

  return issues;
};
