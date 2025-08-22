"use client"

import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/hooks/use-language"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Shield, Mail, Database, Palette, Bell } from "lucide-react"
import { useState, useEffect } from "react"

interface SystemSettings {
  siteName: string
  siteDescription: string
  defaultLanguage: string
  allowRegistration: boolean
  requireEmailVerification: boolean
  maxSurveysPerUser: number
  maxResponsesPerSurvey: number
  enableNotifications: boolean
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: "Sistema de Encuestas",
    siteDescription: "Plataforma profesional para crear y gestionar encuestas",
    defaultLanguage: "es",
    allowRegistration: true,
    requireEmailVerification: false,
    maxSurveysPerUser: 50,
    maxResponsesPerSurvey: 1000,
    enableNotifications: true,
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    primaryColor: "#2563eb",
    secondaryColor: "#64748b",
    logoUrl: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const storedSettings = localStorage.getItem("survey_settings")
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings))
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      localStorage.setItem("survey_settings", JSON.stringify(settings))
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert("Configuración guardada exitosamente")
    } catch (error) {
      alert("Error al guardar la configuración")
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Configuración del Sistema</h1>
            <p className="text-slate-600 mt-1">Gestiona la configuración global de la plataforma</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="limits">Límites</TabsTrigger>
            <TabsTrigger value="appearance">Apariencia</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Configuración General</span>
                </CardTitle>
                <CardDescription>Configuración básica del sitio y preferencias generales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Nombre del Sitio</Label>
                    <Input
                      id="siteName"
                      value={settings.siteName}
                      onChange={(e) => updateSetting("siteName", e.target.value)}
                      placeholder="Nombre de tu plataforma"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Idioma por Defecto</Label>
                    <Select
                      value={settings.defaultLanguage}
                      onValueChange={(value) => updateSetting("defaultLanguage", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Descripción del Sitio</Label>
                  <Textarea
                    id="siteDescription"
                    value={settings.siteDescription}
                    onChange={(e) => updateSetting("siteDescription", e.target.value)}
                    placeholder="Describe tu plataforma de encuestas"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL del Logo</Label>
                  <Input
                    id="logoUrl"
                    value={settings.logoUrl}
                    onChange={(e) => updateSetting("logoUrl", e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Configuración de Seguridad</span>
                </CardTitle>
                <CardDescription>Gestiona la seguridad y permisos del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Permitir Registro de Usuarios</Label>
                    <p className="text-sm text-slate-500">Los usuarios pueden crear cuentas nuevas</p>
                  </div>
                  <Switch
                    checked={settings.allowRegistration}
                    onCheckedChange={(checked) => updateSetting("allowRegistration", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Verificación de Email Requerida</Label>
                    <p className="text-sm text-slate-500">Los usuarios deben verificar su email</p>
                  </div>
                  <Switch
                    checked={settings.requireEmailVerification}
                    onCheckedChange={(checked) => updateSetting("requireEmailVerification", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Configuración de Email</span>
                </CardTitle>
                <CardDescription>Configura el servidor SMTP para envío de emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">Servidor SMTP</Label>
                    <Input
                      id="smtpHost"
                      value={settings.smtpHost}
                      onChange={(e) => updateSetting("smtpHost", e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Puerto SMTP</Label>
                    <Input
                      id="smtpPort"
                      value={settings.smtpPort}
                      onChange={(e) => updateSetting("smtpPort", e.target.value)}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">Usuario SMTP</Label>
                    <Input
                      id="smtpUser"
                      value={settings.smtpUser}
                      onChange={(e) => updateSetting("smtpUser", e.target.value)}
                      placeholder="tu-email@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">Contraseña SMTP</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={settings.smtpPassword}
                      onChange={(e) => updateSetting("smtpPassword", e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Límites del Sistema</span>
                </CardTitle>
                <CardDescription>Configura los límites de uso de la plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxSurveysPerUser">Máximo de Encuestas por Usuario</Label>
                    <Input
                      id="maxSurveysPerUser"
                      type="number"
                      value={settings.maxSurveysPerUser}
                      onChange={(e) => updateSetting("maxSurveysPerUser", Number.parseInt(e.target.value))}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxResponsesPerSurvey">Máximo de Respuestas por Encuesta</Label>
                    <Input
                      id="maxResponsesPerSurvey"
                      type="number"
                      value={settings.maxResponsesPerSurvey}
                      onChange={(e) => updateSetting("maxResponsesPerSurvey", Number.parseInt(e.target.value))}
                      min="1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Apariencia</span>
                </CardTitle>
                <CardDescription>Personaliza la apariencia de la plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Color Primario</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) => updateSetting("primaryColor", e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={settings.primaryColor}
                        onChange={(e) => updateSetting("primaryColor", e.target.value)}
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Color Secundario</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={settings.secondaryColor}
                        onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={settings.secondaryColor}
                        onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                        placeholder="#64748b"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notificaciones</span>
                </CardTitle>
                <CardDescription>Configura las notificaciones del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Habilitar Notificaciones</Label>
                    <p className="text-sm text-slate-500">Enviar notificaciones por email</p>
                  </div>
                  <Switch
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) => updateSetting("enableNotifications", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
