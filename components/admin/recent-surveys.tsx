"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Edit, MoreHorizontal, Loader2, Share } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

// Importar los tipos de Prisma
import type { Survey as PrismaSurvey } from "@prisma/client"
import Loader from "../loaders/loader"

// Define la URL base de la API (misma lógica que en auth-context)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// Definir una interfaz para la encuesta que incluya el conteo de respuestas
// dado que tu API devuelve _count.responses
interface SurveyWithCount extends PrismaSurvey {
  _count?: {
    responses: number
  }
}

export function RecentSurveys() {
  const [surveys, setSurveys] = useState<SurveyWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecentSurveys = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys`) // Llama a tu API de encuestas
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: SurveyWithCount[] = await response.json()

        // Filtra y ordena las 5 más recientes como lo hacías antes
        const recent = data
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)

        setSurveys(recent)
      } catch (err: any) {
        console.error("Error fetching recent surveys:", err)
        setError("Error al cargar las encuestas recientes.")
      } finally {
        setLoading(false)
      }
    }

    fetchRecentSurveys()
  }, []) // El array de dependencias vacío asegura que se ejecute solo una vez al montar

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      alert("✅ Enlace copiado al portapapeles")
    } catch (err) {
      console.error("Error al copiar el enlace:", err)
      alert("❌ No se pudo copiar el enlace")
    }
  }


  if (loading) {
    return (
      <Card className="survey-card">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Encuestas Recientes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader/>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="survey-card">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Encuestas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-500 mb-2 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (surveys.length === 0) {
    return (
      <Card className="survey-card">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Encuestas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-slate-500 mb-2 text-sm">No hay encuestas creadas aún</p>
            <Link href="/admin/surveys/create">
              <Button size="sm">Crear Primera Encuesta</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="survey-card">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-base">Encuestas Recientes</CardTitle>
        <Link href="/admin/surveys">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs bg-transparent">
            Ver Todas
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="py-2 px-4 text-xs font-medium text-slate-600">Encuesta</TableHead>
              <TableHead className="py-2 px-4 text-xs font-medium text-slate-600">Estado</TableHead>
              <TableHead className="py-2 px-4 text-xs font-medium text-slate-600">Respuestas</TableHead>
              <TableHead className="py-2 px-4 text-xs font-medium text-slate-600 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.map((survey) => (
              <TableRow key={survey.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <TableCell className="py-2 px-4">
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm leading-tight">{survey.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{survey.description}</p>
                  </div>
                </TableCell>
                <TableCell className="py-2 px-4">
                  <Badge
                    variant={survey.status === "PUBLISHED" ? "default" : "secondary"}
                    className="text-xs px-2 py-0.5"
                  >
                    {survey.status === "PUBLISHED" ? "Activa" : "Borrador"}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 px-4">
                  <span className="text-sm text-slate-600">{survey._count?.responses || 0}</span>
                </TableCell>
                <TableCell className="py-2 px-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Link href={`/survey/${survey.customLink}`} target="_blank">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 bg-transparent"
                        disabled={survey.status !== "PUBLISHED"}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 bg-transparent"
                      disabled={survey.status !== "PUBLISHED"}
                      onClick={() => copyLink(`${window.location.origin}/survey/${survey.customLink}`)}
                    >
                      <Share className="h-3 w-3" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-transparent">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/surveys/${survey.id}/edit`}>
                            <Edit className="h-3 w-3 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/responses?survey=${survey.id}`}>Ver Respuestas</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
