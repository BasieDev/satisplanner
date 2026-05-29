import { memo, useMemo, useState } from "react";
import {
  datasetSummary,
  factoryRecipes,
  getRecipesForPlacedBuilding,
  recipeExactNameMatchesQuery,
  recipeGeneralMatchesQuery,
  recipeProducesQuery,
  type RecipeAmount,
  type SatisfactoryRecipe,
} from "../data/satisfactoryData";
import { formatRate } from "../factoryPorts";
import { BUILDING_TYPES, type BuildingType } from "../types";

type RecipeBrowserProps = {
  selectedBuildingType: BuildingType | null;
  selectedRecipeClassName?: string | null;
  onRecipeSelect?: (recipeClassName: string) => void;
};

const RECIPE_RESULT_LIMIT = 30;

export function RecipeBrowser({
  selectedBuildingType,
  selectedRecipeClassName,
  onRecipeSelect,
}: RecipeBrowserProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const selectedBuildingRecipes = useMemo(
    () =>
      selectedBuildingType
        ? getRecipesForPlacedBuilding(selectedBuildingType)
        : [],
    [selectedBuildingType],
  );

  const matchingRecipes = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return factoryRecipes;
    }

    const exactRecipeMatches = factoryRecipes.filter((recipe) =>
      recipeExactNameMatchesQuery(recipe, normalizedQuery),
    );

    if (exactRecipeMatches.length > 0) {
      return exactRecipeMatches;
    }

    const producedItemMatches = factoryRecipes.filter((recipe) =>
      recipeProducesQuery(recipe, normalizedQuery),
    );

    if (producedItemMatches.length > 0) {
      return producedItemMatches;
    }

    return factoryRecipes.filter((recipe) =>
      recipeGeneralMatchesQuery(recipe, normalizedQuery),
    );
  }, [normalizedQuery]);

  const visibleRecipes = matchingRecipes.slice(0, RECIPE_RESULT_LIMIT);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Satisfactory data
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <SummaryStat label="Items" value={datasetSummary.itemCount} />
          <SummaryStat label="Placeable" value={BUILDING_TYPES.length} />
          <SummaryStat label="Recipes" value={datasetSummary.factoryRecipeCount} />
        </div>
      </div>

      {selectedBuildingType ? (
        <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-100">
              {selectedBuildingType} recipes
            </h3>
            <span className="text-xs text-slate-500">
              {selectedBuildingRecipes.length}
            </span>
          </div>
          {selectedBuildingRecipes.length > 0 ? (
            <div className="mt-3 space-y-3">
              {selectedBuildingRecipes.slice(0, 8).map((recipe) => (
                <RecipeCard
                  key={recipe.className}
                  recipe={recipe}
                  compact
                  isAssigned={selectedRecipeClassName === recipe.className}
                  onAssign={
                    onRecipeSelect ? () => onRecipeSelect(recipe.className) : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-500">
              The parsed data has no factory recipe rows for this placed building.
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search factory recipes that make an item"
          className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400"
        />

        <p className="text-xs text-slate-500">
          Showing {visibleRecipes.length} of {matchingRecipes.length} matching
          recipes.
        </p>
      </div>

      <div className="space-y-3">
        {visibleRecipes.map((recipe) => {
          const canAssign =
            selectedBuildingType !== null &&
            selectedBuildingRecipes.some(
              (buildingRecipe) => buildingRecipe.className === recipe.className,
            );

          return (
            <RecipeCard
              key={recipe.className}
              recipe={recipe}
              isAssigned={selectedRecipeClassName === recipe.className}
              onAssign={
                canAssign && onRecipeSelect
                  ? () => onRecipeSelect(recipe.className)
                  : undefined
              }
            />
          );
        })}
        {matchingRecipes.length === 0 ? (
          <div className="rounded-md border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
            No recipes match this search.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 px-2 py-3">
      <p className="text-lg font-semibold text-slate-100">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

const RecipeCard = memo(function RecipeCard({
  recipe,
  compact = false,
  isAssigned = false,
  onAssign,
}: {
  recipe: SatisfactoryRecipe;
  compact?: boolean;
  isAssigned?: boolean;
  onAssign?: () => void;
}) {
  return (
    <article className="rounded-md border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-100">
            {recipe.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {recipe.duration}s cycle
            {recipe.producedIn.length > 0
              ? ` in ${recipe.producedIn.join(", ")}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {recipe.alternate ? <Badge>Alt</Badge> : null}
        </div>
      </div>

      {onAssign ? (
        <button
          type="button"
          onClick={onAssign}
          className={`mt-3 h-8 w-full rounded-md border text-xs font-semibold transition ${
            isAssigned
              ? "border-emerald-400 bg-emerald-400 text-slate-950"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400 hover:text-amber-300"
          }`}
        >
          {isAssigned ? "Assigned" : "Assign recipe"}
        </button>
      ) : null}

      {compact ? null : (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
          {recipe.unlockedBy || "No unlock listed"}
        </p>
      )}

      <div className="mt-3 grid gap-3">
        <RecipeAmounts title="Inputs" amounts={recipe.ingredients} />
        <RecipeAmounts title="Outputs" amounts={recipe.products} />
      </div>

      {recipe.variablePower ? (
        <p className="mt-3 text-xs text-slate-500">Power: {recipe.variablePower}</p>
      ) : null}
    </article>
  );
});

function RecipeAmounts({
  title,
  amounts,
}: {
  title: string;
  amounts: RecipeAmount[];
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {amounts.length > 0 ? (
        <div className="space-y-1">
          {amounts.map((amount) => (
            <div
              key={amount.className}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate text-slate-300">{amount.name}</span>
              <span className="shrink-0 font-mono text-slate-400">
                {formatRate(amount.ratePerMinute, amount.form)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-600">None</p>
      )}
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300">
      {children}
    </span>
  );
}
