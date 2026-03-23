import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  isSameWeek,
} from "date-fns"
import { enUS } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  htmlLink: string
}

interface WeeklyCalendarProps {
  events: CalendarEvent[]
  onCancelEvent: (id: string) => void
  currentDate: Date
  onDateChange: (date: Date) => void
}

export function WeeklyCalendar({
  events,
  onCancelEvent,
  currentDate,
  onDateChange,
}: WeeklyCalendarProps) {
  const nextWeek = () => onDateChange(addWeeks(currentDate, 1))
  const prevWeek = () => onDateChange(subWeeks(currentDate, 1))
  const goToToday = () => onDateChange(new Date())

  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(startDate, i)
  )
  const hours = Array.from({ length: 24 }).map((_, i) => i)

  const currentWeekEvents = events.filter((event) => {
    if (!event.start.dateTime && !event.start.date) return false
    const eventDate = parseISO(
      (event.start.dateTime || event.start.date) as string
    )
    return isSameWeek(eventDate, currentDate, { weekStartsOn: 0 })
  })

  const getEventStyle = (event: CalendarEvent) => {
    if (!event.start.dateTime || !event.end?.dateTime) return {}

    const startDate = parseISO(event.start.dateTime)
    const endDate = parseISO(event.end.dateTime)

    const startHour = startDate.getHours() + startDate.getMinutes() / 60
    const durationHours =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)

    return {
      top: `${startHour * 3}rem`,
      height: `${durationHours * 3}rem`,
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm text-gray-900">
      <div className="flex items-center justify-between border-b p-3 sm:p-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 capitalize">
          {format(currentDate, "MMMM yyyy", { locale: enUS })}
        </h2>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs sm:text-sm px-2 sm:px-3">
            Go Today
          </Button>
          <Button variant="ghost" size="icon" onClick={prevWeek} className="h-8 w-8 sm:h-9 sm:w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextWeek} className="h-8 w-8 sm:h-9 sm:w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b bg-gray-50/50">
        <div className="p-1 sm:p-2"></div>
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="flex flex-col items-center border-l py-2 sm:py-3 text-[10px] sm:text-sm"
          >
            <span className="font-medium text-gray-500 capitalize">
              {format(day, "EEE", { locale: enUS })}
            </span>
            <span
              className={`text-sm sm:text-lg font-semibold ${isSameDay(day, new Date()) ? "mt-1 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-blue-600 text-white" : "mt-1 text-gray-900"}`}
            >
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      <div className="relative h-[600px] overflow-y-auto">
        <div className="grid min-h-[72rem] grid-cols-[40px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr]">
          <div className="z-10 flex flex-col border-r bg-white">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative flex h-12 justify-end pr-1 sm:pr-2 text-[9px] sm:text-xs font-medium text-gray-400"
              >
                <span className="relative -top-2">
                  {hour === 0
                    ? "12 AM"
                    : hour < 12
                      ? `${hour} AM`
                      : hour === 12
                        ? "12 PM"
                        : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {weekDays.map((day, dayIndex) => {
            const dayEvents = currentWeekEvents.filter((e) => {
              const eDate = parseISO(
                (e.start.dateTime || e.start.date) as string
              )
              return isSameDay(eDate, day)
            })

            return (
              <div
                key={dayIndex}
                className="relative border-r border-gray-100/80"
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none h-12 border-b border-gray-100/50"
                  ></div>
                ))}

                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="group absolute right-0.5 left-0.5 sm:right-1 sm:left-1 overflow-hidden rounded-md border border-blue-200 bg-blue-100 p-1 sm:p-1.5 text-[9px] sm:text-xs text-blue-800 shadow-sm transition-colors hover:bg-blue-200 leading-tight"
                    style={getEventStyle(event)}
                  >
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-semibold hover:underline"
                    >
                      {event.summary || "(No title)"}
                    </a>
                    <span className="block truncate text-[8px] sm:text-[10px] opacity-80 mt-0.5">
                      {event.start.dateTime
                        ? format(parseISO(event.start.dateTime), "h:mm a")
                        : "All day"}
                    </span>

                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        onCancelEvent(event.id)
                      }}
                      className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 rounded bg-red-100 p-0.5 text-red-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                      title="Cancelar evento"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}