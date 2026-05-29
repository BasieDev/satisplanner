import { HardDriveDownload, Save, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  buildingCategories,
  type BuildingCategory,
  type BuildingTool,
} from "../buildingCatalog";
import { useFactoryStore } from "../store/factoryStore";

const matchesToolQuery = (tool: BuildingTool, query: string) => {
  if (!query) {
    return true;
  }

  const searchable = [tool.type, tool.label, ...tool.searchTags]
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
};

export function Toolbar() {
  const [query, setQuery] = useState("");
  const selectedTool = useFactoryStore((state) => state.selectedTool);
  const setSelectedTool = useFactoryStore((state) => state.setSelectedTool);
  const saveDesign = useFactoryStore((state) => state.saveDesign);
  const loadDesign = useFactoryStore((state) => state.loadDesign);
  const clearDesign = useFactoryStore((state) => state.clearDesign);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return buildingCategories
      .map((category) => ({
        ...category,
        tools: category.tools.filter((tool) =>
          matchesToolQuery(tool, normalizedQuery),
        ),
      }))
      .filter((category) => category.tools.length > 0);
  }, [query]);

  return (
    <aside className="flex h-full min-w-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <h1 className="text-base font-semibold text-slate-100">Build Menu</h1>
        <div className="mt-3 flex h-10 items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 focus-within:border-amber-400">
          <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search buildings"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredCategories.length > 0 ? (
          <div className="space-y-5">
            {filteredCategories.map((category) => (
              <ToolbarCategory
                key={category.id}
                category={category}
                selectedTool={selectedTool}
                onSelectTool={setSelectedTool}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
            No buildings match this search.
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-800 p-3">
        <ActionButton label="Save" onClick={saveDesign}>
          <Save className="h-5 w-5" aria-hidden="true" />
        </ActionButton>
        <ActionButton label="Load" onClick={loadDesign}>
          <HardDriveDownload className="h-5 w-5" aria-hidden="true" />
        </ActionButton>
        <ActionButton label="Clear" onClick={clearDesign}>
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </ActionButton>
      </div>
    </aside>
  );
}

function ToolbarCategory({
  category,
  selectedTool,
  onSelectTool,
}: {
  category: BuildingCategory;
  selectedTool: BuildingTool["type"] | null;
  onSelectTool: (tool: BuildingTool["type"] | null) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {category.name}
        </h2>
        <span className="text-xs text-slate-600">{category.tools.length}</span>
      </div>
      <div className="space-y-2">
        {category.tools.map((tool) => {
          const isSelected = selectedTool === tool.type;

          return (
            <button
              key={tool.type}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              onClick={() => onSelectTool(isSelected ? null : tool.type)}
              className={`flex min-h-16 w-full items-center gap-3 rounded-md border p-2 text-left transition ${
                isSelected
                  ? "border-amber-400 bg-amber-400/12 shadow-[0_0_0_3px_rgba(251,191,36,0.14)]"
                  : "border-slate-800 bg-slate-950 hover:border-slate-600 hover:bg-slate-800"
              }`}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-800 bg-slate-900">
                <img
                  src={tool.imageSrc}
                  alt=""
                  className="h-11 w-11 object-contain"
                  draggable={false}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5 text-slate-100">
                  {tool.label}
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                  {isSelected ? "Click canvas to place" : "Factory building"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-12 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
    >
      {children}
    </button>
  );
}
