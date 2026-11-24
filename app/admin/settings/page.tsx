"use client"

// Organization settings. Only settings that actually take effect are shown here; they are
// stored in the database (SystemSetting) through /api/settings.
import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Palette, Clock } from "lucide-react"
import type { FormTheme } from "@/lib/forms/theme"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

export default function SettingsPage() {
  const [defaults, setDefaults] = useState<FormTheme>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => setDefaults(d.formDefaults ?? {}))
      .catch(() => setMessage({ type: "error", text: "No se pudo cargar la configuración." }))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formDefaults: defaults }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || res.statusText)
      setDefaults(data.formDefaults ?? {})
      setMessage({ type: "ok", text: "Configuración guardada." })
    } catch (e: any) {
      setMessage({ type: "error", text: `No se pudo guardar: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof FormTheme, value: string | undefined) => setDefaults((d) => ({ ...d, [key]: value || undefined }))

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
            <p className="text-slate-600 mt-1 text-sm">Valores por defecto para todos los formularios.</p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" /> Apariencia por defecto
            </CardTitle>
            <CardDescription>
              Se aplica a los formularios que no tienen su propia apariencia. Cada formulario puede cambiarla en su pestaña de configuración.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
              <div className="space-y-1">
                <Label htmlFor="logoUrl">URL del logo</Label>
                <Input
                  id="logoUrl"
                  value={defaults.logoUrl ?? ""}
                  onChange={(e) => set("logoUrl", e.target.value)}
                  placeholder="https://… o /ics-logo.jpg"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="primaryColor">Color principal</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="primaryColor"
                    type="color"
                    value={defaults.primaryColor ?? "#2563eb"}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    className="h-9 w-14 border rounded"
                    disabled={loading}
                  />
                  {defaults.primaryColor && (
                    <button type="button" className="text-xs text-slate-500 hover:text-slate-700" onClick={() => set("primaryColor", undefined)}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="thankYou">Mensaje al terminar</Label>
              <Textarea
                id="thankYou"
                rows={3}
                value={defaults.thankYouMessage ?? ""}
                onChange={(e) => set("thankYouMessage", e.target.value)}
                placeholder="Your response has been submitted successfully."
                disabled={loading}
              />
            </div>
            {(defaults.logoUrl || defaults.primaryColor) && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Vista previa de la cabecera</p>
                <div
                  className={`rounded-lg px-4 py-3 flex items-center gap-3 ${defaults.primaryColor ? "" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}
                  style={defaults.primaryColor ? { backgroundColor: defaults.primaryColor } : undefined}
                >
                  {defaults.logoUrl && <img src={defaults.logoUrl} alt="" className="h-12 w-12 object-contain rounded bg-white/90" />}
                  <span className="text-white font-semibold">Título del formulario</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-slate-600">
              <Clock className="h-4 w-4" /> Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-1">
            <p>• Avisos por email (nuevas respuestas, confirmación al participante): falta elegir proveedor de correo.</p>
            <p>• Subida de archivos y firmas: falta elegir almacenamiento.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
