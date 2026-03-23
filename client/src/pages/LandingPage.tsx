import { useEffect, useState } from "react"
import { CalendarDays, Mic, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function LandingPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get("error")

    if (error) {
      setErrorMessage(decodeURIComponent(error))
      window.history.replaceState({}, document.title, "/")
    }
  }, [])

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/v1/auth/login`
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-white opacity-80"></div>

      <div className="absolute -left-24 -top-24 h-96 w-96 animate-pulse rounded-full bg-blue-100/40 blur-3xl delay-700 duration-10000"></div>
      <div className="absolute -bottom-24 -right-24 h-96 w-96 animate-pulse rounded-full bg-slate-200/40 blur-3xl duration-10000"></div>

      <div className="relative z-10 w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {errorMessage && (
          <Alert variant="destructive" className="mb-6 animate-in fade-in slide-in-from-top-4 bg-red-50 text-red-900 border-red-200">
            <AlertCircle className="h-4 w-4 stroke-red-600" />
            <AlertTitle className="text-red-800 font-semibold">Authentication Error</AlertTitle>
            <AlertDescription className="text-red-700 opacity-90">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-200/50">
          <CardHeader className="pb-6 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 shadow-lg shadow-blue-500/30 transform transition-transform hover:scale-105 hover:rotate-3 duration-300">
              <Mic className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
              Voice Assistant
            </CardTitle>
            <CardDescription className="mt-2 text-base font-medium text-slate-500">
              Manage your schedule effortlessly with AI-powered voice commands.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Button
              onClick={handleGoogleLogin}
              size="lg"
              className="group flex h-12 w-full items-center gap-3 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <svg className="h-5 w-5 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-semibold">Continue with Google</span>
            </Button>

            <div className="flex items-center justify-center gap-6 pt-2 text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2 transition-colors hover:text-slate-600">
                <CalendarDays className="h-4 w-4" />
                <span>Smart Sync</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-300"></div>
              <div className="flex items-center gap-2 transition-colors hover:text-slate-600">
                <Sparkles className="h-4 w-4" />
                <span>AI Agent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}