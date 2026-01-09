import React, { useState, useEffect } from "react";
import { supabase, ensureValidSession } from "../utils/supabase";

interface Vehicle {
  id: string;
  marca: string;
  modelo_año: string;
  precio: number;
  precio_original?: number;
  descuento_porcentaje?: number;
  estado: string;
  imagenes: string[];
}

const VehicleInventory: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showViewImagesModal, setShowViewImagesModal] = useState(false);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [editingImageOrder, setEditingImageOrder] = useState(false);
  const [tempImageOrder, setTempImageOrder] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<Map<string, number>>(new Map());
  const [priceData, setPriceData] = useState({
    precio: "",
    descuento_porcentaje: "",
  });
  const [formData, setFormData] = useState({
    marca: "",
    modelo_año: "",
    precio: "",
    estado: "disponible",
    tipo: "",
    cilindraje: "",
    linea: "",
    origen: "",
    motor: "",
    combustible: "",
    transmision: "",
    marchas: "",
    recorrido: "",
    extras: "",
    detalles: "",
  });

  useEffect(() => {
    fetchVehicles();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log("=== DEBUG SESIÓN ===");
    console.log("Session existe:", !!session);
    console.log("User ID:", session?.user?.id);
    console.log("Email:", session?.user?.email);
    console.log("Access token existe:", !!session?.access_token);
    console.log("Token preview:", session?.access_token?.substring(0, 30) + "...");
    
    if (session?.user?.id) {
      const { data: userData } = await supabase
        .from("users")
        .select("rol, email")
        .eq("id", session.user.id)
        .single();
      console.log("Rol del usuario:", userData?.rol);
    }
    console.log("===================");
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setVehicles(data || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar vehículos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError("");
    
    try {
      // Verificar sesión activa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("No hay sesión activa. Por favor inicia sesión nuevamente.");
      }

      // Verificar rol del usuario
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("rol, email")
        .eq("id", session.user.id)
        .single();

      console.log("Usuario actual:", userData);

      if (userError || !userData) {
        throw new Error("No se pudo verificar el usuario");
      }

      if (!["admin", "superadmin", "gerente", "vendedor"].includes(userData.rol)) {
        throw new Error(`Tu rol (${userData.rol}) no tiene permisos para agregar vehículos`);
      }

      // 1. Subir imágenes a Supabase Storage
      const imageUrls: string[] = [];
      
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileName = `${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("vehicle-images")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Obtener URL pública
          const { data: publicUrlData } = supabase.storage
            .from("vehicle-images")
            .getPublicUrl(fileName);

          imageUrls.push(publicUrlData.publicUrl);
        }
      }

      // 2. Insertar vehículo con URLs de imágenes
      const { error: insertError } = await supabase
        .from("vehicles")
        .insert({
          marca: formData.marca || "",
          modelo_año: formData.modelo_año || "",
          precio: parseFloat(formData.precio) || 0,
          estado: formData.estado || "disponible",
          tipo: formData.tipo || "",
          imagenes: imageUrls.length > 0 ? imageUrls : [],
          cilindraje: parseFloat(formData.cilindraje) || 0,
          linea: formData.linea || "",
          origen: formData.origen || "",
          motor: formData.motor || "",
          combustible: formData.combustible || "",
          transmision: formData.transmision || "",
          marchas: parseInt(formData.marchas) || 0,
          recorrido: parseFloat(formData.recorrido) || 0,
          extras: formData.extras || "",
          detalles: formData.detalles || "",
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error al insertar:", insertError);
        throw insertError;
      }

      setFormData({ 
        marca: "", 
        modelo_año: "", 
        precio: "", 
        estado: "disponible", 
        tipo: "",
        cilindraje: "",
        linea: "",
        origen: "",
        motor: "",
        combustible: "",
        transmision: "",
        marchas: "",
        recorrido: "",
        extras: "",
        detalles: "",
      });
      setImageFiles([]);
      setShowModal(false);
      fetchVehicles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-blue-500", "bg-blue-50");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-blue-500", "bg-blue-50");
    
    const files = e.dataTransfer.files;
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        setImageFiles(imageFiles);
      } else {
        setError("Solo se permiten archivos de imagen");
      }
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const handleAddImagesToVehicle = async () => {
    if (!selectedVehicleId || imageFiles.length === 0) return;

    setUploading(true);
    try {
      // Verificar sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sesión expirada. Por favor inicia sesión nuevamente.");
        setUploading(false);
        return;
      }
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      const existingImages = vehicle?.imagenes || [];
      const imageUrls: string[] = [...existingImages];
      
      for (const file of imageFiles) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("vehicle-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("vehicle-images")
          .getPublicUrl(fileName);

        imageUrls.push(publicUrlData.publicUrl);
      }

      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ imagenes: imageUrls })
        .eq("id", selectedVehicleId);

      if (updateError) throw updateError;

      setImageFiles([]);
      setShowImageModal(false);
      setSelectedVehicleId(null);
      fetchVehicles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleChangeStatus = async (id: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ estado: newStatus })
        .eq("id", id);

      if (updateError) throw updateError;
      fetchVehicles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("¿Eliminar este vehículo?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      fetchVehicles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenPriceModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setPriceData({
      precio: vehicle.precio_original?.toString() || vehicle.precio.toString(),
      descuento_porcentaje: vehicle.descuento_porcentaje?.toString() || "",
    });
    setShowPriceModal(true);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...tempImageOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setTempImageOrder(newOrder);
  };

  const handleImageClick = (imageUrl: string) => {
    if (!editingImageOrder) return;

    const newSelectedImages = new Map(selectedImages);
    
    if (newSelectedImages.has(imageUrl)) {
      // Si ya está seleccionada, la deseleccionamos
      const removedNumber = newSelectedImages.get(imageUrl)!;
      newSelectedImages.delete(imageUrl);
      
      // Reajustar los números de las imágenes que vienen después
      newSelectedImages.forEach((value, key) => {
        if (value > removedNumber) {
          newSelectedImages.set(key, value - 1);
        }
      });
    } else {
      // Si no está seleccionada, le asignamos el siguiente número
      const nextNumber = newSelectedImages.size + 1;
      newSelectedImages.set(imageUrl, nextNumber);
    }
    
    setSelectedImages(newSelectedImages);
  };

  const applyImageOrder = () => {
    // Ordenar las imágenes según los números asignados
    const sortedImages = Array.from(selectedImages.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([url]) => url);
    
    // Agregar las imágenes no seleccionadas al final
    const unselectedImages = tempImageOrder.filter(url => !selectedImages.has(url));
    
    setTempImageOrder([...sortedImages, ...unselectedImages]);
    setSelectedImages(new Map());
  };

  const clearSelection = () => {
    setSelectedImages(new Map());
  };

  const handleSaveImageOrder = async () => {
    if (!viewingVehicle) return;

    try {
      // Asegurar sesión válida
      const session = await ensureValidSession();
      console.log("Guardando orden de imágenes con token:", session.access_token.substring(0, 20) + "...");
      
      const { error } = await supabase
        .from("vehicles")
        .update({ imagenes: tempImageOrder })
        .eq("id", viewingVehicle.id);

      if (error) {
        console.error("Error al guardar orden:", error);
        throw error;
      }

      setEditingImageOrder(false);
      fetchVehicles();
      
      // Actualizar el vehículo que estamos viendo
      setViewingVehicle({ ...viewingVehicle, imagenes: tempImageOrder });
    } catch (err: any) {
      console.error("Error completo:", err);
      setError(err.message);
    }
  };

  const handleUpdatePrice = async () => {
    if (!selectedVehicle) return;

    try {
      // Asegurar sesión válida
      const session = await ensureValidSession();

      const precioOriginal = parseFloat(priceData.precio);
      const descuento = parseFloat(priceData.descuento_porcentaje) || 0;
      
      if (isNaN(precioOriginal) || precioOriginal <= 0) {
        setError("El precio debe ser un número válido mayor a 0");
        return;
      }

      if (descuento < 0 || descuento > 100) {
        setError("El descuento debe estar entre 0 y 100");
        return;
      }

      const precioFinal = descuento > 0 
        ? precioOriginal * (1 - descuento / 100)
        : precioOriginal;

      console.log("Intentando actualizar con token:", session.access_token.substring(0, 20) + "...");

      const { error: updateError } = await supabase
        .from("vehicles")
        .update({
          precio_original: precioOriginal,
          precio: precioFinal,
          descuento_porcentaje: descuento > 0 ? descuento : null,
        })
        .eq("id", selectedVehicle.id);

      if (updateError) {
        console.error("Error completo:", updateError);
        throw updateError;
      }

      setShowPriceModal(false);
      setSelectedVehicle(null);
      setPriceData({ precio: "", descuento_porcentaje: "" });
      fetchVehicles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500">Cargando vehículos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Inventario de Vehículos</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          + Agregar Vehículo
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6">Agregar Vehículo</h3>
            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Marca *"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <input
                  type="text"
                  placeholder="Modelo/Año *"
                  value={formData.modelo_año}
                  onChange={(e) => setFormData({ ...formData, modelo_año: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Línea"
                  value={formData.linea}
                  onChange={(e) => setFormData({ ...formData, linea: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Precio *"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Tipo de vehículo *</option>
                  <option value="Sedán">Sedán</option>
                  <option value="SUV">SUV</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="Coupé">Coupé</option>
                  <option value="Convertible">Convertible</option>
                  <option value="Van">Van</option>
                  <option value="Camión">Camión</option>
                </select>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="disponible">Disponible</option>
                  <option value="vendido">Vendido</option>
                  <option value="reservado">Reservado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Origen"
                  value={formData.origen}
                  onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Motor"
                  value={formData.motor}
                  onChange={(e) => setFormData({ ...formData, motor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={formData.combustible}
                  onChange={(e) => setFormData({ ...formData, combustible: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Combustible</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diésel">Diésel</option>
                  <option value="Eléctrico">Eléctrico</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
                <select
                  value={formData.transmision}
                  onChange={(e) => setFormData({ ...formData, transmision: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Transmisión</option>
                  <option value="Manual">Manual</option>
                  <option value="Automática">Automática</option>
                  <option value="CVT">CVT</option>
                  <option value="Dual Clutch">Dual Clutch</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder="Cilindraje"
                  value={formData.cilindraje}
                  onChange={(e) => setFormData({ ...formData, cilindraje: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Marchas"
                  value={formData.marchas}
                  onChange={(e) => setFormData({ ...formData, marchas: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Recorrido (km)"
                  value={formData.recorrido}
                  onChange={(e) => setFormData({ ...formData, recorrido: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Extras (AC, Sunroof, etc.)
                  </span>
                </label>
                <textarea
                  placeholder="Ej: Aire acondicionado, Sunroof panorámico, Asientos de cuero, Sensores de reversa, Cámara trasera..."
                  value={formData.extras}
                  onChange={(e) => setFormData({ ...formData, extras: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Detalles / Desperfectos
                  </span>
                </label>
                <textarea
                  placeholder="Ej: Raspón en puerta trasera, Pintura retocada en parachoques, Requiere cambio de llanta..."
                  value={formData.detalles}
                  onChange={(e) => setFormData({ ...formData, detalles: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imágenes del Vehículo
                </label>
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition"
                >
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-sm text-gray-600 mb-2">
                    Arrastra imágenes aquí o haz clic para seleccionar
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition"
                  >
                    Seleccionar archivos
                  </label>
                </div>

                {/* Preview de imágenes seleccionadas */}
                {imageFiles.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {imageFiles.length} imagen(es) seleccionada(s):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from(imageFiles).map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition"
                          >
                            ✕
                          </button>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {file.name.substring(0, 15)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {uploading ? "Subiendo..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Agregar Imágenes</h3>
            
            {/* Información del vehículo */}
            {selectedVehicleId && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Editando vehículo:</p>
                <div className="flex items-center gap-3">
                  {vehicles.find(v => v.id === selectedVehicleId)?.imagenes?.[0] && (
                    <img
                      src={vehicles.find(v => v.id === selectedVehicleId)?.imagenes[0]}
                      alt="Vehículo"
                      className="w-16 h-16 object-cover rounded border-2 border-blue-300"
                    />
                  )}
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {vehicles.find(v => v.id === selectedVehicleId)?.marca}{" "}
                      {vehicles.find(v => v.id === selectedVehicleId)?.modelo_año}
                    </p>
                    <p className="text-sm text-gray-600">
                      {vehicles.find(v => v.id === selectedVehicleId)?.imagenes?.length || 0} imágenes actuales
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition mb-4"
            >
              <div className="text-3xl mb-2">📸</div>
              <p className="text-sm text-gray-600 mb-2">
                Arrastra imágenes aquí
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="file-input-modal"
              />
              <label
                htmlFor="file-input-modal"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition"
              >
                Seleccionar archivos
              </label>
            </div>

            {/* Preview de imágenes */}
            {imageFiles.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {imageFiles.length} imagen(es)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from(imageFiles).map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddImagesToVehicle}
                disabled={uploading || imageFiles.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {uploading ? "Subiendo..." : "Agregar Imágenes"}
              </button>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageFiles([]);
                  setSelectedVehicleId(null);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded-lg font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Imagen</th>
              <th className="px-4 py-2 text-left">Vehículo</th>
              <th className="px-4 py-2 text-left">Detalles</th>
              <th className="px-4 py-2 text-left">Precio</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  {vehicle.imagenes && vehicle.imagenes.length > 0 ? (
                    <div className="flex gap-1">
                      <img
                        src={vehicle.imagenes[0]}
                        alt={`${vehicle.marca} ${vehicle.modelo_año}`}
                        className="w-16 h-16 object-cover rounded cursor-pointer hover:shadow-lg transition"
                        title={`${vehicle.imagenes.length} imagen(es)`}
                      />
                      {vehicle.imagenes.length > 1 && (
                        <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-semibold text-sm cursor-pointer hover:shadow-lg transition">
                          +{vehicle.imagenes.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                      Sin imagen
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="font-bold text-gray-900">{vehicle.marca}</div>
                  <div className="text-sm text-gray-600">{vehicle.modelo_año}</div>
                  <div className="text-xs text-gray-500 mt-1">ID: {vehicle.id.substring(0, 8)}...</div>
                </td>
                <td className="px-4 py-2">
                  <div className="text-sm space-y-1">
                    {(vehicle as any).linea && (
                      <div className="text-gray-700">📋 {(vehicle as any).linea}</div>
                    )}
                    {(vehicle as any).combustible && (
                      <div className="text-gray-600">⛽ {(vehicle as any).combustible}</div>
                    )}
                    {(vehicle as any).transmision && (
                      <div className="text-gray-600">⚙️ {(vehicle as any).transmision}</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    {vehicle.descuento_porcentaje && vehicle.descuento_porcentaje > 0 ? (
                      <>
                        <span className="text-gray-400 line-through text-sm">QTZ {vehicle.precio_original?.toLocaleString()}</span>
                        <span className="text-green-600 font-bold">QTZ {vehicle.precio.toLocaleString()}</span>
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-1 w-fit">
                          -{vehicle.descuento_porcentaje}%
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold">QTZ {vehicle.precio.toLocaleString()}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={vehicle.estado}
                    onChange={(e) => handleChangeStatus(vehicle.id, e.target.value)}
                    className={`px-2 py-1 rounded text-sm font-semibold border-0 cursor-pointer ${
                      vehicle.estado === "disponible" ? "bg-green-100 text-green-800" :
                      vehicle.estado === "vendido" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    <option value="disponible">disponible</option>
                    <option value="vendido">vendido</option>
                    <option value="reservado">reservado</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setViewingVehicle(vehicle);
                        setShowViewImagesModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                    >
                      👁️ Ver ({vehicle.imagenes?.length || 0})
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVehicleId(vehicle.id);
                        setShowImageModal(true);
                        setImageFiles([]);
                      }}
                      className="text-purple-600 hover:text-purple-800 font-semibold text-sm"
                    >
                      📸 Agregar
                    </button>
                    <button
                      onClick={() => handleOpenPriceModal(vehicle)}
                      className="text-green-600 hover:text-green-800 font-semibold text-sm"
                    >
                      💵 Precio
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      className="text-red-600 hover:text-red-800 font-semibold text-sm"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vehicles.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-4">No hay vehículos en el inventario</p>
      )}

      {/* Modal de Editar Precio */}
      {showPriceModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Editar Precio</h3>
              <button
                onClick={() => {
                  setShowPriceModal(false);
                  setSelectedVehicle(null);
                  setError("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Editando vehículo:</p>
              <div className="flex items-center gap-3">
                {selectedVehicle.imagenes?.[0] && (
                  <img
                    src={selectedVehicle.imagenes[0]}
                    alt={`${selectedVehicle.marca} ${selectedVehicle.modelo_año}`}
                    className="w-20 h-20 object-cover rounded border-2 border-blue-300"
                  />
                )}
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    {selectedVehicle.marca} {selectedVehicle.modelo_año}
                  </p>
                  <p className="text-sm text-gray-600">
                    Precio actual: QTZ {selectedVehicle.precio.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Precio Base (QTZ)
                </label>
                <input
                  type="number"
                  value={priceData.precio}
                  onChange={(e) => setPriceData({ ...priceData, precio: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 150000"
                  step="1000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descuento (%)
                </label>
                <input
                  type="number"
                  value={priceData.descuento_porcentaje}
                  onChange={(e) => setPriceData({ ...priceData, descuento_porcentaje: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 10 (deja vacío si no hay descuento)"
                  step="1"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa 0 o deja vacío para eliminar el descuento
                </p>
              </div>

              {priceData.precio && parseFloat(priceData.precio) > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                  {priceData.descuento_porcentaje && parseFloat(priceData.descuento_porcentaje) > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-500 line-through">
                          QTZ {parseFloat(priceData.precio).toLocaleString()}
                        </span>
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold">
                          -{priceData.descuento_porcentaje}%
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        QTZ {(parseFloat(priceData.precio) * (1 - parseFloat(priceData.descuento_porcentaje) / 100)).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Ahorro: QTZ {(parseFloat(priceData.precio) * (parseFloat(priceData.descuento_porcentaje) / 100)).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-xl font-bold text-gray-900">
                      QTZ {parseFloat(priceData.precio).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdatePrice}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold"
                >
                  Guardar Cambios
                </button>
                <button
                  onClick={() => {
                    setShowPriceModal(false);
                    setSelectedVehicle(null);
                    setError("");
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ver Imágenes */}
      {showViewImagesModal && viewingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {viewingVehicle.marca} {viewingVehicle.modelo_año}
                </h3>
                <p className="text-gray-600">
                  {viewingVehicle.imagenes?.length || 0} imagen(es)
                </p>
              </div>
              <div className="flex gap-2 items-center">
                {!editingImageOrder && viewingVehicle.imagenes?.length > 1 && (
                  <button
                    onClick={() => {
                      setEditingImageOrder(true);
                      setTempImageOrder([...viewingVehicle.imagenes]);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    🔄 Ordenar
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowViewImagesModal(false);
                    setViewingVehicle(null);
                    setEditingImageOrder(false);
                    setTempImageOrder([]);
                    setSelectedImages(new Map());
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {editingImageOrder && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  ✏️ Modo de Edición - Haz click en las imágenes para ordenarlas
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  • Haz click en una imagen para asignarle un número (1, 2, 3...)<br/>
                  • La primera imagen será la principal del catálogo<br/>
                  • Haz click de nuevo para deseleccionar
                </p>
                {selectedImages.size > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={applyImageOrder}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      ✓ Aplicar Orden ({selectedImages.size} seleccionadas)
                    </button>
                    <button
                      onClick={clearSelection}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      Limpiar Selección
                    </button>
                  </div>
                )}
              </div>
            )}

            {viewingVehicle.imagenes && viewingVehicle.imagenes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(editingImageOrder ? tempImageOrder : viewingVehicle.imagenes).map((url, index) => {
                  const selectionNumber = selectedImages.get(url);
                  const isSelected = selectedImages.has(url);
                  
                  return (
                    <div 
                      key={index} 
                      className={`relative group cursor-pointer transition-all ${
                        editingImageOrder && isSelected ? 'ring-4 ring-blue-500 rounded-lg' : ''
                      }`}
                      onClick={() => handleImageClick(url)}
                    >
                      {/* Número de orden asignado o posición actual */}
                      <div className={`absolute top-2 left-2 ${
                        isSelected
                          ? 'bg-blue-600 scale-110 shadow-lg' 
                          : editingImageOrder && index === 0 
                            ? 'bg-green-600' 
                            : 'bg-gray-600'
                      } text-white px-3 py-1 rounded-full text-sm font-bold z-10 transition-all ${
                        isSelected ? 'animate-pulse' : ''
                      }`}>
                        {isSelected 
                          ? `✓ ${selectionNumber}` 
                          : editingImageOrder && index === 0 
                            ? '⭐ Principal' 
                            : `#${index + 1}`}
                      </div>
                      
                      <img
                        src={url}
                        alt={`${viewingVehicle.marca} ${viewingVehicle.modelo_año} - Imagen ${index + 1}`}
                        className={`w-full h-64 object-cover rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 brightness-110' 
                            : editingImageOrder 
                              ? 'border-gray-300 hover:border-blue-400' 
                              : 'border-gray-200 hover:border-blue-400'
                        }`}
                      />
                      
                      {!editingImageOrder && (
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(url, '_blank');
                            }}
                            className="bg-white hover:bg-gray-100 text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold shadow-lg"
                          >
                            🔍 Ampliar
                          </button>
                        </div>
                      )}

                      {editingImageOrder && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            {isSelected ? 'Click para deseleccionar' : 'Click para seleccionar'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-gray-500">Este vehículo no tiene imágenes</p>
                <button
                  onClick={() => {
                    setShowViewImagesModal(false);
                    setViewingVehicle(null);
                    setSelectedVehicleId(viewingVehicle.id);
                    setShowImageModal(true);
                  }}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Agregar Imágenes
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {editingImageOrder ? (
                <>
                  <button
                    onClick={handleSaveImageOrder}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    ✓ Guardar Orden
                  </button>
                  <button
                    onClick={() => {
                      setEditingImageOrder(false);
                      setTempImageOrder([]);
                      setSelectedImages(new Map());
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowViewImagesModal(false);
                    setViewingVehicle(null);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleInventory;
