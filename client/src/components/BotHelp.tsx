import { HelpCircle, Sparkles, CalendarPlus, CalendarDays, Trash2, Zap } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function BotHelp() {
  const capabilities = [
    {
      icon: CalendarPlus,
      title: "Batch Scheduling",
      description: 'Say: "Schedule study for 2h, thesis for 3h, and gym for 1h".',
    },
    {
      icon: CalendarDays,
      title: "Reschedule & Update",
      description: 'Say: "Move my 3 PM meeting to Tuesday at 5 PM".',
    },
    {
      icon: Trash2,
      title: "Bulk Deletion",
      description: 'Say: "Cancel all my meetings for this Friday".',
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 transition-colors">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Help</span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="end" 
          className="w-80 p-5 bg-white/95 backdrop-blur-sm shadow-xl shadow-slate-200/50 border border-slate-100 rounded-2xl animate-in fade-in-0 zoom-in-95"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 tracking-tight">AI Assistant Capabilities</h4>
                <p className="text-xs font-medium text-slate-500">How to converse with Riley</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Meet Riley, your executive scheduling assistant. Talk naturally, confirm details, and Riley will handle your Google Calendar effortlessly.
            </p>

            <div className="space-y-3.5 pt-1">
              {capabilities.map((cap, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                    <cap.icon className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{cap.title}</p>
                    <p className="text-[11px] text-slate-500 leading-snug italic">“{cap.description}”</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-100">
              <Zap className="h-4 w-4 text-amber-500 flex-none" />
              <p className="text-[11px] text-slate-600 leading-tight">
                <span className="font-semibold text-slate-700">Smart Inference:</span> Riley infers titles and defaults durations to 60 mins if unspecified.
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}