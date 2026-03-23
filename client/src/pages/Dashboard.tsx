import { useEffect, useState } from "react"
import Vapi from "@vapi-ai/web"
import { startOfWeek, endOfWeek } from "date-fns"
import { type CalendarEvent, WeeklyCalendar } from "@/components/WeeklyCalendar"
import { Button } from "@/components/ui/button"
import { Loader2, Phone, PhoneOff } from "lucide-react"

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || ""
const vapi = VAPI_PUBLIC_KEY ? new Vapi(VAPI_PUBLIC_KEY) : null
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface UserProfile {
  id: number
  email: string
  name: string
}

export default function Dashboard() {
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [callActive, setCallActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const queryParameters = new URLSearchParams(window.location.search)
    const tokenFromUrl = queryParameters.get("token")

    const activeToken = tokenFromUrl || localStorage.getItem("sessionToken")

    if (tokenFromUrl) {
      localStorage.setItem("sessionToken", tokenFromUrl)
      window.history.replaceState({}, document.title, "/dashboard")
    }

    if (!activeToken) {
      window.location.href = "/"
      return
    }

    setSessionToken(activeToken)
    fetchUserProfile(activeToken)
    fetchEvents(activeToken, currentDate)

    if (vapi) {
      vapi.on("call-start", () => {
        setCallActive(true)
        setIsConnecting(false)
      })
      vapi.on("call-end", () => {
        setCallActive(false)
        setIsConnecting(false)
        fetchEvents(activeToken, currentDate)
      })
      vapi.on("error", (error) => {
        console.error("Vapi Error:", error)
        setCallActive(false)
        setIsConnecting(false)
      })

      vapi.on("message", (message: any) => {
        if (message.type === "tool-calls") {
          const toolCalls = message.toolCalls || message.toolCallList || []

          toolCalls.forEach((tc: any) => {
            if (tc.function?.name === "Calendar") {
              try {
                const args = typeof tc.function.arguments === 'string'
                  ? JSON.parse(tc.function.arguments)
                  : tc.function.arguments

                const startDateTime = `${args.date}T${args.time}:00`
                const startDate = new Date(startDateTime)
                const durationMinutes = args.duration_minutes || 30
                const endDate = new Date(startDate.getTime() + durationMinutes * 60000)

                const optimisticEvent: CalendarEvent = {
                  id: `temp-${Date.now()}`,
                  summary: `⏳ ${args.title || 'Scheduling...'}`,
                  start: { dateTime: startDate.toISOString() },
                  end: { dateTime: endDate.toISOString() },
                  htmlLink: "#"
                }

                setEvents((prev) => [...prev, optimisticEvent])

                setTimeout(() => {
                  fetchEvents(activeToken, currentDate)
                }, 3000)

              } catch (e) {
                console.error("Error procesando Optimistic UI:", e)
                setTimeout(() => fetchEvents(activeToken, currentDate), 3000)
              }
            }
          })
        }
      })
    }

    return () => {
      if (vapi) vapi.removeAllListeners()
    }
  }, [currentDate])

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data)
      } else {
        handleLogout()
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    }
  }

  const fetchEvents = async (token: string, date: Date) => {
    setLoading(true)
    try {
      const start = startOfWeek(date, { weekStartsOn: 0 }).toISOString()
      const end = endOfWeek(date, { weekStartsOn: 0 }).toISOString()

      const response = await fetch(
        `${API_URL}/api/v1/calendar/events?time_min=${start}&time_max=${end}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    }
    setLoading(false)
  }

  const handleCancelEvent = async (eventId: string) => {
    if (!sessionToken) return

    setEvents((prev) => prev.filter((e) => e.id !== eventId))

    try {
      const response = await fetch(
        `${API_URL}/api/v1/calendar/events/${eventId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${sessionToken}` },
        }
      )

      if (!response.ok) {
        fetchEvents(sessionToken, currentDate)
      }
    } catch (error) {
      console.error("Error cancelling event:", error)
      fetchEvents(sessionToken, currentDate)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("sessionToken")
    window.location.href = "/"
  }

  const toggleCall = () => {
    if (!vapi) return
    if (callActive || isConnecting) {
      vapi.stop()
      setIsConnecting(false)
    } else {
      setIsConnecting(true)
      const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID

      const now = new Date()
      const currentDate = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const currentTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })

      const eventsContext =
        events.length > 0
          ? events
            .map((e) => {
              const dateVal = e.start.dateTime || e.start.date
              const dateStr = dateVal
                ? new Date(dateVal).toLocaleString()
                : "Fecha desconocida"
              return `- ${e.summary} (${dateStr})`
            })
            .join("\n")
          : "No scheduled events."

      vapi.start(assistantId, {
        clientMessages: [
          "transcript",
          "tool-calls",
          "function-call",
          "status-update",
        ] as any,
        variableValues: {
          sessionToken: sessionToken,
          userName: userProfile?.name || "Usuario",
          currentDate: currentDate,
          currentTime: currentTime,
          existingEvents: eventsContext,
        },
      })
    }
  }

  if (!sessionToken || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900">
        Loading your secure session...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 text-gray-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hello, {userProfile.name}
            </h1>
            <p className="text-sm text-gray-500">
              {userProfile.email}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={toggleCall}
              disabled={isConnecting}
              variant={callActive ? "destructive" : "default"}
              className={`w-[180px] rounded-full px-6 py-2.5 font-semibold shadow-md transition-all ${callActive && !isConnecting ? "animate-pulse" : ""
                }`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : callActive ? (
                <>
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Call
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Start Call
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="rounded-full text-gray-600 hover:bg-red-50 hover:text-red-600"
            >
              Logout
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-[600px] items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="animate-pulse font-medium text-gray-400">
              Syncing with Google Calendar...
            </div>
          </div>
        ) : (
          <WeeklyCalendar
            events={events}
            onCancelEvent={handleCancelEvent}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />
        )}
      </div>
    </div>
  )
}
