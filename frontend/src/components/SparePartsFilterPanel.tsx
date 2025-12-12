import * as React from "react";
import { useSparePartsFilters } from "../contexts/SparePartsFilterContext";
import { supabase } from "../utils/supabase";
const { useState, useEffect } = React;

const CATEGORIAS = [
  { value: "motor", label: "Motor" },
  { value: "transmision", label: "Transmisión" },
  { value: "suspension", label: "Suspensión" },
  { value: "frenos", label: "Frenos" },
  { value: "electrico", label: "Eléctrico" },
  { value: "carroceria", label: "Carrocería" },
  { value: "interior", label: "Interior" },
  { value: "aceites_lubricantes", label: "Aceites y Lubricantes" },
  { value: "filtros", label: "Filtros" },
  { value: "iluminacion", label: "Iluminación" },
  { value: "neumaticos", label: "Neumáticos" },
  { value: "baterias", label: "Baterías" },
  { value: "otros", label: "Otros" },
];

export const SparePartsFilterPanel: React.FC = () => {
  const { filters, setFilters } = useSparePartsFilters();
  const [localFilters, setLocalFilters] = useState(filters);
  const [marcas, setMarcas] = useState<string[]>([]);

  useEffect(() => {
    fetchMarcas();
  }, []);

  const fetchMarcas = async () => {
    try {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("marca");

      if (error) throw error;

      const uniqueMarcas = Array.from(
        new Set(data?.map((sp) => sp.marca).filter((m) => m && m.trim() !== ""))
      ).sort();

      setMarcas(uniqueMarcas);
    } catch (error) {
      console.error("Error cargando marcas de repuestos:", error);
    }
  };

  const handleChange = (field: string, value: string) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    setFilters(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      categoria: "",
      marca: "",
      minPrice: "",
      maxPrice: "",
      estado: "disponible",
      modeloCompatible: "",
    };
    setLocalFilters(clearedFilters);
    setFilters(clearedFilters);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-fit sticky top-4">
      <h2 className="text-xl font-bold mb-4">Filtrar Repuestos</h2>

      {/* Categoría */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categoría
        </label>
        <select
          value={localFilters.categoria}
          onChange={(e) => handleChange("categoria", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Marca */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Marca
        </label>
        <select
          value={localFilters.marca}
          onChange={(e) => handleChange("marca", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((marca) => (
            <option key={marca} value={marca}>
              {marca}
            </option>
          ))}
        </select>
      </div>

      {/* Modelo Compatible */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Modelo Compatible
        </label>
        <input
          type="text"
          placeholder="Ej: Mazda CX-5"
          value={localFilters.modeloCompatible}
          onChange={(e) => handleChange("modeloCompatible", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Rango de precio */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rango de precio (QTZ)
        </label>
        <div className="space-y-2">
          <div>
            <input
              type="number"
              placeholder="Precio mínimo"
              value={localFilters.minPrice}
              onChange={(e) => handleChange("minPrice", e.target.value)}
              min="0"
              step="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500 mt-1">Mín</span>
          </div>
          <div>
            <input
              type="number"
              placeholder="Precio máximo"
              value={localFilters.maxPrice}
              onChange={(e) => handleChange("maxPrice", e.target.value)}
              min="0"
              step="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500 mt-1">Máx</span>
          </div>
        </div>
      </div>

      {/* Estado */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Disponibilidad
        </label>
        <select
          value={localFilters.estado}
          onChange={(e) => handleChange("estado", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="disponible">Disponible</option>
          <option value="agotado">Agotado</option>
        </select>
      </div>

      {/* Botones */}
      <div className="space-y-2">
        <button
          onClick={handleApplyFilters}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
        >
          Aplicar Filtros
        </button>
        <button
          onClick={handleClearFilters}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded transition"
        >
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
};
