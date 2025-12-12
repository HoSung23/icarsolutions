import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

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
  stock_minimo: number;
  imagenes: string[];
  estado: string;
  garantia_meses: number;
  notas: string;
  created_at: string;
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

const SparePartsInventory: React.FC = () => {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    categoria: "otros",
    marca: "",
    modelo_compatible: "",
    codigo_parte: "",
    precio: 0,
    precio_original: 0,
    descuento_porcentaje: 0,
    stock: 0,
    stock_minimo: 5,
    imagenes: "",
    estado: "disponible",
    garantia_meses: 0,
    notas: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkUserRole();
    fetchSpareParts();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("rol")
        .eq("id", user.id)
        .single();

      setUserRole(userData?.rol || "");
    } catch (error) {
      console.error("Error verificando rol:", error);
    }
  };

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

  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `spare-parts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("vehicle-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("vehicle-images")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const currentImages = formData.imagenes ? formData.imagenes.split(",").filter(Boolean) : [];
      setFormData({
        ...formData,
        imagenes: [...currentImages, ...uploadedUrls].join(","),
      });
    } catch (error) {
      console.error("Error subiendo imágenes:", error);
      alert("Error al subir imágenes");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const sparePartData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        categoria: formData.categoria,
        marca: formData.marca,
        modelo_compatible: formData.modelo_compatible
          ? formData.modelo_compatible.split(",").map(m => m.trim())
          : [],
        codigo_parte: formData.codigo_parte || null,
        precio: Number(formData.precio),
        precio_original: Number(formData.precio_original) || null,
        descuento_porcentaje: Number(formData.descuento_porcentaje) || 0,
        stock: Number(formData.stock),
        stock_minimo: Number(formData.stock_minimo) || 5,
        imagenes: formData.imagenes ? formData.imagenes.split(",").filter(Boolean) : [],
        estado: formData.estado,
        garantia_meses: Number(formData.garantia_meses) || 0,
        notas: formData.notas || null,
      };

      if (editingPart) {
        const { error } = await supabase
          .from("spare_parts")
          .update(sparePartData)
          .eq("id", editingPart.id);

        if (error) throw error;
        alert("Repuesto actualizado exitosamente");
      } else {
        const { error } = await supabase
          .from("spare_parts")
          .insert([sparePartData]);

        if (error) throw error;
        alert("Repuesto agregado exitosamente");
      }

      resetForm();
      fetchSpareParts();
    } catch (error: any) {
      console.error("Error guardando repuesto:", error);
      alert("Error: " + error.message);
    }
  };

  const handleEdit = (part: SparePart) => {
    setEditingPart(part);
    setFormData({
      nombre: part.nombre,
      descripcion: part.descripcion || "",
      categoria: part.categoria,
      marca: part.marca,
      modelo_compatible: part.modelo_compatible?.join(", ") || "",
      codigo_parte: part.codigo_parte || "",
      precio: part.precio,
      precio_original: part.precio_original || 0,
      descuento_porcentaje: part.descuento_porcentaje || 0,
      stock: part.stock,
      stock_minimo: part.stock_minimo || 5,
      imagenes: part.imagenes?.join(",") || "",
      estado: part.estado,
      garantia_meses: part.garantia_meses || 0,
      notas: part.notas || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este repuesto?")) return;

    try {
      const { error } = await supabase
        .from("spare_parts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchSpareParts();
    } catch (error) {
      console.error("Error eliminando repuesto:", error);
      alert("Error al eliminar repuesto");
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      categoria: "otros",
      marca: "",
      modelo_compatible: "",
      codigo_parte: "",
      precio: 0,
      precio_original: 0,
      descuento_porcentaje: 0,
      stock: 0,
      stock_minimo: 5,
      imagenes: "",
      estado: "disponible",
      garantia_meses: 0,
      notas: "",
    });
    setEditingPart(null);
    setShowForm(false);
  };

  const removeImage = (indexToRemove: number) => {
    const images = formData.imagenes.split(",").filter(Boolean);
    images.splice(indexToRemove, 1);
    setFormData({ ...formData, imagenes: images.join(",") });
  };

  if (loading) {
    return <div className="p-6 text-center">Cargando repuestos...</div>;
  }

  // Verificar permisos
  if (!["admin", "superadmin", "gerente", "vendedor"].includes(userRole)) {
    return (
      <div className="p-6 text-center text-red-600">
        No tienes permisos para acceder a esta sección
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Repuestos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold"
        >
          {showForm ? "Cancelar" : "+ Agregar Repuesto"}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingPart ? "Editar Repuesto" : "Nuevo Repuesto"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: Filtro de aceite"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Categoría *</label>
                <select
                  required
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Marca *</label>
                <input
                  type="text"
                  required
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: Bosch, Mobil, NGK"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Código de Parte</label>
                <input
                  type="text"
                  value={formData.codigo_parte}
                  onChange={(e) => setFormData({ ...formData, codigo_parte: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Código del fabricante"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Precio (QTZ) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Precio Original (QTZ)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precio_original}
                  onChange={(e) => setFormData({ ...formData, precio_original: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Para mostrar descuentos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descuento (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.descuento_porcentaje}
                  onChange={(e) => setFormData({ ...formData, descuento_porcentaje: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Stock *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Stock Mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Garantía (meses)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.garantia_meses}
                  onChange={(e) => setFormData({ ...formData, garantia_meses: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="disponible">Disponible</option>
                  <option value="agotado">Agotado</option>
                  <option value="descontinuado">Descontinuado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Modelos Compatibles</label>
              <input
                type="text"
                value={formData.modelo_compatible}
                onChange={(e) => setFormData({ ...formData, modelo_compatible: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Separados por comas: Mazda CX-5, Toyota Corolla"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={3}
                placeholder="Descripción del repuesto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={2}
                placeholder="Información adicional, instalación, etc."
              />
            </div>

            {/* Imágenes */}
            <div>
              <label className="block text-sm font-medium mb-1">Imágenes</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="w-full px-3 py-2 border rounded"
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-blue-600 mt-1">Subiendo imágenes...</p>}
              
              {formData.imagenes && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {formData.imagenes.split(",").filter(Boolean).map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Preview ${idx}`} className="w-full h-20 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold"
              >
                {editingPart ? "Actualizar" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded font-semibold"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de repuestos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Imagen</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Categoría</th>
                <th className="px-4 py-2 text-left">Marca</th>
                <th className="px-4 py-2 text-left">Precio</th>
                <th className="px-4 py-2 text-left">Stock</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {spareParts.map((part) => (
                <tr key={part.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {part.imagenes && part.imagenes.length > 0 ? (
                      <img
                        src={part.imagenes[0]}
                        alt={part.nombre}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        📦
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-semibold">{part.nombre}</div>
                    {part.codigo_parte && (
                      <div className="text-xs text-gray-500">{part.codigo_parte}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 capitalize">
                    {CATEGORIAS.find(c => c.value === part.categoria)?.label || part.categoria}
                  </td>
                  <td className="px-4 py-2">{part.marca}</td>
                  <td className="px-4 py-2">
                    <div className="font-semibold">Q{part.precio.toLocaleString()}</div>
                    {part.precio_original && part.precio_original > part.precio && (
                      <div className="text-xs text-gray-500 line-through">
                        Q{part.precio_original.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`font-semibold ${
                      part.stock === 0 ? "text-red-600" :
                      part.stock <= part.stock_minimo ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {part.stock}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      part.estado === "disponible" ? "bg-green-100 text-green-800" :
                      part.estado === "agotado" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {part.estado === "disponible" ? "Disponible" :
                       part.estado === "agotado" ? "Agotado" :
                       "Descontinuado"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(part)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        Editar
                      </button>
                      {["admin", "superadmin"].includes(userRole) && (
                        <button
                          onClick={() => handleDelete(part.id)}
                          className="text-red-600 hover:text-red-800 font-semibold text-sm"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {spareParts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay repuestos registrados
          </div>
        )}
      </div>
    </div>
  );
};

export default SparePartsInventory;
