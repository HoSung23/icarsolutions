import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  color: string;
  kilometraje: number;
  numero_vin: string;
  fecha_compra: string;
  notas: string;
  proximo_servicio: string;
  tipo_proximo_servicio: string;
  created_at: string;
}

interface ServiceReminder {
  id: string;
  tipo_servicio: string;
  fecha_programada: string;
  kilometraje_programado: number;
  descripcion: string;
  completado: boolean;
}

export default function ClientVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<ServiceReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    placa: "",
    color: "",
    kilometraje: 0,
    numero_vin: "",
    fecha_compra: "",
    notas: "",
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("client_vehicles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Cargar recordatorios para los vehículos
      if (vehiclesData && vehiclesData.length > 0) {
        const vehicleIds = vehiclesData.map((v) => v.id);
        const { data: remindersData, error: remindersError } = await supabase
          .from("service_reminders")
          .select("*")
          .in("vehicle_id", vehicleIds)
          .eq("completado", false)
          .order("fecha_programada", { ascending: true });

        if (!remindersError) {
          setReminders(remindersData || []);
        }
      }
    } catch (error) {
      console.error("Error cargando vehículos:", error);
      alert("Error al cargar tus vehículos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingVehicle) {
        // Actualizar vehículo existente
        const { error } = await supabase
          .from("client_vehicles")
          .update(formData)
          .eq("id", editingVehicle.id);

        if (error) throw error;
        alert("Vehículo actualizado exitosamente");
      } else {
        // Crear nuevo vehículo
        const { error } = await supabase
          .from("client_vehicles")
          .insert({
            ...formData,
            user_id: user.id,
          });

        if (error) throw error;
        alert("Vehículo registrado exitosamente");
      }

      resetForm();
      loadVehicles();
    } catch (error: any) {
      console.error("Error guardando vehículo:", error);
      alert("Error al guardar el vehículo: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este vehículo?")) return;

    try {
      const { error } = await supabase
        .from("client_vehicles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      alert("Vehículo eliminado exitosamente");
      loadVehicles();
    } catch (error: any) {
      console.error("Error eliminando vehículo:", error);
      alert("Error al eliminar el vehículo");
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      anio: vehicle.anio,
      placa: vehicle.placa || "",
      color: vehicle.color || "",
      kilometraje: vehicle.kilometraje || 0,
      numero_vin: vehicle.numero_vin || "",
      fecha_compra: vehicle.fecha_compra || "",
      notas: vehicle.notas || "",
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      placa: "",
      color: "",
      kilometraje: 0,
      numero_vin: "",
      fecha_compra: "",
      notas: "",
    });
    setEditingVehicle(null);
    setShowAddForm(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No especificada";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-GT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Vehículos</h1>
            <p className="text-gray-600 mt-2">
              Registra tus vehículos para recibir recordatorios de servicio
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            {showAddForm ? "Cancelar" : "➕ Agregar Vehículo"}
          </button>
        </div>

        {/* Recordatorios pendientes */}
        {reminders.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Recordatorios Pendientes ({reminders.length})
            </h3>
            <div className="space-y-2">
              {reminders.slice(0, 3).map((reminder) => (
                <div key={reminder.id} className="text-sm text-yellow-700">
                  • {reminder.tipo_servicio} - {formatDate(reminder.fecha_programada)}
                  {reminder.descripcion && ` - ${reminder.descripcion}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de agregar/editar vehículo */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingVehicle ? "Editar Vehículo" : "Agregar Nuevo Vehículo"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Toyota, Honda, Ford..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Corolla, Civic, F-150..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año *
                </label>
                <input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.anio}
                  onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placa
                </label>
                <input
                  type="text"
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="P123ABC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rojo, Azul, Negro..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kilometraje
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.kilometraje}
                  onChange={(e) => setFormData({ ...formData, kilometraje: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número VIN
                </label>
                <input
                  type="text"
                  maxLength={17}
                  value={formData.numero_vin}
                  onChange={(e) => setFormData({ ...formData, numero_vin: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="17 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Compra
                </label>
                <input
                  type="date"
                  value={formData.fecha_compra}
                  onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Información adicional sobre el vehículo..."
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
                >
                  {editingVehicle ? "Actualizar Vehículo" : "Guardar Vehículo"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Lista de vehículos */}
      {vehicles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tienes vehículos registrados
          </h3>
          <p className="text-gray-500 mb-4">
            Agrega tu primer vehículo para comenzar a recibir recordatorios de servicio
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            Agregar mi primer vehículo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                <h3 className="text-xl font-bold text-white">
                  {vehicle.marca} {vehicle.modelo}
                </h3>
                <p className="text-blue-100">{vehicle.anio}</p>
              </div>

              <div className="p-4">
                <div className="space-y-2 mb-4">
                  {vehicle.placa && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-28">Placa:</span>
                      <span className="text-gray-600">{vehicle.placa}</span>
                    </div>
                  )}
                  {vehicle.color && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-28">Color:</span>
                      <span className="text-gray-600">{vehicle.color}</span>
                    </div>
                  )}
                  {vehicle.kilometraje > 0 && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-28">Kilometraje:</span>
                      <span className="text-gray-600">{vehicle.kilometraje.toLocaleString()} km</span>
                    </div>
                  )}
                  {vehicle.fecha_compra && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-28">Comprado:</span>
                      <span className="text-gray-600">{formatDate(vehicle.fecha_compra)}</span>
                    </div>
                  )}
                  {vehicle.proximo_servicio && (
                    <div className="flex items-center text-sm bg-yellow-50 p-2 rounded">
                      <span className="font-medium text-yellow-800 w-28">Próximo servicio:</span>
                      <span className="text-yellow-700">{formatDate(vehicle.proximo_servicio)}</span>
                    </div>
                  )}
                </div>

                {vehicle.notas && (
                  <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                    <p className="text-gray-600">{vehicle.notas}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 rounded-lg transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 rounded-lg transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
