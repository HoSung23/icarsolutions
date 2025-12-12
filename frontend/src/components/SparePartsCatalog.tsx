import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { useSparePartsFilters } from "../contexts/SparePartsFilterContext";

interface SparePart {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  marca: string;
  modelo_compatible: string[];
  codigo_parte: string;
  precio: number;
  precio_original: number;
  descuento_porcentaje: number;
  stock: number;
  imagenes: string[];
  estado: string;
  garantia_meses: number;
}

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

export default function SparePartsCatalog() {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const { filters } = useSparePartsFilters();

  useEffect(() => {
    fetchSpareParts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [spareParts, filters]);

  const fetchSpareParts = async () => {
    try {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSpareParts(data || []);
    } catch (error) {
      console.error("Error cargando repuestos:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = spareParts;

    // Filtro por categoría
    if (filters.categoria) {
      filtered = filtered.filter((sp) => sp.categoria === filters.categoria);
    }

    // Filtro por marca
    if (filters.marca) {
      filtered = filtered.filter((sp) =>
        sp.marca.toLowerCase().includes(filters.marca.toLowerCase())
      );
    }

    // Filtro por modelo compatible
    if (filters.modeloCompatible) {
      filtered = filtered.filter((sp) =>
        sp.modelo_compatible?.some((modelo) =>
          modelo.toLowerCase().includes(filters.modeloCompatible.toLowerCase())
        )
      );
    }

    // Filtro por precio mínimo
    if (filters.minPrice) {
      filtered = filtered.filter((sp) => sp.precio >= Number(filters.minPrice));
    }

    // Filtro por precio máximo
    if (filters.maxPrice) {
      filtered = filtered.filter((sp) => sp.precio <= Number(filters.maxPrice));
    }

    // Filtro por estado
    if (filters.estado) {
      filtered = filtered.filter((sp) => sp.estado === filters.estado);
    }

    setFilteredParts(filtered);
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIAS.find((c) => c.value === value)?.label || value;
  };

  const handleWhatsApp = (part: SparePart) => {
    const message = `Hola, estoy interesado en el repuesto: ${part.nombre} - Q${part.precio.toLocaleString()}`;
    const whatsappUrl = `https://wa.me/50236826547?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando repuestos...</p>
      </div>
    );
  }

  if (filteredParts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          {spareParts.length === 0
            ? "No hay repuestos disponibles"
            : "No hay repuestos que coincidan con los filtros"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredParts.map((part) => (
        <div
          key={part.id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
        >
          {/* Imagen */}
          <div className="relative h-48 overflow-hidden bg-gray-200">
            {part.imagenes && part.imagenes.length > 0 ? (
              <img
                src={part.imagenes[0]}
                alt={part.nombre}
                className="w-full h-full object-cover hover:scale-105 transition"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <span className="text-white text-6xl">📦</span>
              </div>
            )}
            
            {/* Badge de descuento */}
            {part.precio_original && part.precio_original > part.precio && (
              <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                -{part.descuento_porcentaje}%
              </div>
            )}

            {/* Badge de stock */}
            {part.stock === 0 && (
              <div className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 rounded text-xs font-semibold">
                Agotado
              </div>
            )}
          </div>

          {/* Información */}
          <div className="p-4">
            <div className="text-xs text-blue-600 font-semibold mb-1 uppercase">
              {getCategoryLabel(part.categoria)}
            </div>
            
            <h3 className="font-bold text-lg text-gray-900 mb-1">
              {part.nombre}
            </h3>

            <p className="text-sm text-gray-600 mb-2">{part.marca}</p>

            {part.codigo_parte && (
              <p className="text-xs text-gray-500 mb-2">
                Código: {part.codigo_parte}
              </p>
            )}

            {/* Precio */}
            <div className="mb-3">
              {part.precio_original && part.precio_original > part.precio ? (
                <div>
                  <span className="text-gray-500 line-through text-sm">
                    Q{part.precio_original.toLocaleString()}
                  </span>
                  <p className="text-blue-600 font-bold text-xl">
                    Q{part.precio.toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-blue-600 font-bold text-xl">
                  Q{part.precio.toLocaleString()}
                </p>
              )}
            </div>

            {/* Garantía */}
            {part.garantia_meses > 0 && (
              <p className="text-xs text-green-600 mb-2">
                ✓ Garantía: {part.garantia_meses} meses
              </p>
            )}

            {/* Modelos compatibles */}
            {part.modelo_compatible && part.modelo_compatible.length > 0 && (
              <div className="text-xs text-gray-600 mb-3">
                <p className="font-semibold">Compatible con:</p>
                <p className="truncate">{part.modelo_compatible.slice(0, 2).join(", ")}</p>
              </div>
            )}

            {/* Stock info */}
            <div className="mb-3">
              {part.stock > 0 ? (
                <span className="text-xs text-green-600 font-semibold">
                  ✓ {part.stock} en stock
                </span>
              ) : (
                <span className="text-xs text-red-600 font-semibold">
                  Sin stock
                </span>
              )}
            </div>

            {/* Botón de contacto */}
            <button
              onClick={() => handleWhatsApp(part)}
              disabled={part.stock === 0}
              className={`w-full py-2 rounded font-semibold transition ${
                part.stock === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {part.stock === 0 ? "No Disponible" : "Consultar por WhatsApp"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
