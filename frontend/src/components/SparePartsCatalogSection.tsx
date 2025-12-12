import React from "react";
import { SparePartsFilterProvider } from "../contexts/SparePartsFilterContext";
import { SparePartsFilterPanel } from "./SparePartsFilterPanel";
import SparePartsCatalog from "./SparePartsCatalog";

export const SparePartsCatalogSection: React.FC = () => {
  return (
    <SparePartsFilterProvider>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar con filtros */}
        <div className="lg:col-span-1">
          <SparePartsFilterPanel />
        </div>

        {/* Grid de repuestos */}
        <div className="lg:col-span-3">
          <SparePartsCatalog />
        </div>
      </div>
    </SparePartsFilterProvider>
  );
};
