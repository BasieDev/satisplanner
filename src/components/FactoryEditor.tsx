import { useEffect, useMemo } from "react";
import { FactoryCanvas } from "./FactoryCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { Toolbar } from "./Toolbar";
import { useFactoryStore } from "../store/factoryStore";

export function FactoryEditor() {
  const buildings = useFactoryStore((state) => state.buildings);
  const selectedBuildingId = useFactoryStore((state) => state.selectedBuildingId);
  const selectedBuildingIds = useFactoryStore((state) => state.selectedBuildingIds);
  const deleteSelectedBuildings = useFactoryStore(
    (state) => state.deleteSelectedBuildings,
  );
  const copySelectedBuildings = useFactoryStore(
    (state) => state.copySelectedBuildings,
  );
  const pasteCopiedBuildings = useFactoryStore(
    (state) => state.pasteCopiedBuildings,
  );

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (isEditableTarget) {
        return;
      }

      const key = event.key.toLowerCase();
      const isShortcut = event.ctrlKey || event.metaKey;

      if (isShortcut && key === "c" && selectedBuildingIds.length > 0) {
        event.preventDefault();
        copySelectedBuildings();
        return;
      }

      if (isShortcut && key === "v") {
        event.preventDefault();
        pasteCopiedBuildings();
        return;
      }

      const shouldDelete =
        event.key === "Delete" ||
        event.key === "Backspace" ||
        (key === "d" &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey);

      if (!shouldDelete || selectedBuildingIds.length === 0) {
        return;
      }

      event.preventDefault();
      deleteSelectedBuildings();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    copySelectedBuildings,
    deleteSelectedBuildings,
    pasteCopiedBuildings,
    selectedBuildingIds.length,
  ]);

  return (
    <main className="grid h-screen w-screen grid-cols-[280px_minmax(0,1fr)_340px] overflow-hidden bg-slate-950 text-slate-100">
      <Toolbar />
      <FactoryCanvas />
      <PropertiesPanel building={selectedBuilding} />
    </main>
  );
}
