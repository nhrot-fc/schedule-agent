import { useEffect, useState } from "react"
import Vapi from "@vapi-ai/web"
import { startOfWeek, endOfWeek } from "date-fns"
import { type CalendarEvent, WeeklyCalendar } from "@/components/WeeklyCalendar"
import { BotHelp } from "@/components/BotHelp"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  PhoneOff,
  LogOut,
  CalendarDays,
  Bot,
} from "lucide-react"

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
  const [aiSpeaking, setAiSpeaking] = useState(false)

  useEffect(() => {
    if (!vapi) return

    const onCallStart = () => {
      setCallActive(true)
      setIsConnecting(false)
    }

    const onCallEnd = () => {
      setCallActive(false)
      setIsConnecting(false)
      setAiSpeaking(false)
      const token = localStorage.getItem("sessionToken")
      if (token) fetchEvents(token, new Date(), true)
    }

    const onError = (error: any) => {
      console.error("Vapi Error:", error)
      setCallActive(false)
      setIsConnecting(false)
      setAiSpeaking(false)
    }

    const onMessage = (message: any) => {
      if (message.type === "speech-update") {
        setAiSpeaking(message.status === "started")
      }
      if (message.type === "tool-calls") {
        const toolCalls = message.toolCalls || message.toolCallList || []
        if (toolCalls.length > 0) {
          setTimeout(() => {
            const token = localStorage.getItem("sessionToken")
            if (token) fetchEvents(token, new Date(), true)
          }, 3000)
        }
      }
    }

    vapi.on("call-start", onCallStart)
    vapi.on("call-end", onCallEnd)
    vapi.on("error", onError)
    vapi.on("message", onMessage)

    return () => {
      vapi.removeAllListeners()
    }
  }, [])


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
    if (!userProfile) fetchUserProfile(activeToken)
    fetchEvents(activeToken, currentDate, false)
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

  const fetchEvents = async (token: string, date: Date, isBackground = false) => {
    if (!isBackground) setLoading(true)
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
    } finally {
      if (!isBackground) setLoading(false)
    }
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
        fetchEvents(sessionToken, currentDate, true)
      }
    } catch (error) {
      console.error("Error cancelling event:", error)
      fetchEvents(sessionToken, currentDate, true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("sessionToken")
    window.location.href = "/"
  }

  const toggleCall = async () => {
    if (!vapi) return
    if (callActive || isConnecting) {
      vapi.stop()
      setIsConnecting(false)
      setAiSpeaking(false)
    } else {
      setIsConnecting(true)
      const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID

      const now = new Date()
      const currentDateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const currentTimeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })

      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const eventsContext =
        events.length > 0
          ? events
            .map((e) => {
              const dateVal = e.start.dateTime || e.start.date
              const dateStr = dateVal
                ? new Date(dateVal).toLocaleString()
                : "Unknown date"
              return `- [ID: ${e.id}] ${e.summary} (${dateStr})`
            })
            .join("\n")
          : "No scheduled events."
      try {
        await vapi.start(assistantId, {
          clientMessages: [
            "transcript",
            "tool-calls",
            "function-call",
            "speech-update",
            "status-update",
          ] as any,
          variableValues: {
            sessionToken: sessionToken,
            userName: userProfile?.name || "User",
            currentDate: currentDateString,
            currentTime: currentTimeString,
            timeZone: userTimeZone,
            existingEvents: eventsContext,
          },
        })
      } catch (error) {
        console.error("Error starting call:", error)
        setIsConnecting(false)
        setCallActive(false)
      }
    }
  }

  if (!sessionToken || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
        <span className="font-medium text-slate-600">Loading workspace...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-200">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Welcome, {userProfile.name}!
              </h1>
              <p className="text-xs font-medium text-slate-500">
                {userProfile.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {callActive && (
              <div className="hidden sm:flex items-center gap-1 h-6 mr-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full bg-blue-500 ${aiSpeaking ? "animate-wave" : "h-2 opacity-50 transition-all"
                      }`}
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      height: aiSpeaking ? "100%" : "8px",
                    }}
                  ></div>
                ))}
              </div>
            )}

            <BotHelp />

            <Button
              onClick={toggleCall}
              disabled={isConnecting}
              variant={callActive ? "destructive" : "default"}
              size="sm"
              className={`rounded-full px-5 font-semibold shadow-sm transition-all duration-300 ${callActive && !isConnecting
                ? "ring-4 ring-red-100 bg-red-600"
                : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                }`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting
                </>
              ) : callActive ? (
                <>
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Session
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Ask Riley
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-8">
        {loading ? (
          <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <div className="font-medium text-slate-500 animate-pulse">
                Syncing with Google Calendar...
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-200">
            <WeeklyCalendar
              events={events}
              onCancelEvent={handleCancelEvent}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
            />
          </div>
        )}
      </main>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); opacity: 0.7; }
          50% { transform: scaleY(1.5); opacity: 1; }
        }
        .animate-wave {
          animation: wave 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}