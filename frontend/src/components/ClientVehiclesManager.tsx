import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

interface Vehicle {
  id: string;
  user_id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  color: string;
  kilometraje: number;
  numero_vin: string;
  proximo_servicio: string;
  tipo_proximo_servicio: string;
  created_at: string;
}

interface VehicleWithOwner extends Vehicle {
  users: {
    nombre: string;
    email: string;
    telefono: string;
  };
}

interface ServiceReminder {
  id: string;
  vehicle_id: string;
  tipo_servicio: string;
  fecha_programada: string;
  kilometraje_programado: number;
  descripcion: string;
  completado: boolean;
  fecha_completado: string;
  notas_staff: string;
}

export default function ClientVehiclesManager() {
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithOwner | null>(null);
  const [reminders, setReminders] = useState<ServiceReminder[]>([]);

  const [reminderForm, setReminderForm] = useState({
    tipo_servicio: "",
    fecha_programada: "",
    kilometraje_programado: 0,
    descripcion: "",
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = vehicles.filter(
        (v) =>
          v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.users.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.users.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVehicles(filtered);
    } else {
      setFilteredVehicles(vehicles);
    }
  }, [searchTerm, vehicles]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("client_vehicles")
        .select(`
          *,
          users:user_id (
            nombre,
            email,
            telefono
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
      setFilteredVehicles(data || []);
    } catch (error) {
      console.error("Error cargando vehículos:", error);
      alert("Error al cargar los vehículos de clientes");
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from("service_reminders")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("fecha_programada", { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error("Error cargando recordatorios:", error);
    }
  };

  const openReminderModal = async (vehicle: VehicleWithOwner) => {
    setSelectedVehicle(vehicle);
    await loadReminders(vehicle.id);
    setShowReminderModal(true);
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicle) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("service_reminders").insert({
        vehicle_id: selectedVehicle.id,
        tipo_servicio: reminderForm.tipo_servicio,
        fecha_programada: reminderForm.fecha_programada,
        kilometraje_programado: reminderForm.kilometraje_programado || null,
        descripcion: reminderForm.descripcion,
        enviado_por: user.id,
      });

      if (error) throw error;

      alert("Recordatorio creado exitosamente");
      
      // Actualizar próximo servicio en el vehículo
      await supabase
        .from("client_vehicles")
        .update({
          proximo_servicio: reminderForm.fecha_programada,
          tipo_proximo_servicio: reminderForm.tipo_servicio,
        })
        .eq("id", selectedVehicle.id);

      setReminderForm({
        tipo_servicio: "",
        fecha_programada: "",
        kilometraje_programado: 0,
        descripcion: "",
      });

      await loadReminders(selectedVehicle.id);
      await loadVehicles();
    } catch (error: any) {
      console.error("Error creando recordatorio:", error);
      alert("Error al crear el recordatorio: " + error.message);
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    if (!confirm("¿Marcar este recordatorio como completado?")) return;

    try {
      const { error } = await supabase
        .from("service_reminders")
        .update({
          completado: true,
          fecha_completado: new Date().toISOString(),
        })
        .eq("id", reminderId);

      if (error) throw error;

      alert("Recordatorio marcado como completado");
      if (selectedVehicle) {
        await loadReminders(selectedVehicle.id);
      }
    } catch (error) {
      console.error("Error completando recordatorio:", error);
      alert("Error al completar el recordatorio");
    }
  };

  const sendWhatsAppReminder = (vehicle: VehicleWithOwner, reminder: ServiceReminder) => {
    const phoneNumber = vehicle.users.telefono || "";
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("502") ? cleanPhone : `502${cleanPhone}`;

    const message = `Hola ${vehicle.users.nombre}! 👋\n\nTe recordamos que tu ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) tiene programado:\n\n📅 *${reminder.tipo_servicio}*\nFecha: ${new Date(reminder.fecha_programada).toLocaleDateString("es-GT")}\n${reminder.descripcion ? `\nDetalles: ${reminder.descripcion}` : ""}\n\n¿Deseas agendar una cita? Responde a este mensaje.\n\n*iCarSolutions* 🚗`;

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
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

  const getUpcomingReminders = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return vehicles.filter((v) => {
      if (!v.proximo_servicio) return false;
      const serviceDate = new Date(v.proximo_servicio);
      return serviceDate >= today && serviceDate <= thirtyDaysFromNow;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingReminders = getUpcomingReminders();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Vehículos de Clientes
        </h1>
        <p className="text-gray-600">
          Gestiona los vehículos registrados y programa recordatorios de servicio
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vehículos</p>
              <p className="text-3xl font-bold text-gray-900">{vehicles.length}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Servicios Próximos</p>
              <p className="text-3xl font-bold text-yellow-600">{upcomingReminders.length}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
              <p className="text-3xl font-bold text-green-600">
                {new Set(vehicles.map((v) => v.user_id)).size}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recordatorios próximos */}
      {upcomingReminders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Servicios Próximos (30 días)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingReminders.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-lg p-4 border border-yellow-300">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {vehicle.marca} {vehicle.modelo} ({vehicle.placa})
                    </h4>
                    <p className="text-sm text-gray-600">{vehicle.users.nombre}</p>
                  </div>
                  <button
                    onClick={() => openReminderModal(vehicle)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Ver detalles
                  </button>
                </div>
                <div className="text-sm text-yellow-700">
                  <span className="font-medium">{vehicle.tipo_proximo_servicio}</span> -{" "}
                  {formatDate(vehicle.proximo_servicio)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por marca, modelo, placa, cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Tabla de vehículos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kilometraje
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Próximo Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {vehicle.users.nombre}
                      </div>
                      <div className="text-sm text-gray-500">{vehicle.users.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vehicle.marca} {vehicle.modelo}
                    </div>
                    <div className="text-sm text-gray-500">
                      {vehicle.anio} {vehicle.color && `- ${vehicle.color}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vehicle.placa || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vehicle.kilometraje ? `${vehicle.kilometraje.toLocaleString()} km` : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vehicle.proximo_servicio ? (
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {vehicle.tipo_proximo_servicio}
                        </div>
                        <div className="text-gray-500">
                          {formatDate(vehicle.proximo_servicio)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Sin programar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openReminderModal(vehicle)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVehicles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron vehículos</p>
          </div>
        )}
      </div>

      {/* Modal de recordatorios */}
      {showReminderModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedVehicle.marca} {selectedVehicle.modelo}
                </h2>
                <p className="text-gray-600">
                  Cliente: {selectedVehicle.users.nombre} | {selectedVehicle.placa}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  setSelectedVehicle(null);
                  setReminderForm({
                    tipo_servicio: "",
                    fecha_programada: "",
                    kilometraje_programado: 0,
                    descripcion: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Formulario de nuevo recordatorio */}
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Programar Nuevo Recordatorio
                </h3>
                <form onSubmit={handleCreateReminder} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Servicio *
                      </label>
                      <select
                        required
                        value={reminderForm.tipo_servicio}
                        onChange={(e) =>
                          setReminderForm({ ...reminderForm, tipo_servicio: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Cambio de Aceite">Cambio de Aceite</option>
                        <option value="Revisión General">Revisión General</option>
                        <option value="Cambio de Llantas">Cambio de Llantas</option>
                        <option value="Alineación y Balanceo">Alineación y Balanceo</option>
                        <option value="Cambio de Frenos">Cambio de Frenos</option>
                        <option value="Inspección Técnica">Inspección Técnica</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Programada *
                      </label>
                      <input
                        type="date"
                        required
                        value={reminderForm.fecha_programada}
                        onChange={(e) =>
                          setReminderForm({ ...reminderForm, fecha_programada: e.target.value })
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kilometraje Programado
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={reminderForm.kilometraje_programado}
                        onChange={(e) =>
                          setReminderForm({
                            ...reminderForm,
                            kilometraje_programado: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ej: 100000"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        value={reminderForm.descripcion}
                        onChange={(e) =>
                          setReminderForm({ ...reminderForm, descripcion: e.target.value })
                        }
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Detalles adicionales del servicio..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                  >
                    Crear Recordatorio
                  </button>
                </form>
              </div>

              {/* Lista de recordatorios */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Historial de Recordatorios
                </h3>
                {reminders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay recordatorios para este vehículo
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`border rounded-lg p-4 ${
                          reminder.completado
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {reminder.tipo_servicio}
                              {reminder.completado && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  ✓ Completado
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600">
                              📅 {formatDate(reminder.fecha_programada)}
                              {reminder.kilometraje_programado > 0 &&
                                ` | 🛣️ ${reminder.kilometraje_programado.toLocaleString()} km`}
                            </p>
                            {reminder.descripcion && (
                              <p className="text-sm text-gray-600 mt-2">{reminder.descripcion}</p>
                            )}
                            {reminder.completado && reminder.fecha_completado && (
                              <p className="text-xs text-green-700 mt-2">
                                Completado el {formatDate(reminder.fecha_completado)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            {!reminder.completado && (
                              <>
                                <button
                                  onClick={() => sendWhatsAppReminder(selectedVehicle, reminder)}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition"
                                  title="Enviar recordatorio por WhatsApp"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleCompleteReminder(reminder.id)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition"
                                >
                                  Marcar Completado
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
