import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { useFilters } from "../contexts/FilterContext";

interface Vehicle {
  id: string;
  marca: string;
  linea: string;
  modelo_año: string;
  precio: number;
  estado: string;
  imagenes: string[];
  combustible: string;
  transmision: string;
  tipo: string;
}

export default function VehicleCatalog() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { filters } = useFilters();

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [vehicles, filters]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error cargando vehículos:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = vehicles;

    // Filtro por marca
    if (filters.marca) {
      filtered = filtered.filter((v) =>
        v.marca.toLowerCase().includes(filters.marca.toLowerCase())
      );
    }

    // Filtro por línea/modelo
    if (filters.linea) {
      filtered = filtered.filter((v) =>
        v.linea && v.linea.toLowerCase().includes(filters.linea.toLowerCase())
      );
    }

    // Filtro por precio mínimo
    if (filters.minPrice) {
      filtered = filtered.filter((v) => v.precio >= Number(filters.minPrice));
    }

    // Filtro por precio máximo
    if (filters.maxPrice) {
      filtered = filtered.filter((v) => v.precio <= Number(filters.maxPrice));
    }

    // Filtro por combustible
    if (filters.combustible) {
      filtered = filtered.filter(
        (v) =>
          v.combustible &&
          v.combustible.toLowerCase() === filters.combustible.toLowerCase()
      );
    }

    // Filtro por transmisión
    if (filters.transmision) {
      filtered = filtered.filter(
        (v) =>
          v.transmision &&
          v.transmision.toLowerCase() === filters.transmision.toLowerCase()
      );
    }

    // Filtro por estado (solo disponibles)
    if (filters.estado) {
      filtered = filtered.filter((v) => v.estado === filters.estado);
    }

    // Filtro por tipo
    if (filters.tipo) {
      filtered = filtered.filter((v) => v.tipo === filters.tipo);
    }

    setFilteredVehicles(filtered);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando vehículos...</p>
      </div>
    );
  }

  if (filteredVehicles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          {vehicles.length === 0
            ? "No hay vehículos disponibles"
            : "No hay vehículos que coincidan con los filtros"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {filteredVehicles.map((vehicle) => (
        <a key={vehicle.id} href={`/vehiculos/${vehicle.id}`} className="group">
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
            {/* Imagen del vehículo */}
            <div className="relative h-48 overflow-hidden bg-gray-200">
              {vehicle.imagenes && vehicle.imagenes.length > 0 ? (
                <>
                  <img
                    src={vehicle.imagenes[0]}
                    alt={`${vehicle.marca} ${vehicle.modelo_año}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  {vehicle.imagenes.length > 1 && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                      +{vehicle.imagenes.length - 1} fotos
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <span className="text-white text-6xl">🚗</span>
                </div>
              )}
            </div>

            {/* Información del vehículo */}
            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition">
                {vehicle.marca} {vehicle.modelo_año}
              </h3>
              
              <p className="text-blue-600 font-bold text-xl mt-2">
                QTZ {vehicle.precio.toLocaleString()}
              </p>

              <div className="text-xs text-gray-600 mt-3 space-y-1">
                {vehicle.combustible && (
                  <p>⛽ {vehicle.combustible}</p>
                )}
                {vehicle.transmision && (
                  <p>⚙️ {vehicle.transmision}</p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  vehicle.estado === "disponible" 
                    ? "bg-green-100 text-green-800"
                    : vehicle.estado === "vendido"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {vehicle.estado === "disponible" ? "Disponible" : 
                   vehicle.estado === "vendido" ? "Vendido" : 
                   "Reservado"}
                </span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
