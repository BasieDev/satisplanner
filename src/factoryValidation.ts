import { buildingToolByType } from "./buildingCatalog";
import { getRecipesForPlacedBuilding } from "./data/satisfactoryData";
import {
  formatRate,
  getBuildingPorts,
  getPortAtEndpoint,
  type PortDefinition,
} from "./factoryPorts";
import { isMinerBuilding } from "./miningData";
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
  portId?: string,
) => `${buildingId}:${side}:${portId ?? itemClassName}`;

const doesBuildingNeedRecipe = (building: Building) =>
  !isMinerBuilding(building.type) &&
  getRecipesForPlacedBuilding(building.type).length > 0;

const buildingLabel = (building: Building) =>
  buildingToolByType.get(building.type)?.label ?? building.type;

const portLabel = (port: PortDefinition) =>
  `${port.itemName} ${formatRate(port.ratePerMinute, port.form)}`;

const getBuilding = (buildings: Building[], id: string) =>
  buildings.find((building) => building.id === id) ?? null;

type NormalizedConnection = {
  id: string;
  fromBuilding: Building;
  toBuilding: Building;
  fromPort: PortDefinition;
  toPort: PortDefinition;
  fromKey: string;
  toKey: string;
};

const setKnownRate = (
  rates: Map<string, number>,
  key: string,
  rate: number,
) => {
  const previous = rates.get(key);

  if (previous !== undefined && Math.abs(previous - rate) < 0.001) {
    return false;
  }

  rates.set(key, rate);
  return true;
};

const isRatePassThroughBuilding = (building: Building) =>
  [
    "Splitter",
    "Smart Splitter",
    "Programmable Splitter",
    "Merger",
    "Priority Merger",
    "Storage",
    "Industrial Storage Container",
    "Fluid Buffer",
    "Industrial Fluid Buffer",
    "Pipeline Junction",
    "Pipeline T-Junction",
    "Pipeline Pump Mk.1",
    "Pipeline Pump Mk.2",
    "Valve",
  ].includes(building.type);

const isSplitterLikeBuilding = (building: Building) =>
  [
    "Splitter",
    "Smart Splitter",
    "Programmable Splitter",
    "Pipeline Junction",
    "Pipeline T-Junction",
  ].includes(building.type);

export const analyzeFactory = (
  buildings: Building[],
  connections: BuildingConnection[],
): FactoryIssue[] => {
  const issues: FactoryIssue[] = [];
  const inputSupply = new Map<string, number>();
  const inputHasUnknownSupply = new Set<string>();
  const outputDemand = new Map<string, number>();
  const connectedInputs = new Set<string>();
  const knownOutputRates = new Map<string, number>();
  const normalizedConnections: NormalizedConnection[] = [];

  for (const building of buildings) {
    const ports = getBuildingPorts(building);

    if (isMinerBuilding(building.type) && !building.extractionItemClassName) {
      issues.push({
        id: `miner-resource:${building.id}`,
        title: "Miner has no resource",
        message: `${buildingLabel(building)} needs a mined resource before its output rate can be checked.`,
      });
    }

    if (doesBuildingNeedRecipe(building) && !building.recipeClassName) {
      issues.push({
        id: `recipe:${building.id}`,
        title: "Machine has no recipe",
        message: `${buildingLabel(building)} needs a recipe before bottlenecks can be checked.`,
      });
    }

    for (const port of ports) {
      if (port.side === "input") {
        inputSupply.set(
          endpointKey(building.id, "input", port.itemClassName, port.id),
          0,
        );
      }

      if (port.side === "output") {
        const key = endpointKey(building.id, "output", port.itemClassName, port.id);
        outputDemand.set(key, 0);

        if (port.ratePerMinute !== null) {
          knownOutputRates.set(key, port.ratePerMinute);
        }
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
      connection.from.portId,
    );
    const toPort = getPortAtEndpoint(
      buildings,
      connection.to.buildingId,
      "input",
      connection.to.itemClassName,
      connection.to.portId,
    );

    if (!fromBuilding || !toBuilding || !fromPort || !toPort) {
      issues.push({
        id: `stale:${connection.id}`,
        title: "Broken connection",
        message: "A connection points to a missing or changed port. Delete and reconnect it.",
      });
      continue;
    }

    const inputKey = endpointKey(
      toBuilding.id,
      "input",
      connection.to.itemClassName,
      connection.to.portId ?? toPort.id,
    );
    const outputKey = endpointKey(
      fromBuilding.id,
      "output",
      connection.from.itemClassName,
      connection.from.portId ?? fromPort.id,
    );

    connectedInputs.add(inputKey);
    normalizedConnections.push({
      id: connection.id,
      fromBuilding,
      toBuilding,
      fromPort,
      toPort,
      fromKey: outputKey,
      toKey: inputKey,
    });
  }

  for (
    let iteration = 0;
    iteration < buildings.length + connections.length;
    iteration += 1
  ) {
    let changed = false;

    for (const building of buildings) {
      if (!isRatePassThroughBuilding(building)) {
        continue;
      }

      const incomingConnections = normalizedConnections.filter(
        (connection) => connection.toBuilding.id === building.id,
      );
      const outgoingConnections = normalizedConnections.filter(
        (connection) => connection.fromBuilding.id === building.id,
      );

      if (incomingConnections.length === 0 || outgoingConnections.length === 0) {
        continue;
      }

      const incomingRates = incomingConnections.map((connection) =>
        knownOutputRates.get(connection.fromKey),
      );

      if (incomingRates.some((rate) => rate === undefined)) {
        continue;
      }

      const incomingRate = incomingRates.reduce<number>(
        (total, rate) => total + (rate ?? 0),
        0,
      );
      const outgoingRate = isSplitterLikeBuilding(building)
        ? incomingRate / outgoingConnections.length
        : incomingRate;

      for (const connection of outgoingConnections) {
        changed =
          setKnownRate(knownOutputRates, connection.fromKey, outgoingRate) ||
          changed;
      }
    }

    if (!changed) {
      break;
    }
  }

  for (const connection of normalizedConnections) {
    const suppliedRate = knownOutputRates.get(connection.fromKey);

    if (suppliedRate === undefined) {
      inputHasUnknownSupply.add(connection.toKey);
    } else {
      inputSupply.set(
        connection.toKey,
        (inputSupply.get(connection.toKey) ?? 0) + suppliedRate,
      );
    }

    if (connection.toPort.ratePerMinute !== null) {
      outputDemand.set(
        connection.fromKey,
        (outputDemand.get(connection.fromKey) ?? 0) +
          connection.toPort.ratePerMinute,
      );
    }
  }

  for (const building of buildings) {
    const inputs = getBuildingPorts(building).filter(
      (port) => port.side === "input" && port.ratePerMinute !== null,
    );

    for (const input of inputs) {
      const key = endpointKey(building.id, "input", input.itemClassName, input.id);
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
      (port) => port.side === "output",
    );

    for (const output of outputs) {
      const key = endpointKey(
        building.id,
        "output",
        output.itemClassName,
        output.id,
      );
      const available = output.ratePerMinute ?? knownOutputRates.get(key);
      const demanded = outputDemand.get(key) ?? 0;

      if (available !== undefined && demanded > available + 0.001) {
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
