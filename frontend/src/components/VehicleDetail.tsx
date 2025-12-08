import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";

interface Vehicle {
  id: string;
  marca: string;
  modelo_año: string;
  precio: number;
  precio_original?: number;
  descuento_porcentaje?: number;
  estado: string;
  imagenes: string[];
  combustible: string;
  transmision: string;
  cilindraje: number;
  linea: string;
  origen: string;
  motor: string;
  marchas: number;
  recorrido: number;
  extras: string;
  detalles: string;
}

interface VehicleDetailProps {
  vehicleId: string;
}

export default function VehicleDetail({ vehicleId }: VehicleDetailProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef(0);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteData, setQuoteData] = useState({
    nombre: "",
    telefono: "",
    email: "",
  });
  const [sendingQuote, setSendingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    fetchVehicle();
  }, [vehicleId]);

  const fetchVehicle = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .single();

      if (error) throw error;
      setVehicle(data);
    } catch (error) {
      console.error("Error cargando vehículo:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    if (vehicle?.imagenes) {
      setSelectedImageIndex((prev) => (prev + 1) % vehicle.imagenes.length);
    }
  };

  const prevImage = () => {
    if (vehicle?.imagenes) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? vehicle.imagenes.length - 1 : prev - 1
      );
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Si desliza más de 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (now - lastTap < 300) {
      setIsZoomed(!isZoomed);
    }
    lastTapRef.current = now;
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError("");
    setSendingQuote(true);

    try {
      if (!quoteData.nombre || !quoteData.telefono || !quoteData.email) {
        setQuoteError("Por favor completa todos los campos");
        setSendingQuote(false);
        return;
      }

      if (!quoteData.email.includes("@")) {
        setQuoteError("Email inválido");
        setSendingQuote(false);
        return;
      }

      // Insertar solicitud de cotización
      const { error } = await supabase.from("cotizaciones").insert({
        vehicle_id: vehicleId,
        nombre_cliente: quoteData.nombre,
        telefono_cliente: quoteData.telefono,
        email_cliente: quoteData.email,
        estado: "pendiente",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setQuoteSuccess(true);
      setTimeout(() => {
        setShowQuoteModal(false);
        setQuoteSuccess(false);
        setQuoteData({ nombre: "", telefono: "", email: "" });
      }, 2000);
    } catch (err: any) {
      console.error("Error al enviar cotización:", err);
      setQuoteError(err.message || "Error al enviar solicitud");
    } finally {
      setSendingQuote(false);
    }
  };

  const handleWhatsApp = () => {
    const message = `Hola, estoy interesado en el vehículo ${vehicle?.marca} ${vehicle?.modelo_año} - QTZ ${vehicle?.precio.toLocaleString()}`;
    const whatsappUrl = `https://wa.me/50236826547?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${vehicle?.marca} ${vehicle?.modelo_año} - ${vehicle?.linea}`;
    const shareText = `Mira este vehículo: ${shareTitle} - QTZ ${vehicle?.precio.toLocaleString()}`;

    // Verificar si el dispositivo soporta Web Share API (móviles)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // Usuario canceló el share o error
        console.log("Share cancelled or error:", error);
      }
    } else {
      // Desktop: copiar al clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      } catch (error) {
        console.error("Error copying to clipboard:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando detalles del vehículo...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Vehículo no encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
        {/* Galería de imágenes */}
        <div>
          {/* Imagen principal con controles */}
          <div
            className="relative bg-gray-200 rounded-lg overflow-hidden h-96 mb-4 group cursor-pointer"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
          >
            {vehicle.imagenes && vehicle.imagenes.length > 0 ? (
              <>
                <img
                  ref={imageRef}
                  src={vehicle.imagenes[selectedImageIndex]}
                  alt={`${vehicle.marca} ${selectedImageIndex + 1}`}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isZoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                  }`}
                />
                
                {/* Flechas de navegación */}
                {vehicle.imagenes.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition opacity-0 group-hover:opacity-100"
                    >
                      ❮
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition opacity-0 group-hover:opacity-100"
                    >
                      ❯
                    </button>

                    {/* Indicador de imágenes */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {selectedImageIndex + 1} / {vehicle.imagenes.length}
                    </div>
                  </>
                )}

                {/* Indicador de zoom en móviles */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-xs">
                  {isZoomed ? "🔍 Haz tap para alejar" : "👆 Doble tap para zoom"}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <span className="text-white text-8xl">🚗</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {vehicle.imagenes && vehicle.imagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {vehicle.imagenes.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                    selectedImageIndex === index
                      ? "border-blue-600"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información del vehículo */}
        <div>
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {vehicle.marca} {vehicle.modelo_año}
            </h1>
            <div className="flex items-center gap-4">
              <span className={`px-4 py-2 rounded-full font-semibold text-white ${
                vehicle.estado === "disponible"
                  ? "bg-green-600"
                  : vehicle.estado === "vendido"
                  ? "bg-red-600"
                  : "bg-yellow-600"
              }`}>
                {vehicle.estado === "disponible" ? "Disponible" :
                 vehicle.estado === "vendido" ? "Vendido" :
                 "Reservado"}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-2">Precio</p>
            {vehicle.descuento_porcentaje && vehicle.descuento_porcentaje > 0 ? (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl text-gray-400 line-through">
                    QTZ {vehicle.precio_original?.toLocaleString()}
                  </span>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    -{vehicle.descuento_porcentaje}% OFF
                  </span>
                </div>
                <p className="text-5xl font-bold text-green-600">
                  QTZ {vehicle.precio.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  ¡Ahorras QTZ {((vehicle.precio_original || vehicle.precio) - vehicle.precio).toLocaleString()}!
                </p>
              </div>
            ) : (
              <p className="text-5xl font-bold text-blue-600">
                QTZ {vehicle.precio.toLocaleString()}
              </p>
            )}
          </div>

          {/* Especificaciones */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {vehicle.combustible && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold mb-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                  </svg>
                  Combustible
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicle.combustible}</p>
              </div>
            )}

            {vehicle.transmision && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold mb-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 19h10V5H7v14zM19 3c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14zm-8 4h4v2h-4V7zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z"/>
                  </svg>
                  Transmisión
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicle.transmision}</p>
              </div>
            )}

            {vehicle.cilindraje > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Cilindraje
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicle.cilindraje} cc</p>
              </div>
            )}

            {vehicle.marchas > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold mb-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 19h10V5H7v14zM19 3c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14zm-8 4h4v2h-4V7zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z"/>
                  </svg>
                  Marchas
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicle.marchas}</p>
              </div>
            )}

            {vehicle.linea && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Línea
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicle.linea}</p>
              </div>
            )}

            {vehicle.origen && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Origen
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicle.origen}</p>
              </div>
            )}

            {vehicle.motor && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold mb-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4v16h12V4H6zm10 14H8V6h8v12zm-2-8h-2V8h-2v2H8v2h2v2h2v-2h2v-2z"/>
                    <path d="M4 2h16v2H4zm0 18h16v2H4z"/>
                  </svg>
                  Motor
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicle.motor}</p>
              </div>
            )}

            {vehicle.recorrido > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Recorrido
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicle.recorrido.toLocaleString()} km</p>
              </div>
            )}
          </div>

          {/* Extras */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-900 font-semibold mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Extras y Características
            </div>
            {vehicle.extras ? (
              <p className="text-gray-700 whitespace-pre-line">{vehicle.extras}</p>
            ) : (
              <p className="text-gray-500 italic">No hay extras registrados</p>
            )}
          </div>

          {/* Detalles / Desperfectos */}
          <div className="mb-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Detalles y Observaciones
              </div>
              {/* Logo Visa Cuotas */}
              <img 
                src="/Visa_Logo.png" 
                alt="Visa Cuotas" 
                className="h-10 w-auto object-contain"
              />
            </div>
            {vehicle.detalles ? (
              <p className="text-gray-700 whitespace-pre-line">{vehicle.detalles}</p>
            ) : (
              <p className="text-gray-500 italic">No hay detalles registrados</p>
            )}
          </div>

          {/* Call to Action */}
          {vehicle.estado === "disponible" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowQuoteModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Solicitar Cotización
                </button>
                <button 
                  onClick={handleWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </button>
              </div>
              
              <button 
                onClick={handleShare}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast de Compartir */}
      {showShareToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Enlace copiado al portapapeles</span>
        </div>
      )}

      {/* Modal de Cotización */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Solicitar Cotización</h3>
              <button
                onClick={() => {
                  setShowQuoteModal(false);
                  setQuoteError("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {quoteSuccess ? (
              <div className="text-center py-8">
                <div className="text-green-600 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">¡Solicitud enviada!</p>
                <p className="text-gray-600 mt-2">Nos contactaremos contigo pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{vehicle?.marca} {vehicle?.modelo_año}</span>
                    <br />
                    {vehicle?.descuento_porcentaje && vehicle.descuento_porcentaje > 0 ? (
                      <span className="flex items-center gap-2">
                        <span className="text-gray-400 line-through text-sm">QTZ {vehicle?.precio_original?.toLocaleString()}</span>
                        <span className="text-green-600 font-bold">QTZ {vehicle?.precio.toLocaleString()}</span>
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">-{vehicle?.descuento_porcentaje}%</span>
                      </span>
                    ) : (
                      <span className="text-blue-600 font-bold">QTZ {vehicle?.precio.toLocaleString()}</span>
                    )}
                  </p>
                </div>

                {quoteError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {quoteError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={quoteData.nombre}
                    onChange={(e) => setQuoteData({ ...quoteData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={quoteData.telefono}
                    onChange={(e) => setQuoteData({ ...quoteData, telefono: e.target.value })}
                    placeholder="+502 1234 5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={quoteData.email}
                    onChange={(e) => setQuoteData({ ...quoteData, email: e.target.value })}
                    placeholder="tu@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuoteModal(false);
                      setQuoteError("");
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sendingQuote}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {sendingQuote ? "Enviando..." : "Enviar Solicitud"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
