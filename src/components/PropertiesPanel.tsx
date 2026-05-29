import type { Building } from "../types";
import { buildingToolByType } from "../buildingCatalog";
import { getRecipeByClassName, getRecipesForPlacedBuilding } from "../data/satisfactoryData";
import { formatRate, getBuildingPorts } from "../factoryPorts";
import {
  getMineableResource,
  getMinerRate,
  mineableResources,
  resourcePurities,
} from "../miningData";
import { useFactoryStore } from "../store/factoryStore";
import { RecipeBrowser } from "./RecipeBrowser";

type PropertiesPanelProps = {
  building: Building | null;
};

export function PropertiesPanel({ building }: PropertiesPanelProps) {
  const setBuildingRecipe = useFactoryStore((state) => state.setBuildingRecipe);
  const setMinerResource = useFactoryStore((state) => state.setMinerResource);
  const recipeOptions = building ? getRecipesForPlacedBuilding(building.type) : [];
  const assignedRecipe = getRecipeByClassName(building?.recipeClassName);
  const ports = building ? getBuildingPorts(building) : [];
  const minedResource = getMineableResource(building?.extractionItemClassName);
  const buildingLabel = building
    ? buildingToolByType.get(building.type)?.label ?? building.type
    : "";
  const inputPorts = ports.filter((port) => port.side === "input");
  const outputPorts = ports.filter((port) => port.side === "output");

  return (
    <aside className="h-full overflow-y-auto border-l border-slate-800 bg-slate-900">
      <div className="flex h-16 items-center border-b border-slate-800 px-5">
        <h1 className="text-base font-semibold text-slate-100">Properties</h1>
      </div>

      {building ? (
        <div className="space-y-5 p-5">
          <section>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Building
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {buildingLabel}
            </h2>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Property label="X" value={building.x} />
            <Property label="Y" value={building.y} />
            <Property label="Width" value={building.width} />
            <Property label="Height" value={building.height} />
          </div>

          <section className="rounded-md border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              ID
            </p>
            <p className="mt-2 break-all font-mono text-xs text-slate-300">
              {building.id}
            </p>
          </section>

          {building.type === "Miner" ? (
            <section className="rounded-md border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Mined resource
              </p>
              <select
                value={building.extractionItemClassName ?? ""}
                onChange={(event) =>
                  setMinerResource(
                    building.id,
                    event.target.value || null,
                    building.extractionPurity ?? "Normal",
                  )
                }
                className="mt-2 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-amber-400"
              >
                <option value="">Select resource</option>
                {mineableResources.map((resource) => (
                  <option key={resource.className} value={resource.className}>
                    {resource.name}
                  </option>
                ))}
              </select>
              <select
                value={building.extractionPurity ?? "Normal"}
                onChange={(event) =>
                  setMinerResource(
                    building.id,
                    building.extractionItemClassName ?? null,
                    event.target.value as Building["extractionPurity"],
                  )
                }
                className="mt-2 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-amber-400"
              >
                {resourcePurities.map((purity) => (
                  <option key={purity} value={purity}>
                    {purity} node
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs text-slate-500">
                {minedResource
                  ? `${minedResource.name}: ${formatRate(
                      getMinerRate(building.extractionPurity),
                      minedResource.form,
                    )}`
                  : "Choose what this miner is placed on."}
              </p>
            </section>
          ) : (
            <section className="rounded-md border border-slate-800 bg-slate-950 p-4">
              <label
                htmlFor="recipe-select"
                className="text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                Assigned recipe
              </label>
              {recipeOptions.length > 0 ? (
                <select
                  id="recipe-select"
                  value={building.recipeClassName ?? ""}
                  onChange={(event) =>
                    setBuildingRecipe(building.id, event.target.value || null)
                  }
                  className="mt-2 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-amber-400"
                >
                  <option value="">None</option>
                  {recipeOptions.map((recipe) => (
                    <option key={recipe.className} value={recipe.className}>
                      {recipe.alternate ? "Alternate: " : ""}
                      {recipe.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  No selectable production recipes for this building yet.
                </p>
              )}
            </section>
          )}

          {assignedRecipe || ports.length > 0 ? (
            <section className="rounded-md border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-100">
                  Ports and rates
                </h3>
                {assignedRecipe ? (
                  <span className="text-xs text-slate-500">
                    {assignedRecipe.duration}s
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4">
                <PortList title="Inputs" emptyLabel="No inputs" ports={inputPorts} />
                <PortList title="Outputs" emptyLabel="No outputs" ports={outputPorts} />
              </div>
            </section>
          ) : (
            <div className="rounded-md border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-500">
              {building.type === "Miner"
                ? "Choose a mined resource to show the miner output port."
                : "Assign a recipe to show the machine input and output ports."}
            </div>
          )}

          <RecipeBrowser
            selectedBuildingType={building.type === "Miner" ? null : building.type}
            selectedRecipeClassName={building.recipeClassName}
            onRecipeSelect={
              building.type === "Miner"
                ? undefined
                : (recipeClassName) =>
                    setBuildingRecipe(building.id, recipeClassName)
            }
          />
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="rounded-md border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-500">
            Select a placed building to inspect its grid position and matching
            machine recipes.
          </div>
          <RecipeBrowser selectedBuildingType={null} />
        </div>
      )}
    </aside>
  );
}

function Property({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function PortList({
  title,
  emptyLabel,
  ports,
}: {
  title: string;
  emptyLabel: string;
  ports: ReturnType<typeof getBuildingPorts>;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {ports.length > 0 ? (
        <div className="space-y-2">
          {ports.map((port) => (
            <div
              key={port.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate text-slate-300">{port.itemName}</span>
              <span className="shrink-0 font-mono text-slate-400">
                {formatRate(port.ratePerMinute, port.form)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-600">{emptyLabel}</p>
      )}
    </div>
  );
}
