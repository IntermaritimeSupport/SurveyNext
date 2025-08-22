// --- START OF FILE question-type-selector.tsx ---

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QuestionType as PrismaQuestionType } from '@prisma/client'; // Importar de Prisma
import {
  Type,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Circle,
  Square, // Este podría ser para un checkbox simple o un placeholder
  Star,
  BarChart3,
  Calendar,
  Mail,
  Hash,
  Phone,
  Link as LinkIcon,
  Signature,
  Upload,
  Grid,
  Clock // Para TIME
} from "lucide-react"

interface QuestionTypeSelectorProps {
  onSelect: (type: PrismaQuestionType) => void
  onCancel: () => void
}

const questionTypes = [
  {
    type: PrismaQuestionType.TEXT,
    name: "Texto Corto",
    description: "Respuesta de una línea",
    icon: Type,
  },
  {
    type: PrismaQuestionType.TEXTAREA,
    name: "Texto Largo",
    description: "Respuesta de múltiples líneas",
    icon: AlignLeft,
  },
  {
    type: PrismaQuestionType.NUMBER,
    name: "Número",
    description: "Valor numérico",
    icon: Hash,
  },
  {
    type: PrismaQuestionType.EMAIL,
    name: "Email",
    description: "Dirección de correo",
    icon: Mail,
  },
  {
    type: PrismaQuestionType.PHONE,
    name: "Teléfono",
    description: "Número de teléfono",
    icon: Phone,
  },
  {
    type: PrismaQuestionType.URL,
    name: "URL",
    description: "Enlace web",
    icon: LinkIcon,
  },
  {
    type: PrismaQuestionType.DATE,
    name: "Fecha",
    description: "Selector de fecha",
    icon: Calendar,
  },
  {
    type: PrismaQuestionType.TIME, // Añadido
    name: "Hora",
    description: "Selector de hora",
    icon: Clock, // Cambiado el icono por uno más apropiado
  },
  {
    type: PrismaQuestionType.MULTIPLE_CHOICE, // Para radio buttons (selección única)
    name: "Opción Única",
    description: "Una opción entre varias (radio)",
    icon: Circle,
  },
  {
    type: PrismaQuestionType.CHECKBOXES, // Para múltiples checkboxes
    name: "Casillas",
    description: "Múltiples opciones (checkboxes)",
    icon: CheckSquare, // Icono más representativo de múltiples casillas
  },
  {
    type: PrismaQuestionType.DROPDOWN,
    name: "Desplegable",
    description: "Lista desplegable",
    icon: ChevronDown,
  },
  {
    type: PrismaQuestionType.SCALE, // Este tipo en Prisma abarca escalas numéricas y ratings con estrellas
    name: "Escala/Calificación", // Nombre más genérico
    description: "Valor en una escala numérica o estrellas",
    icon: BarChart3, // O Star, dependiendo de cómo lo uses
  },
  {
    type: PrismaQuestionType.MATRIX,
    name: "Matriz",
    description: "Pregunta de tipo matriz",
    icon: Grid,
  },
  {
    type: PrismaQuestionType.FILE_UPLOAD,
    name: "Carga de Archivo",
    description: "Permitir carga de archivos",
    icon: Upload,
  },
  {
    type: PrismaQuestionType.SIGNATURE,
    name: "Firma",
    description: "Campo de firma digital",
    icon: Signature,
  },
]

export function QuestionTypeSelector({ onSelect, onCancel }: QuestionTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Selecciona el tipo de pregunta</h3>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {questionTypes.map((questionType) => {
          const Icon = questionType.icon
          return (
            <Card
              key={questionType.type}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelect(questionType.type)}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-slate-900 mb-1">{questionType.name}</h4>
                <p className="text-sm text-slate-500">{questionType.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
// --- END OF FILE question-type-selector.tsx ---