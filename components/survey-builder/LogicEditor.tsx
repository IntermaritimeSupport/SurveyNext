"use client"

// "Mostrar solo si…" editor for a question's conditional logic (Question.logic).
// Conditions can only reference earlier questions, so the form always evaluates top-down.
import { LOGIC_OPS, getLogic, type LogicCondition, type LogicOp, type QuestionLogic } from "@/lib/forms/logic"
import { CHOICE_TYPES, getChoiceOptions, getMatrixOptions, isAnswerable } from "@/lib/forms/question-types"
import type { QuestionData } from "./survey-manager"

interface Props {
  question: QuestionData & { logic?: unknown }
  previousQuestions: QuestionData[]
  onChange: (logic: QuestionLogic | null) => void
}

const NUMERIC = new Set(["NUMBER", "RATING", "SCALE", "NET_PROMOTER_SCORE"])
const MULTI = new Set(["CHECKBOXES", "MATRIX"])

function opsFor(type: string): LogicOp[] {
  if (MULTI.has(type)) return ["includes", "not_includes", "answered", "not_answered"]
  if (CHOICE_TYPES.has(type)) return ["eq", "neq", "answered", "not_answered"]
  if (NUMERIC.has(type)) return ["eq", "neq", "gt", "lt", "answered", "not_answered"]
  if (type === "DATE" || type === "TIME") return ["eq", "neq", "answered", "not_answered"]
  return ["eq", "neq", "includes", "not_includes", "answered", "not_answered"]
}

function valueChoices(q: QuestionData): { label: string; value: string }[] | null {
  if (q.type === "MATRIX") return getMatrixOptions(q).columns
  if (CHOICE_TYPES.has(q.type)) return getChoiceOptions(q)
  return null
}

const inputClass = "px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"

export default function LogicEditor({ question, previousQuestions, onChange }: Props) {
  const sources = previousQuestions.filter((q) => isAnswerable(q.type) && q.id)
  const logic = getLogic(question)
  const enabled = !!logic
  const conditions = logic?.showIf ?? []

  const emit = (showIf: LogicCondition[], match: "all" | "any" = logic?.match ?? "all") =>
    onChange(showIf.length ? { match, showIf } : null)

  const defaultCondition = (): LogicCondition => {
    const src = sources[sources.length - 1]
    return { questionId: src.id!, op: opsFor(src.type)[0], value: valueChoices(src)?.[0]?.value ?? "" }
  }

  const update = (i: number, patch: Partial<LogicCondition>) =>
    emit(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  return (
    <div className="mt-4 p-4 bg-indigo-50/60 rounded-md border border-indigo-100" onClick={(e) => e.stopPropagation()}>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input
          type="checkbox"
          checked={enabled}
          disabled={sources.length === 0}
          onChange={(e) => (e.target.checked ? emit([defaultCondition()]) : onChange(null))}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
        />
        {question.type === "SECTION" ? "Mostrar esta sección solo si…" : "Mostrar esta pregunta solo si…"}
      </label>
      {sources.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">Las condiciones dependen de preguntas anteriores; añade alguna antes de esta.</p>
      )}

      {enabled && (
        <div className="mt-3 space-y-2">
          {conditions.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              Se cumple
              <select className={inputClass} value={logic!.match} onChange={(e) => emit(conditions, e.target.value as "all" | "any")}>
                <option value="all">todas las condiciones</option>
                <option value="any">alguna condición</option>
              </select>
            </div>
          )}

          {conditions.map((c, i) => {
            const src = sources.find((q) => q.id === c.questionId)
            const ops = src ? opsFor(src.type) : LOGIC_OPS.map((o) => o.value)
            const needsValue = LOGIC_OPS.find((o) => o.value === c.op)?.needsValue
            const choices = src ? valueChoices(src) : null
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  className={`${inputClass} max-w-[16rem]`}
                  value={src ? c.questionId : ""}
                  onChange={(e) => {
                    const next = sources.find((q) => q.id === e.target.value)!
                    update(i, { questionId: next.id!, op: opsFor(next.type)[0], value: valueChoices(next)?.[0]?.value ?? "" })
                  }}
                >
                  {!src && <option value="">⚠️ Pregunta no disponible (muévela antes)</option>}
                  {sources.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.order}. {q.title || "(sin título)"}
                    </option>
                  ))}
                </select>
                <select className={inputClass} value={c.op} onChange={(e) => update(i, { op: e.target.value as LogicOp })}>
                  {LOGIC_OPS.filter((o) => ops.includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {needsValue &&
                  (choices ? (
                    <select className={`${inputClass} max-w-[14rem]`} value={String(c.value ?? "")} onChange={(e) => update(i, { value: e.target.value })}>
                      {choices.map((o) => (
                        <option key={o.value} value={o.value}>{o.label || o.value}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={`${inputClass} w-36`}
                      type={src && NUMERIC.has(src.type) ? "number" : src?.type === "DATE" ? "date" : src?.type === "TIME" ? "time" : "text"}
                      value={String(c.value ?? "")}
                      onChange={(e) => update(i, { value: src && NUMERIC.has(src.type) && e.target.value !== "" ? Number(e.target.value) : e.target.value })}
                      placeholder="valor"
                    />
                  ))}
                <button type="button" className="text-red-500 hover:text-red-700 text-sm px-1" title="Quitar condición" onClick={() => emit(conditions.filter((_, idx) => idx !== i))}>
                  ✕
                </button>
              </div>
            )
          })}

          <button type="button" className="text-sm text-indigo-700 hover:text-indigo-900" onClick={() => emit([...conditions, defaultCondition()])}>
            + Añadir condición
          </button>
        </div>
      )}
    </div>
  )
}
