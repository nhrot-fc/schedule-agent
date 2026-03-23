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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react"
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
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white text-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight capitalize">
            {format(currentDate, "MMMM yyyy", { locale: enUS })}
          </h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
          <Button variant="ghost" size="icon" onClick={prevWeek} className="h-8 w-8 sm:h-9 sm:w-9 rounded-md hover:bg-white hover:shadow-sm">
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs sm:text-sm px-3 sm:px-4 font-medium border-slate-200 bg-white hover:bg-slate-50">
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={nextWeek} className="h-8 w-8 sm:h-9 sm:w-9 rounded-md hover:bg-white hover:shadow-sm">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[45px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-slate-100 bg-slate-50/50">
        <div className="p-1 sm:p-2"></div>
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="flex flex-col items-center border-l border-slate-100 py-3 sm:py-4 text-[10px] sm:text-sm"
          >
            <span className="font-semibold tracking-wider text-slate-400 uppercase text-[10px] sm:text-xs">
              {format(day, "EEE", { locale: enUS })}
            </span>
            <span
              className={`mt-1.5 text-sm sm:text-lg font-semibold transition-colors ${isSameDay(day, new Date())
                  ? "flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-700"
                }`}
            >
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      <div className="relative h-[65vh] overflow-y-auto scroll-smooth">
        <div className="grid min-h-[72rem] grid-cols-[45px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr]">

          <div className="z-10 flex flex-col border-r border-slate-100 bg-slate-50/30">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative flex h-12 justify-end pr-2 sm:pr-3 text-[9px] sm:text-xs font-semibold text-slate-400"
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
                className="relative border-r border-slate-100/60 transition-colors hover:bg-slate-50/40"
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none h-12 border-b border-slate-100/50"
                  ></div>
                ))}

                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="group absolute right-0.5 left-0.5 sm:right-1.5 sm:left-1.5 overflow-hidden rounded-lg border border-blue-200/60 bg-blue-50/90 p-1.5 sm:p-2 shadow-sm transition-all hover:bg-blue-100 hover:shadow-md hover:border-blue-300 hover:z-20 leading-tight"
                    style={getEventStyle(event)}
                  >
                    <div className="flex flex-col h-full relative">
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate font-bold text-blue-900 text-[10px] sm:text-xs hover:underline pr-4"
                      >
                        {event.summary || "(No title)"}
                      </a>
                      <span className="block truncate text-[9px] sm:text-[10px] font-medium text-blue-700/80 mt-0.5">
                        {event.start.dateTime
                          ? format(parseISO(event.start.dateTime), "h:mm a")
                          : "All day"}
                      </span>

                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          onCancelEvent(event.id)
                        }}
                        className="absolute top-0 right-0 rounded-md bg-white/80 p-1 text-slate-400 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 hover:shadow-sm"
                        title="Delete event"
                      >
                        <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
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