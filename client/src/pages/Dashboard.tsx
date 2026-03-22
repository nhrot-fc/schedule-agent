import { useEffect, useState } from 'react';
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "";
const vapi = VAPI_PUBLIC_KEY ? new Vapi(VAPI_PUBLIC_KEY) : null;

// Interfaz para tipar los eventos que llegan del backend
interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  htmlLink: string;
}

export default function Dashboard() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const queryParameters = new URLSearchParams(window.location.search);
    const token = queryParameters.get("token");

    if (token) {
      setSessionToken(token);
      window.history.replaceState({}, document.title, "/dashboard");
      // Cargar eventos inmediatamente tras obtener el token
      fetchEvents(token);
    }

    if (!vapi) return;

    vapi.on("call-start", () => setCallActive(true));
    vapi.on("call-end", () => {
      setCallActive(false);
      // Recargar la lista de eventos cuando la llamada termine (por si la IA agendó algo)
      if (token) fetchEvents(token);
    });

    return () => {
      vapi.removeAllListeners();
    };
  }, []);

  // --- Funciones de la API ---

  const fetchEvents = async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/calendar/events", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
    setLoading(false);
  };

  const cancelEvent = async (eventId: string) => {
    if (!sessionToken) return;
    try {
      const response = await fetch(`http://localhost:8000/api/v1/calendar/events/${eventId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        // Actualizar la UI filtrando el evento eliminado
        setEvents(prev => prev.filter(e => e.id !== eventId));
      }
    } catch (error) {
      console.error("Error cancelling event:", error);
    }
  };

  // --- Control de Llamada ---

  const toggleCall = () => {
    if (!vapi) return;
    if (callActive) {
      vapi.stop();
    } else {
      const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
      vapi.start(assistantId, {
        clientMessages: [
            "transcript", 
            "tool-calls", 
            "function-call", 
            "status-update"
        ] as any,
        variableValues: {
          sessionToken: sessionToken
        }
      });
    }
  };

  // Helper para formatear la fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Todo el día";
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tu Agenda</h1>
            <p className="text-sm text-gray-500">Administra tus reuniones por voz o manualmente</p>
          </div>
          <button
            onClick={toggleCall}
            disabled={!sessionToken || !vapi}
            className={`px-6 py-3 rounded-full font-semibold text-white transition-all shadow-md ${callActive
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
              }`}
          >
            {callActive ? "🔴 Finalizar Llamada" : "🎙️ Hablar con Riley"}
          </button>
        </div>

        {/* Lista de Eventos (UI Limpia) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Próximos Eventos</h2>

          {loading ? (
            <div className="text-center text-gray-500 py-10">Cargando agenda...</div>
          ) : events.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No tienes eventos próximos programados.</div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex flex-col">
                    <a href={event.htmlLink} target="_blank" rel="noreferrer" className="font-medium text-gray-900 hover:text-blue-600 hover:underline">
                      {event.summary || "(Sin título)"}
                    </a>
                    <span className="text-sm text-gray-500">
                      {formatDate(event.start.dateTime || event.start.date)}
                    </span>
                  </div>
                  <button
                    onClick={() => cancelEvent(event.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}