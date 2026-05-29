import { useMemo } from "react";
import { FactoryCanvas } from "./FactoryCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { Toolbar } from "./Toolbar";
import { useFactoryStore } from "../store/factoryStore";

export function FactoryEditor() {
  const buildings = useFactoryStore((state) => state.buildings);
  const selectedBuildingId = useFactoryStore((state) => state.selectedBuildingId);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );

  return (
    <main className="grid h-screen w-screen grid-cols-[280px_minmax(0,1fr)_340px] overflow-hidden bg-slate-950 text-slate-100">
      <Toolbar />
      <FactoryCanvas />
      <PropertiesPanel building={selectedBuilding} />
    </main>
  );
}
