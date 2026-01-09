import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

interface Stats {
  totalVehicles: number;
  availableVehicles: number;
  soldVehicles: number;
  totalQuotations: number;
  totalRevenue: number;
}

interface VisitData {
  date: string;
  visits: number;
  unique_visitors: number;
}

interface DeviceStats {
  device_type: string;
  count: number;
}

interface BrowserStats {
  browser: string;
  count: number;
}

const StatisticsPanel: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0,
    availableVehicles: 0,
    soldVehicles: 0,
    totalQuotations: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [visitData, setVisitData] = useState<VisitData[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [browserStats, setBrowserStats] = useState<BrowserStats[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('7');
  const [chartType, setChartType] = useState<'visits' | 'unique'>('visits');

  useEffect(() => {
    fetchStats();
    fetchVisitStats();
  }, [dateRange]);

  const fetchVisitStats = async () => {
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Obtener visitas por día
      const { data: visits, error: visitsError } = await supabase
        .from('site_visits')
        .select('visit_date')
        .gte('visit_date', startDate.toISOString())
        .order('visit_date', { ascending: true });

      if (visitsError && visitsError.code !== '42P01') {
        console.error('Error obteniendo visitas:', visitsError);
        return;
      }

      // Procesar datos por día
      const visitsByDay: { [key: string]: { visits: number; sessions: Set<string> } } = {};
      
      if (visits) {
        visits.forEach((visit: any) => {
          const date = new Date(visit.visit_date).toLocaleDateString('es-GT');
          if (!visitsByDay[date]) {
            visitsByDay[date] = { visits: 0, sessions: new Set() };
          }
          visitsByDay[date].visits++;
          if (visit.session_id) {
            visitsByDay[date].sessions.add(visit.session_id);
          }
        });
      }

      const processedData = Object.entries(visitsByDay).map(([date, data]) => ({
        date,
        visits: data.visits,
        unique_visitors: data.sessions.size,
      }));

      setVisitData(processedData);
      setTotalVisits(visits?.length || 0);

      // Obtener estadísticas de dispositivos
      const { data: devices } = await supabase
        .from('site_visits')
        .select('device_type')
        .gte('visit_date', startDate.toISOString());

      if (devices) {
        const deviceCounts: { [key: string]: number } = {};
        devices.forEach((d: any) => {
          deviceCounts[d.device_type || 'unknown'] = (deviceCounts[d.device_type || 'unknown'] || 0) + 1;
        });
        setDeviceStats(Object.entries(deviceCounts).map(([device_type, count]) => ({ device_type, count })));
      }

      // Obtener estadísticas de navegadores
      const { data: browsers } = await supabase
        .from('site_visits')
        .select('browser')
        .gte('visit_date', startDate.toISOString());

      if (browsers) {
        const browserCounts: { [key: string]: number } = {};
        browsers.forEach((b: any) => {
          browserCounts[b.browser || 'unknown'] = (browserCounts[b.browser || 'unknown'] || 0) + 1;
        });
        setBrowserStats(Object.entries(browserCounts).map(([browser, count]) => ({ browser, count })));
      }
    } catch (error) {
      console.error('Error fetching visit stats:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No autenticado");

      // Obtener estadísticas de vehículos
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, estado");

      if (vehiclesError) throw vehiclesError;

      // Obtener cotizaciones del usuario
      const { data: quotations, error: quotationsError } = await supabase
        .from("cotizaciones")
        .select("total")
        .eq("created_by", user.id);

      if (quotationsError) throw quotationsError;

      const totalVehicles = vehicles?.length || 0;
      const availableVehicles = vehicles?.filter(v => v.estado === "disponible").length || 0;
      const soldVehicles = vehicles?.filter(v => v.estado === "vendido").length || 0;
      const totalQuotations = quotations?.length || 0;
      const totalRevenue = quotations?.reduce((sum, q) => sum + q.total, 0) || 0;

      setStats({
        totalVehicles,
        availableVehicles,
        soldVehicles,
        totalQuotations,
        totalRevenue,
      });
    } catch (err) {
      console.error("Error al obtener estadísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  const maxVisits = Math.max(...visitData.map(d => chartType === 'visits' ? d.visits : d.unique_visitors), 1);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500">Cargando estadísticas...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total de Vehículos",
      value: stats.totalVehicles,
      color: "blue",
      icon: "🚗",
    },
    {
      label: "Disponibles",
      value: stats.availableVehicles,
      color: "green",
      icon: "✅",
    },
    {
      label: "Vendidos",
      value: stats.soldVehicles,
      color: "red",
      icon: "✔️",
    },
    {
      label: "Cotizaciones",
      value: stats.totalQuotations,
      color: "purple",
      icon: "📄",
    },
    {
      label: "Visitas al Sitio",
      value: totalVisits,
      color: "indigo",
      icon: "👁️",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Estadísticas</h2>
          <button
            onClick={() => {
              fetchStats();
              fetchVisitStats();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, index) => {
          const colorClasses = {
            blue: "bg-blue-50 border-blue-200 text-blue-900",
            green: "bg-green-50 border-green-200 text-green-900",
            red: "bg-red-50 border-red-200 text-red-900",
            purple: "bg-purple-50 border-purple-200 text-purple-900",
            yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
            indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
          };

          return (
            <div
              key={index}
              className={`border-2 rounded-lg p-4 ${colorClasses[card.color as keyof typeof colorClasses]}`}
            >
              <div className="text-3xl mb-2">{card.icon}</div>
              <p className="text-sm font-medium opacity-75">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Gráfica de Visitas */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Visitas al Sitio Web</h3>
            <p className="text-sm text-gray-600 mt-1">
              {chartType === 'visits' ? 'Total de visitas' : 'Visitantes únicos'} en los últimos {dateRange} días
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Filtro de tipo de datos */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setChartType('visits')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  chartType === 'visits'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Visitas
              </button>
              <button
                onClick={() => setChartType('unique')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  chartType === 'unique'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Únicos
              </button>
            </div>

            {/* Filtro de rango de fechas */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDateRange('7')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  dateRange === '7'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                7 días
              </button>
              <button
                onClick={() => setDateRange('30')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  dateRange === '30'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                30 días
              </button>
              <button
                onClick={() => setDateRange('90')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  dateRange === '90'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                90 días
              </button>
            </div>
          </div>
        </div>

        {/* Gráfica de Barras */}
        {visitData.length > 0 ? (
          <div className="space-y-2">
            {visitData.map((day, index) => {
              const value = chartType === 'visits' ? day.visits : day.unique_visitors;
              const percentage = (value / maxVisits) * 100;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 font-medium flex-shrink-0">
                    {day.date}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      <span className="text-white text-sm font-bold">
                        {value}
                      </span>
                    </div>
                  </div>
                  {chartType === 'visits' && (
                    <div className="w-16 text-sm text-gray-500 flex-shrink-0">
                      {day.unique_visitors} únicos
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500">No hay datos de visitas para este período</p>
          </div>
        )}
      </div>

      {/* Dispositivos y Navegadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estadísticas por Dispositivo */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Dispositivos</h3>
          {deviceStats.length > 0 ? (
            <div className="space-y-3">
              {deviceStats.map((device, index) => {
                const total = deviceStats.reduce((sum, d) => sum + d.count, 0);
                const percentage = ((device.count / total) * 100).toFixed(1);
                const icons = {
                  desktop: '🖥️',
                  mobile: '📱',
                  tablet: '📲',
                  unknown: '❓',
                };
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{icons[device.device_type as keyof typeof icons] || '❓'}</span>
                      <span className="font-medium text-gray-700 capitalize">{device.device_type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                        {device.count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay datos de dispositivos</p>
          )}
        </div>

        {/* Estadísticas por Navegador */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Navegadores</h3>
          {browserStats.length > 0 ? (
            <div className="space-y-3">
              {browserStats.slice(0, 5).map((browser, index) => {
                const total = browserStats.reduce((sum, b) => sum + b.count, 0);
                const percentage = ((browser.count / total) * 100).toFixed(1);
                const icons = {
                  Chrome: '🌐',
                  Firefox: '🦊',
                  Safari: '🧭',
                  Edge: 'Ⓜ️',
                  Opera: '🎭',
                  Other: '🔍',
                };
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{icons[browser.browser as keyof typeof icons] || '🔍'}</span>
                      <span className="font-medium text-gray-700">{browser.browser}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                        {browser.count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay datos de navegadores</p>
          )}
        </div>
      </div>

      {/* Resumen del Rendimiento de Ventas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen del Rendimiento</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tasa de Venta</span>
            <span className="font-semibold">
              {stats.totalVehicles > 0 
                ? ((stats.soldVehicles / stats.totalVehicles) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Inventario Disponible</span>
            <span className="font-semibold">{stats.availableVehicles}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Promedio por Cotización</span>
            <span className="font-semibold">
              $
              {stats.totalQuotations > 0
                ? (stats.totalRevenue / stats.totalQuotations).toLocaleString()
                : 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Ingresos Totales</span>
            <span className="font-semibold text-green-600">
              ${stats.totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;
