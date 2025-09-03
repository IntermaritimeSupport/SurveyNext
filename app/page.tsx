"use client"

import { useLanguage } from "@/hooks/use-language"
import { LanguageSelector } from "@/components/language-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, BarChart3, Users, Settings, FileText } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { t } = useLanguage()

  const features = [
    {
      icon: PlusCircle,
      title: t("createSurvey"),
      description: "Crea encuestas personalizadas con diferentes tipos de preguntas",
      href: "/admin/surveys/create",
      color: "text-blue-600",
    },
    {
      icon: FileText,
      title: t("surveys"),
      description: "Gestiona todas tus encuestas desde un panel centralizado",
      href: "/admin/surveys",
      color: "text-green-600",
    },
    {
      icon: Users,
      title: t("responses"),
      description: "Visualiza y analiza las respuestas de tus encuestas",
      href: "/admin/responses",
      color: "text-purple-600",
    },
    {
      icon: BarChart3,
      title: t("reports"),
      description: "Genera reportes detallados y exporta datos",
      href: "/admin/reports",
      color: "text-orange-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Sistema de Encuestas</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <Link href="/admin">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Settings className="w-4 h-4 mr-2" />
                  {t("admin")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Sistema Profesional de Encuestas</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Crea, gestiona y analiza encuestas con enlaces personalizados. Soporte multiidioma y reportes detallados
            para tomar mejores decisiones.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Link key={index} href={feature.href}>
                <Card className="survey-card hover:scale-105 transition-transform duration-200 cursor-pointer h-full">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">Características del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">∞</div>
              <div className="text-slate-600">Encuestas Ilimitadas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">3</div>
              <div className="text-slate-600">Idiomas Soportados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">11</div>
              <div className="text-slate-600">Tipos de Preguntas</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
