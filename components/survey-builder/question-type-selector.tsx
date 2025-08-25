// --- START OF FILE question-type-selector.tsx ---

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QuestionType as PrismaQuestionType } from '@prisma/client';
import {
  Type,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Circle,
  Hash,
  Mail,
  Phone,
  Link as LinkIcon,
  Calendar,
  Clock,
  BarChart3,
  Grid,
  Upload,
  Signature,
} from "lucide-react"

interface QuestionTypeSelectorProps {
  onSelect: (type: PrismaQuestionType) => void
  onCancel: () => void
}

// Extiende la interfaz para incluir la propiedad 'enabled'
interface QuestionTypeConfig {
  type: PrismaQuestionType;
  name: string;
  description: string;
  icon: React.ElementType; // Tipo para un componente de icono de Lucide React
  enabled: boolean; // <-- NUEVO CAMPO
}

const questionTypes: QuestionTypeConfig[] = [
  {
    type: PrismaQuestionType.TEXT,
    name: "Texto Corto",
    description: "Respuesta de una línea",
    icon: Type,
    enabled: true,
  },
  {
    type: PrismaQuestionType.TEXTAREA,
    name: "Texto Largo",
    description: "Respuesta de múltiples líneas",
    icon: AlignLeft,
    enabled: true,
  },
  {
    type: PrismaQuestionType.NUMBER,
    name: "Número",
    description: "Valor numérico",
    icon: Hash,
    enabled: true,
  },
  {
    type: PrismaQuestionType.EMAIL,
    name: "Email",
    description: "Dirección de correo",
    icon: Mail,
    enabled: true,
  },
  {
    type: PrismaQuestionType.PHONE,
    name: "Teléfono",
    description: "Número de teléfono",
    icon: Phone,
    enabled: true,
  },
  {
    type: PrismaQuestionType.URL,
    name: "URL",
    description: "Enlace web",
    icon: LinkIcon,
    enabled: true,
  },
  {
    type: PrismaQuestionType.DATE,
    name: "Fecha",
    description: "Selector de fecha",
    icon: Calendar,
    enabled: true,
  },
  {
    type: PrismaQuestionType.TIME,
    name: "Hora",
    description: "Selector de hora",
    icon: Clock,
    enabled: true,
  },
  {
    type: PrismaQuestionType.MULTIPLE_CHOICE,
    name: "Opción Única",
    description: "Una opción entre varias (radio)",
    icon: Circle,
    enabled: true,
  },
  {
    type: PrismaQuestionType.CHECKBOXES,
    name: "Casillas",
    description: "Múltiples opciones (checkboxes)",
    icon: CheckSquare,
    enabled: true,
  },
  {
    type: PrismaQuestionType.DROPDOWN,
    name: "Desplegable",
    description: "Lista desplegable",
    icon: ChevronDown,
    enabled: true,
  },
  {
    type: PrismaQuestionType.SCALE,
    name: "Escala/Calificación",
    description: "Valor en una escala numérica o estrellas",
    icon: BarChart3,
    enabled: true,
  },
  {
    type: PrismaQuestionType.MATRIX,
    name: "Matriz",
    description: "Pregunta de tipo matriz",
    icon: Grid,
    enabled: false, // <-- DESHABILITADO
  },
  {
    type: PrismaQuestionType.FILE_UPLOAD,
    name: "Carga de Archivo",
    description: "Permitir carga de archivos",
    icon: Upload,
    enabled: false, // <-- DESHABILITADO
  },
  {
    type: PrismaQuestionType.SIGNATURE,
    name: "Firma",
    description: "Campo de firma digital",
    icon: Signature,
    enabled: false, // <-- DESHABILITADO
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
        {/* Filtrar los tipos de preguntas que están habilitados */}
        {questionTypes.filter(qt => qt.enabled).map((questionType) => {
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