"use client"

import { QuestionType as PrismaQuestionType } from "@prisma/client"
import { useEffect, useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Circle } from 'lucide-react'
import { getChoiceOptions, getMatrixOptions, getRange } from '@/lib/forms/question-types'

interface PublicQuestion {
  id: string
  title: string
  description: string | null
  type: PrismaQuestionType
  required: boolean
  order: number
  options: any | null // Usar 'any' para Json?, o un tipo más específico como QuestionOption[] | null
  validation: Record<string, any> | null
}

interface LocalAnswer {
  questionId: string
  value: any
}

interface QuestionRendererProps {
  question: PublicQuestion
  answer?: LocalAnswer
  onAnswerChange: (value: any) => void
  error?: string
}

export function QuestionRenderer({ question, answer, onAnswerChange, error }: QuestionRendererProps) {
  const [localValue, setLocalValue] = useState<any>(
    answer?.value ||
    (question.type === PrismaQuestionType.CHECKBOXES ? [] : ""),
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileNameDisplay, setFileNameDisplay] = useState<string>("")

  useEffect(() => {
    const initialVal =
      answer?.value ||
      (question.type === PrismaQuestionType.CHECKBOXES ? [] : "")

    if (question.type === PrismaQuestionType.FILE_UPLOAD) {
      if (initialVal === null || initialVal === "") {
        setLocalValue(null)
        setFileNameDisplay("")
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } else if (typeof initialVal === "object" && initialVal !== null && "fileName" in initialVal) {
        setLocalValue(initialVal)
        setFileNameDisplay(initialVal.fileName)
      } else {
        setLocalValue(initialVal)
        setFileNameDisplay("")
      }
    } else {
      // Para RATING, si initialVal es "", asegúrate de que localValue sea null o el valor por defecto si lo hay.
      // Esto evita que "0" se muestre como "no calificado" si el valor inicial es una cadena vacía.
      if ((question.type === PrismaQuestionType.RATING || question.type === PrismaQuestionType.NET_PROMOTER_SCORE) && initialVal === "") {
        setLocalValue(null); // O un valor por defecto si prefieres
      } else if (JSON.stringify(localValue) !== JSON.stringify(initialVal)) {
        setLocalValue(initialVal)
      }
    }
  }, [question.id, answer?.value, question.type])

  const handleValueChange = (value: any) => {
    setLocalValue(value)
    onAnswerChange(value)
  }

  const renderInput = () => {
    switch (question.type) {
      case PrismaQuestionType.TEXT:
        return (
          <Input
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Your answer..."
            className={error ? "border-red-300" : ""}
            maxLength={question.validation?.maxLength}
            required
          />
        )

      case PrismaQuestionType.TEXTAREA:
        return (
          <Textarea
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Your answer..."
            rows={4}
            className={error ? "border-red-300" : ""}
            maxLength={question.validation?.maxLength}
          />
        )

      case PrismaQuestionType.EMAIL:
        return (
          <Input
            type="email"
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="your@email.com"
            className={error ? "border-red-300" : ""}
          />
        )

      case PrismaQuestionType.NUMBER:
        return (
          <Input
            type="number"
            value={(localValue as number) || ""}
            onChange={(e) => handleValueChange(e.target.value ? Number(e.target.value) : null)}
            placeholder="123"
            className={error ? "border-red-300" : ""}
            min={question.validation?.min}
            max={question.validation?.max}
          />
        )

      case PrismaQuestionType.DATE:
        return (
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none">
              <Calendar className="w-4 h-4" />
            </div>
            <Input
              type="date"
              value={localValue as string}
              onChange={(e) => handleValueChange(e.target.value)}
              className={`pl-10 ${error ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-blue-500"} 
                bg-white hover:border-slate-400 transition-colors duration-200 text-slate-700`}
              min={question.validation?.minDate}
              max={question.validation?.maxDate}
            />
            {!localValue && (
              <div className="absolute left-10 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none text-sm">
                Select a date
              </div>
            )}
          </div>
        )

      case PrismaQuestionType.TIME:
        return (
          <div className="relative w-full">
            <Input
              type="time"
              value={localValue as string}
              onChange={(e) => handleValueChange(e.target.value)}
              className={`w-auto 
          ${error ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-blue-500"} 
          bg-white hover:border-slate-400 transition-colors duration-200 text-slate-700`}
              min={question.validation?.minTime}
              max={question.validation?.maxTime}
            />
          </div>
        )

      case PrismaQuestionType.PHONE:
        return (
          <Input
            type="tel"
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Ej: +1234567890"
            className={error ? "border-red-300" : ""}
          />
        )

      case PrismaQuestionType.URL:
        return (
          <Input
            type="url"
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="https://example.com"
            className={error ? "border-red-300" : ""}
          />
        )

      case PrismaQuestionType.DROPDOWN:
        const optionsDropdown = getChoiceOptions(question)
        return (
          <Select value={localValue as string} onValueChange={handleValueChange}>
            <SelectTrigger className={error ? "border-red-300" : ""}>
              <SelectValue placeholder="Select a option..." />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(optionsDropdown) &&
                optionsDropdown.map((option: any, index: number) => (
                  <SelectItem key={index} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )

      case PrismaQuestionType.CHECKBOXES:
        const optionsCheckboxes = getChoiceOptions(question)
        return (
          <div className="space-y-2">
            {Array.isArray(optionsCheckboxes) &&
              optionsCheckboxes.map((option: any, index: number) => {
                const isChecked = Array.isArray(localValue) && localValue.includes(option.value)
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentValues = Array.isArray(localValue) ? [...localValue] : []
                        if (checked) {
                          handleValueChange([...currentValues, option.value])
                        } else {
                          handleValueChange(currentValues.filter((v) => v !== option.value))
                        }
                      }}
                    />
                    <Label>{option.label}</Label>
                  </div>
                )
              })}
          </div>
        )

      case PrismaQuestionType.MULTIPLE_CHOICE:
        const optionsRadio = getChoiceOptions(question)
        return (
          <RadioGroup value={localValue as string} onValueChange={handleValueChange}>
            {Array.isArray(optionsRadio) &&
              optionsRadio.map((option: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} />
                  <Label>{option.label}</Label>
                </div>
              ))}
          </RadioGroup>
        )

      case PrismaQuestionType.RATING:
        const { min: minRating, max: maxRating } = getRange(question)
        const currentRating = typeof localValue === 'number' ? localValue : 0; // Asegurarse de que sea un número

        return (
          <div className="flex items-center space-x-1">
            {Array.from({ length: maxRating - minRating + 1 }, (_, i) => {
              const ratingValue = minRating + i
              return (
                <div className="flex flex-col items-center gap-x-2 px-4" key={ratingValue}>
                <Circle
                  key={ratingValue}
                  className={`cursor-pointer ${
                    ratingValue <= currentRating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                  }`}
                  onClick={() => handleValueChange(ratingValue)}
                  size={28} // Ajusta el tamaño de la estrella según tu preferencia
                >
                </Circle>
                <span>{ratingValue}</span>
                </div>
              )
            })}
             {currentRating > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleValueChange(null)} // Permite quitar la calificación
                className="ml-2 text-red-500 hover:text-red-700"
              >
                Clear
              </Button>
            )}
          </div>
        )

      case PrismaQuestionType.SCALE:
        const { min: minScale, max: maxScale } = getRange(question)
        return (
          <div className="space-y-6 select-none">
            <div className="relative px-4">
              <input
                type="range"
                min={minScale}
                max={maxScale}
                value={typeof localValue === "number" ? localValue : minScale}
                onChange={(e) => handleValueChange(Number.parseInt(e.target.value))}
                className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
              />

              {/* Marcadores de escala */}
              <div className="flex justify-between mt-2 px-1">
                {Array.from({ length: maxScale - minScale + 1 }, (_, i) => {
                  const val = minScale + i
                  return (
                    <span
                      key={i}
                      className={`text-xs ${localValue === val ? "text-primary font-semibold" : "text-stone-500"}`}
                    >
                      {val}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Panel informativo */}
            <div className="bg-card border rounded-lg p-2 select-none">
              <div className="flex justify-between text-sm text-card-foreground">
                <span>
                  {question.validation?.minLabel || "Min"}: <span className="font-semibold font-mono">{minScale}</span>
                </span>
                {/* Valor actual destacado */}
                <span className="text-center">
                  <div className="text-xl font-bold text-primary">{typeof localValue === "number" ? localValue : "—"}</div>
                </span>
                <span>
                  {question.validation?.maxLabel || "Max"}: <span className="font-semibold font-mono">{maxScale}</span>
                </span>
              </div>
            </div>
          </div>
        )

      case PrismaQuestionType.FILE_UPLOAD:
        return (
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setFileNameDisplay(file.name)
                  const fileInfo = {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    // fileUrl: '', // Esto se llenaría después de una subida real a un servicio de almacenamiento
                  }
                  handleValueChange(fileInfo)
                } else {
                  setFileNameDisplay("")
                  handleValueChange(null)
                }
              }}
              className={error ? "border-red-300" : ""}
            />
            {fileNameDisplay && <p className="text-sm text-slate-600 mt-2">Archivo seleccionado: {fileNameDisplay}</p>}
            {localValue && !fileNameDisplay && typeof localValue === "object" && localValue.fileName && (
              <p className="text-sm text-slate-600 mt-2">
                Archivo actual:{" "}
                <a
                  href={localValue.fileUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {localValue.fileName}
                </a>
              </p>
            )}
          </div>
        )

      case PrismaQuestionType.NET_PROMOTER_SCORE: {
        const npsValue = typeof localValue === "number" ? localValue : null
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => handleValueChange(score)}
                  aria-pressed={npsValue === score}
                  className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                    npsValue === score
                      ? score <= 6 ? "bg-red-500 border-red-500 text-white" : score <= 8 ? "bg-amber-500 border-amber-500 text-white" : "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{question.validation?.minLabel || "Not at all likely"}</span>
              <span>{question.validation?.maxLabel || "Extremely likely"}</span>
            </div>
          </div>
        )
      }
      case PrismaQuestionType.MATRIX: {
        const { rows, columns } = getMatrixOptions(question)
        const cells: Record<string, string> = localValue && typeof localValue === "object" && !Array.isArray(localValue) ? localValue : {}
        if (rows.length === 0 || columns.length === 0) {
          return <p className="text-slate-500 text-sm">This question has no rows or columns configured.</p>
        }
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2" />
                  {columns.map((c) => (
                    <th key={c.value} className="p-2 text-center font-medium text-slate-600 min-w-[72px]">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.value} className="border-t border-slate-100">
                    <td className="p-2 text-slate-800">{r.label}</td>
                    {columns.map((c) => (
                      <td key={c.value} className="p-2 text-center">
                        <input
                          type="radio"
                          name={`${question.id}-${r.value}`}
                          aria-label={`${r.label}: ${c.label}`}
                          checked={cells[r.value] === c.value}
                          onChange={() => handleValueChange({ ...cells, [r.value]: c.value })}
                          className="h-4 w-4 accent-blue-600 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      case PrismaQuestionType.SECTION:
        return null
      case PrismaQuestionType.SIGNATURE:
        return <p className="text-slate-500">This question type is not available yet.</p>

      default:
        return <div className="text-slate-500">Tipo de pregunta no soportado o no reconocido: {question.type}</div>
    }
  }

  if (question.type === PrismaQuestionType.SECTION) {
    return (
      <div className="border-l-4 border-blue-500 pl-4 py-1">
        <h2 className="text-xl font-semibold text-slate-900">{question.title}</h2>
        {question.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{question.description}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900 leading-tight">
          {question.title}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        {question.description && (
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border-l-4 border-blue-200">
            {question.description}
          </p>
        )}
      </div>

      <div className="space-y-3">{renderInput()}</div>

      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {(question.type === PrismaQuestionType.TEXT || question.type === PrismaQuestionType.TEXTAREA) &&
        question.validation?.maxLength && (
          <div className="flex justify-end">
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {(localValue as string)?.length || 0}/{question.validation.maxLength} caracteres
            </span>
          </div>
        )}
    </div>
  )
}