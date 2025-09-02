// --- START OF FILE question-renderer.tsx ---
"use client"

import { QuestionType as PrismaQuestionType } from '@prisma/client';
import { useEffect, useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Star } from "lucide-react" // Quité Star, ya que no se usa

interface PublicQuestion {
  id: string;
  title: string;
  description: string | null;
  type: PrismaQuestionType;
  required: boolean;
  order: number;
  options: any | null; // Usar 'any' para Json?, o un tipo más específico como QuestionOption[] | null
  validation: Record<string, any> | null;
}

interface LocalAnswer {
  questionId: string;
  value: any;
}

interface QuestionRendererProps {
  question: PublicQuestion;
  answer?: LocalAnswer;
  onAnswerChange: (value: any) => void;
  error?: string;
}

export function QuestionRenderer({ question, answer, onAnswerChange, error }: QuestionRendererProps) {
  const [localValue, setLocalValue] = useState<any>(
    answer?.value || (
      (question.type === PrismaQuestionType.CHECKBOXES || question.type === PrismaQuestionType.MULTIPLE_CHOICE) ? [] : ""
    )
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileNameDisplay, setFileNameDisplay] = useState<string>("");

  useEffect(() => {
    const initialVal = answer?.value || (
      (question.type === PrismaQuestionType.CHECKBOXES || question.type === PrismaQuestionType.MULTIPLE_CHOICE) ? [] : ""
    );

    if (question.type === PrismaQuestionType.FILE_UPLOAD) {
      if (initialVal === null || initialVal === "") {
        setLocalValue(null);
        setFileNameDisplay("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else if (typeof initialVal === 'object' && initialVal !== null && 'fileName' in initialVal) {
        setLocalValue(initialVal);
        setFileNameDisplay(initialVal.fileName);
      } else {
         setLocalValue(initialVal);
         setFileNameDisplay("");
      }
    } else {
      if (JSON.stringify(localValue) !== JSON.stringify(initialVal)) {
        setLocalValue(initialVal);
      }
    }
  }, [question.id, answer?.value, question.type]);

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
            placeholder="Tu respuesta..."
            className={error ? "border-red-300" : ""}
            maxLength={question.validation?.maxLength}
          />
        )

      case PrismaQuestionType.TEXTAREA:
        return (
          <Textarea
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Tu respuesta..."
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
            placeholder="tu@email.com"
            className={error ? "border-red-300" : ""}
          />
        )

      case PrismaQuestionType.NUMBER:
        return (
          <Input
            type="number"
            value={localValue as number || ''}
            onChange={(e) => handleValueChange(e.target.value ? Number(e.target.value) : null)}
            placeholder="123"
            className={error ? "border-red-300" : ""}
            min={question.validation?.min}
            max={question.validation?.max}
          />
        )

      case PrismaQuestionType.DATE:
        return (
          <Input
            type="date"
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            className={error ? "border-red-300" : ""}
            min={question.validation?.minDate}
            max={question.validation?.maxDate}
          />
        )

      case PrismaQuestionType.TIME:
        return (
          <Input
            type="time"
            value={localValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            className={error ? "border-red-300" : ""}
            min={question.validation?.minDate}
            max={question.validation?.maxDate}
          />
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
            placeholder="https://ejemplo.com"
            className={error ? "border-red-300" : ""}
          />
        )

      case PrismaQuestionType.DROPDOWN:
        const optionsDropdown = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
        return (
          <Select value={localValue as string} onValueChange={handleValueChange}>
            <SelectTrigger className={error ? "border-red-300" : ""}>
              <SelectValue placeholder="Selecciona una opción..." />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(optionsDropdown) && optionsDropdown.map((option: any) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case PrismaQuestionType.CHECKBOXES:
        const optionsCheckboxes = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
        return (
          <div className="space-y-2">
            {Array.isArray(optionsCheckboxes) && optionsCheckboxes.map((option: any) => {
              const isChecked = Array.isArray(localValue) && localValue.includes(option.value);
              return (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(localValue) ? [...localValue] : [];
                      if (checked) {
                        handleValueChange([...currentValues, option.value]);
                      } else {
                        handleValueChange(currentValues.filter((v) => v !== option.value));
                      }
                    }}
                  />
                  <Label>{option.label}</Label>
                </div>
              );
            })}
          </div>
        );

      case PrismaQuestionType.MULTIPLE_CHOICE:
        const optionsRadio = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
        return (
          <RadioGroup value={localValue as string} onValueChange={handleValueChange}>
            {Array.isArray(optionsRadio) && optionsRadio.map((option: any) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} />
                <Label>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        )

      case PrismaQuestionType.RATING:
        const min = question.validation?.min || 1
        const max = question.validation?.max || 5
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{min}</span>
              <span>{max}</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: max - min + 1 }, (_, i) => {
                const val = min + i
                const isSelected = localValue === val
                return (
                  <Button
                    key={i}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleValueChange(val)}
                    className="w-12 h-12"
                  >
                    {val}
                  </Button>
                )
              })}
            </div>
            {localValue && <div className="text-center text-sm text-slate-600">Seleccionado: {localValue}</div>}
          </div>
        )
      case PrismaQuestionType.SCALE:
        const min2 = question.validation?.min || 1
        const max2 = question.validation?.max || 10
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{min2}</span>
              <span>{max2}</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: max2 - min2 + 1 }, (_, i) => {
                const val = min2 + i
                const isSelected = localValue === val
                return (
                  <Button
                    key={i}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleValueChange(val)}
                    className="w-12 h-12"
                  >
                    {val}
                  </Button>
                )
              })}
            </div>
            {localValue && <div className="text-center text-sm text-slate-600">Seleccionado: {localValue}</div>}
          </div>
        )
      case PrismaQuestionType.FILE_UPLOAD:
        return (
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFileNameDisplay(file.name);
                  const fileInfo = {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    // fileUrl: '', // Esto se llenaría después de una subida real a un servicio de almacenamiento
                  };
                  handleValueChange(fileInfo);
                } else {
                  setFileNameDisplay("");
                  handleValueChange(null);
                }
              }}
              className={error ? "border-red-300" : ""}
            />
            {fileNameDisplay && <p className="text-sm text-slate-600 mt-2">Archivo seleccionado: {fileNameDisplay}</p>}
            {localValue && !fileNameDisplay && typeof localValue === 'object' && localValue.fileName && (
              <p className="text-sm text-slate-600 mt-2">Archivo actual: <a href={localValue.fileUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{localValue.fileName}</a></p>
            )}
          </div>
        );

      case PrismaQuestionType.SIGNATURE:
        return <p className="text-slate-500">Campo de firma (implementación gráfica necesaria)</p>
      case PrismaQuestionType.MATRIX:
        return <p className="text-slate-500">Pregunta de matriz (implementación compleja necesaria)</p>

      default:
        return <div className="text-slate-500">Tipo de pregunta no soportado o no reconocido: {question.type}</div>
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          {question.title}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        {question.description && <p className="text-sm text-slate-600 mb-4">{question.description}</p>}
      </div>

      {renderInput()}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(question.type === PrismaQuestionType.TEXT || question.type === PrismaQuestionType.TEXTAREA) && question.validation?.maxLength && (
        <p className="text-xs text-slate-500 text-right">
          {(localValue as string)?.length || 0}/{question.validation.maxLength} caracteres
        </p>
      )}
    </div>
  )
}