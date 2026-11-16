"use client"

// Per-type configuration panel for a question. Writes Question.validation using the
// keys understood by lib/forms/validate.ts and the public renderer.
import { getRange } from "@/lib/forms/question-types"
import type { QuestionData } from "./survey-manager"

interface Props {
  question: QuestionData
  onChange: (validation: Record<string, any> | null) => void
}

type FieldKind = "number" | "text" | "date" | "time" | "checkbox"

interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  placeholder?: string
  help?: string
}

const FIELDS: Record<string, FieldDef[]> = {
  TEXT: [
    { key: "minLength", label: "Mínimo de caracteres", kind: "number" },
    { key: "maxLength", label: "Máximo de caracteres", kind: "number" },
    { key: "pattern", label: "Formato (expresión regular)", kind: "text", placeholder: "^IMO\\d{7}$", help: "Opcional. Ej: ^IMO\\d{7}$ para un número IMO." },
    { key: "patternMessage", label: "Mensaje si el formato no coincide", kind: "text", placeholder: "Enter a valid IMO number" },
  ],
  TEXTAREA: [
    { key: "minLength", label: "Mínimo de caracteres", kind: "number" },
    { key: "maxLength", label: "Máximo de caracteres", kind: "number" },
  ],
  NUMBER: [
    { key: "min", label: "Valor mínimo", kind: "number" },
    { key: "max", label: "Valor máximo", kind: "number" },
    { key: "integer", label: "Solo números enteros", kind: "checkbox" },
  ],
  RATING: [
    { key: "min", label: "Desde", kind: "number", placeholder: "1" },
    { key: "max", label: "Hasta", kind: "number", placeholder: "5" },
  ],
  SCALE: [
    { key: "min", label: "Desde", kind: "number", placeholder: "0" },
    { key: "max", label: "Hasta", kind: "number", placeholder: "10" },
    { key: "minLabel", label: "Etiqueta del mínimo", kind: "text", placeholder: "Nada satisfecho" },
    { key: "maxLabel", label: "Etiqueta del máximo", kind: "text", placeholder: "Muy satisfecho" },
  ],
  NET_PROMOTER_SCORE: [
    { key: "minLabel", label: "Etiqueta del 0", kind: "text", placeholder: "Not at all likely" },
    { key: "maxLabel", label: "Etiqueta del 10", kind: "text", placeholder: "Extremely likely" },
  ],
  DATE: [
    { key: "minDate", label: "Fecha mínima", kind: "date" },
    { key: "maxDate", label: "Fecha máxima", kind: "date" },
  ],
  TIME: [
    { key: "minTime", label: "Hora mínima", kind: "time" },
    { key: "maxTime", label: "Hora máxima", kind: "time" },
  ],
  CHECKBOXES: [
    { key: "minSelections", label: "Mínimo de opciones a marcar", kind: "number" },
    { key: "maxSelections", label: "Máximo de opciones a marcar", kind: "number" },
  ],
}

export function hasSettings(type: string): boolean {
  return type in FIELDS
}

export default function QuestionSettings({ question, onChange }: Props) {
  const fields = FIELDS[question.type]
  if (!fields) return null
  const v = question.validation ?? {}

  const set = (key: string, value: unknown) => {
    const next: Record<string, any> = { ...v }
    if (value === "" || value === null || value === undefined || value === false) delete next[key]
    else next[key] = value
    onChange(Object.keys(next).length ? next : null)
  }

  const isRange = question.type === "RATING" || question.type === "SCALE"
  const range = isRange ? getRange(question) : null
  const rangeInvalid = isRange && v.min !== undefined && v.max !== undefined && Number(v.min) >= Number(v.max)

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200" onClick={(e) => e.stopPropagation()}>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Configuración y validación</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className={f.kind === "checkbox" ? "sm:col-span-2" : ""}>
            {f.kind === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!v[f.key]}
                  onChange={(e) => set(f.key, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                {f.label}
              </label>
            ) : (
              <>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.kind}
                  value={v[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, f.kind === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {f.help && <p className="text-xs text-gray-500 mt-1">{f.help}</p>}
              </>
            )}
          </div>
        ))}
      </div>
      {range && (
        <p className={`text-xs mt-3 ${rangeInvalid ? "text-red-600" : "text-gray-500"}`}>
          {rangeInvalid
            ? "El mínimo debe ser menor que el máximo; mientras tanto se usa el rango por defecto."
            : `Rango actual: ${range.min} a ${range.max}.`}
        </p>
      )}
    </div>
  )
}
