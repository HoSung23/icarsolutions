import React, { useState } from "react";
import { FilterProvider } from "../contexts/FilterContext";
import { FilterPanel } from "./FilterPanel";
import VehicleCatalog from "./VehicleCatalog";
import { SparePartsFilterProvider } from "../contexts/SparePartsFilterContext";
import { SparePartsFilterPanel } from "./SparePartsFilterPanel";
import SparePartsCatalog from "./SparePartsCatalog";

export const UnifiedCatalogSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"vehicles" | "spare-parts">("vehicles");

  return (
    <div>
      {/* Tabs / Botones de cambio */}
      <div className="flex gap-4 mb-8 justify-center">
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === "vehicles"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          🚗 Vehículos
        </button>
        <button
          onClick={() => setActiveTab("spare-parts")}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === "spare-parts"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          🔧 Repuestos
        </button>
      </div>

      {/* Título dinámico */}
      <h2 className="text-3xl font-bold mb-8">
        {activeTab === "vehicles" ? "Nuestro Catálogo de Vehículos" : "Repuestos y Autopartes"}
      </h2>
      {activeTab === "spare-parts" && (
        <p className="text-gray-600 mb-8">Encuentra repuestos originales y de calidad para tu vehículo</p>
      )}

      {/* Contenido según tab activo */}
      {activeTab === "vehicles" ? (
        <FilterProvider>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <FilterPanel />
            </div>
            <div className="lg:col-span-3">
              <VehicleCatalog />
            </div>
          </div>
        </FilterProvider>
      ) : (
        <SparePartsFilterProvider>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <SparePartsFilterPanel />
            </div>
            <div className="lg:col-span-3">
              <SparePartsCatalog />
            </div>
          </div>
        </SparePartsFilterProvider>
      )}
    </div>
  );
};
