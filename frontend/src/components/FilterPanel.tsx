import * as React from "react";
import { useFilters } from "../contexts/FilterContext";
import { supabase } from "../utils/supabase";
const { useState, useEffect } = React;

export const FilterPanel: React.FC = () => {
  const { filters, setFilters } = useFilters();
  const [localFilters, setLocalFilters] = useState(filters);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [lineas, setLineas] = useState<string[]>([]);

  useEffect(() => {
    fetchMarcas();
  }, []);

  useEffect(() => {
    if (localFilters.marca) {
      fetchLineasByMarca(localFilters.marca);
    } else {
      setLineas([]);
      // Limpiar línea si no hay marca seleccionada
      if (localFilters.linea) {
        handleChange("linea", "");
      }
    }
  }, [localFilters.marca]);

  const fetchMarcas = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("marca");

      if (error) throw error;

      // Extraer marcas únicas y ordenarlas
      const uniqueMarcas = Array.from(
        new Set(data?.map((v) => v.marca).filter((m) => m && m.trim() !== ""))
      ).sort();

      setMarcas(uniqueMarcas);
    } catch (error) {
      console.error("Error cargando marcas:", error);
    }
  };

  const fetchLineasByMarca = async (marca: string) => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("linea")
        .eq("marca", marca);

      if (error) throw error;

      // Extraer líneas únicas y ordenarlas
      const uniqueLineas = Array.from(
        new Set(data?.map((v) => v.linea).filter((l) => l && l.trim() !== ""))
      ).sort();

      setLineas(uniqueLineas);
    } catch (error) {
      console.error("Error cargando líneas:", error);
      setLineas([]);
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
      marca: "",
      linea: "",
      minPrice: "",
      maxPrice: "",
      combustible: "",
      transmision: "",
      estado: "disponible",
      tipo: "",
    };
    setLocalFilters(clearedFilters);
    setFilters(clearedFilters);
    setLineas([]);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-fit sticky top-4">
      <h2 className="text-xl font-bold mb-4">Filtros</h2>

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

      {/* Línea/Modelo - Solo visible cuando hay una marca seleccionada */}
      {localFilters.marca && lineas.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Línea/Modelo
          </label>
          <select
            value={localFilters.linea}
            onChange={(e) => handleChange("linea", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las líneas</option>
            {lineas.map((linea) => (
              <option key={linea} value={linea}>
                {linea}
              </option>
            ))}
          </select>
        </div>
      )}

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
              step="1000"
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
              step="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500 mt-1">Máx</span>
          </div>
        </div>
      </div>

      {/* Combustible */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Combustible
        </label>
        <select
          value={localFilters.combustible}
          onChange={(e) => handleChange("combustible", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="Gasolina">Gasolina</option>
          <option value="Diésel">Diésel</option>
          <option value="Híbrido">Híbrido</option>
          <option value="Eléctrico">Eléctrico</option>
        </select>
      </div>

      {/* Transmisión */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transmisión
        </label>
        <select
          value={localFilters.transmision}
          onChange={(e) => handleChange("transmision", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="Manual">Manual</option>
          <option value="Automática">Automática</option>
          <option value="CVT">CVT</option>
        </select>
      </div>

      {/* Tipo de Vehículo */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Vehículo
        </label>
        <select
          value={localFilters.tipo}
          onChange={(e) => handleChange("tipo", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          <option value="Sedán">Sedán</option>
          <option value="SUV">SUV</option>
          <option value="Pickup">Pickup</option>
          <option value="Hatchback">Hatchback</option>
          <option value="Coupé">Coupé</option>
          <option value="Convertible">Convertible</option>
          <option value="Van">Van</option>
          <option value="Camión">Camión</option>
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
