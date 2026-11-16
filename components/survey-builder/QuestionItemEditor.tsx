"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import type { QuestionData, QuestionOption } from "./survey-manager"
import QuestionSettings, { hasSettings } from "./QuestionSettings"
import { QUESTION_TYPES, getMatrixOptions, getRange, newOptionValue, type ChoiceOption } from "@/lib/forms/question-types"

// Types offered in the builder (FILE_UPLOAD / SIGNATURE stay hidden until implemented)
const questionTypeOptions = QUESTION_TYPES.filter((t) => !t.hidden)

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
  readOnly?: boolean // Para controlar si es solo de lectura (vista previa)
  isTitle?: boolean // Para aplicar estilos específicos de título en la vista previa
  hasError?: boolean
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  placeholder = "",
  className = "",
  multiline = false,
  readOnly = false,
  isTitle = false,
  hasError = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setTempValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Mover el cursor al final del texto
      const len = tempValue.length
      if (multiline) {
        ;(inputRef.current as HTMLTextAreaElement).setSelectionRange(len, len)
      } else {
        ;(inputRef.current as HTMLInputElement).setSelectionRange(len, len)
      }
    }
  }, [isEditing, multiline, tempValue.length])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que el doble clic propague al contenedor de la pregunta
    if (!readOnly) {
      setIsEditing(true)
    }
  }

  const handleBlur = () => {
    if (isEditing) {
      onChange(tempValue)
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleBlur()
    } else if (e.key === "Escape") {
      setTempValue(value) // Revertir al valor original
      setIsEditing(false)
    }
  }

  const inputClasses = `${className} ${hasError ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-500 ring-1 ring-blue-500'}`;

  if (isEditing) {
    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} border-blue-500 ring-1 ring-blue-500`}
        placeholder={placeholder}
        rows={isTitle ? 1 : 2} // Títulos suelen ser de una línea
        style={isTitle ? { minHeight: 'auto', height: 'auto' } : undefined}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} border-blue-500 ring-1 ring-blue-500`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`${className} ${readOnly ? "cursor-default" : "cursor-pointer hover:bg-blue-50 hover:border-blue-300"} transition-colors relative group flex items-center justify-between
                  ${hasError ? 'border-red-400 bg-red-50' : ''}`}
      title={readOnly ? "" : "Doble click para editar"}
    >
      <span className={`${!value && "text-gray-400 italic"} ${isTitle ? "font-medium text-lg" : ""}`}>
        {value || placeholder}
      </span>
      {!readOnly && (
        <span className="absolute top-0 right-0 -mr-2 opacity-0 group-hover:opacity-100 text-xs text-blue-500 bg-white px-1 rounded shadow-sm transition-opacity">
          ✏️
        </span>
      )}
      {/* Mensaje de error para títulos requeridos */}
      {isTitle && hasError && (
        <p className="absolute -bottom-6 left-0 text-red-600 text-xs mt-1">Este título es obligatorio.</p>
      )}
    </div>
  )
}

interface QuestionItemEditorProps {
  question: QuestionData
  index: number
  onUpdate: (index: number, field: keyof QuestionData, value: any) => void
  onRemove: (index: number, questionId?: string) => void
  isRemovable: boolean
  onSelectQuestion: (index: number) => void // Para seleccionar la pregunta y mostrar sus controles globales
  onDuplicate: (index: number) => void
  onMove: (index: number, direction: -1 | 1) => void
  isFirst: boolean
  isLast: boolean
  isSelected: boolean // Si la pregunta está actualmente seleccionada (editando sus propiedades globales)
  isTitleMissingAndRequired: boolean;
}

export default function QuestionItemEditor({
  question,
  index,
  onUpdate,
  onRemove,
  isRemovable,
  onSelectQuestion,
  isSelected,
  isTitleMissingAndRequired,
  onDuplicate,
  onMove,
  isFirst,
  isLast,
}: QuestionItemEditorProps) {
  const [npsDisplayScore, setNpsDisplayScore] = useState<number | null>(null)

  const handleUpdate = useCallback(
    (field: keyof QuestionData, value: any) => {
      onUpdate(index, field, value)
    },
    [index, onUpdate],
  )

  const options: QuestionOption[] = Array.isArray(question.options) ? question.options : []

  const handleUpdateOption = useCallback(
    (optIndex: number, label: string) => {
      handleUpdate("options", options.map((opt, i) => (i === optIndex ? { ...opt, label, value: opt.value || newOptionValue() } : opt)))
    },
    [options, handleUpdate]
  );

  const handleAddOption = useCallback(() => {
    handleUpdate("options", [...options, { label: `Opción ${options.length + 1}`, value: newOptionValue() }]);
  }, [options, handleUpdate]);

  const updateMatrix = useCallback(
    (kind: "rows" | "columns", items: ChoiceOption[]) => {
      handleUpdate("options", { ...getMatrixOptions(question), [kind]: items })
    },
    [question, handleUpdate]
  )

  const handleRemoveOption = useCallback(
    (optIndex: number) => {
      handleUpdate("options", options.filter((_, i) => i !== optIndex))
    },
    [options, handleUpdate],
  )

  // --- Renderizado del PREVIEW de los campos (con editable por doble click en texto) ---
  const renderPreviewWithInlineEdit = useCallback(() => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md text-base text-gray-800 bg-white"
    const inputDisabledClasses = "pointer-events-none opacity-80" // Para que se vea inactivo pero no interfiere con EditableText

    const choiceOptions: QuestionOption[] = Array.isArray(question.options) ? question.options : []
    const renderChoiceList = (kind: "radio" | "checkbox" | "select") => (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        {choiceOptions.map((option, idx) => (
          <div key={option.value || idx} className="flex items-center gap-2">
            {kind === "select" ? <span className="text-sm text-gray-500 w-4 text-center">{idx + 1}.</span> : <input type={kind} disabled className="h-4 w-4 border-gray-300" />}
            <EditableText
              value={option.label}
              onChange={(value) => handleUpdateOption(idx, value)}
              className="flex-1 text-base text-gray-800"
              placeholder={`Opción ${idx + 1}`}
            />
            <button type="button" onClick={() => handleRemoveOption(idx)} disabled={choiceOptions.length <= 1} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 disabled:opacity-30 disabled:hover:bg-transparent" title="Eliminar opción">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" /></svg>
            </button>
          </div>
        ))}
        {choiceOptions.some((o) => !o.label.trim()) && <p className="text-xs text-amber-600">Hay opciones sin texto: no se mostrarán en el formulario.</p>}
        <button type="button" onClick={handleAddOption} className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-md text-blue-600 hover:border-blue-400 hover:text-blue-700 text-sm flex items-center justify-center gap-2 transition-colors">
          + Añadir opción
        </button>
      </div>
    )

    // Helper para renderizar EditableText para título y descripción
    const renderEditableField = (field: keyof QuestionData, placeholder: string, multiline: boolean = false, isTitle: boolean = false) => (
      <EditableText
        value={question[field]?.toString() || ""}
        onChange={(value) => handleUpdate(field, value)}
        placeholder={placeholder}
        className={`w-full ${isTitle ? 'mb-2 text-lg font-bold' : 'mb-2 text-sm text-gray-700'}`}
        multiline={multiline}
        isTitle={isTitle}
         hasError={isTitle && isTitleMissingAndRequired && !question[field]?.toString()}
      />
    );

    switch (question.type) {
      case "MULTIPLE_CHOICE":
      case "CHECKBOXES":
        return (
          <div className="space-y-3">
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            {renderChoiceList(question.type === "CHECKBOXES" ? "checkbox" : "radio")}
          </div>
        )
      case "TEXT":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <input type="text" disabled placeholder="Respuesta corta de texto" className={`${baseClasses} ${inputDisabledClasses}`} />
          </div>
        )
      case "RATING": {
        const { min, max } = getRange(question)
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <div className="flex flex-wrap gap-2 text-gray-400">
              {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
                <span key={n} className="flex flex-col items-center text-xs"><span className="text-2xl">○</span>{n}</span>
              ))}
            </div>
          </div>
        )
      }
      case "DATE":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <input type="date" disabled className={`${baseClasses} ${inputDisabledClasses}`} />
          </div>
        )
      case "MATRIX": {
        const grid = getMatrixOptions(question)
        return (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["rows", "columns"] as const).map((kind) => (
                <div key={kind} className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{kind === "rows" ? "Filas (afirmaciones)" : "Columnas (respuestas)"}</p>
                  {grid[kind].map((item, idx) => (
                    <div key={item.value} className="flex items-center gap-2">
                      <EditableText
                        value={item.label}
                        onChange={(label) => updateMatrix(kind, grid[kind].map((x, i) => (i === idx ? { ...x, label } : x)))}
                        className="flex-1 text-sm text-gray-800 border border-gray-200 rounded px-2 py-1"
                        placeholder={kind === "rows" ? `Fila ${idx + 1}` : `Columna ${idx + 1}`}
                      />
                      <button type="button" title="Eliminar" disabled={grid[kind].length <= 1} onClick={() => updateMatrix(kind, grid[kind].filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 disabled:opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => updateMatrix(kind, [...grid[kind], { label: kind === "rows" ? `Fila ${grid[kind].length + 1}` : `Columna ${grid[kind].length + 1}`, value: newOptionValue() }])} className="w-full py-1.5 border border-dashed border-gray-300 rounded-md text-blue-600 hover:border-blue-400 text-sm">
                    + Añadir {kind === "rows" ? "fila" : "columna"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case "FILE_UPLOAD":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file-display"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-default bg-gray-50"
              >
                <div className="flex flex-col items-center justify-center pt-2 pb-3">
                  <svg
                    className="w-8 h-8 mb-2 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a3 3 0 013 3v10a2 2 0 01-2 2H7a2 2 0 01-2-2v-1"
                    ></path>
                  </svg>
                  <p className="mb-0 text-sm text-gray-500">
                    <span className="font-semibold">Click para subir</span> o arrastra y suelta
                  </p>
                </div>
                <input id="dropzone-file-display" type="file" className="hidden" disabled />
              </label>
            </div>
          </div>
        )
      case "NET_PROMOTER_SCORE":
        // Now using the lifted state
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-red-600">Nada probable</span>
              <span className="text-green-600">Extremadamente probable</span>
            </div>
            <div className="flex justify-between border border-gray-300 rounded-md p-2 bg-white shadow-sm">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setNpsDisplayScore(score)}
                  className={`flex items-center justify-center h-8 w-8 rounded-full border text-sm transition-colors
                                ${npsDisplayScore === score ? "border-blue-500 bg-blue-100 text-blue-800" : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100"}`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        )
      case "SECTION":
        return (
          <div className="border-l-4 border-blue-400 pl-4 py-3 bg-blue-50 rounded-md">
            <EditableText
              value={question.title || ""}
              onChange={(value) => handleUpdate("title", value)}
              placeholder="Título de la Sección"
              className="mb-1 text-xl font-semibold text-blue-800"
              isTitle={true}
            />
            <EditableText
              value={question.description || ""}
              onChange={(value) => handleUpdate("description", value)}
              placeholder="Descripción de la sección (opcional)"
              className="text-blue-700 text-base"
              multiline={true}
            />
          </div>
        )
      case "TEXTAREA":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <textarea rows={3} disabled placeholder="Respuesta larga de texto" className={`${baseClasses} ${inputDisabledClasses}`}></textarea>
          </div>
        )
      case "NUMBER":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <input type="number" disabled placeholder="123" className={`${baseClasses} ${inputDisabledClasses}`} />
          </div>
        )
      case "EMAIL":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <input type="email" disabled placeholder="ejemplo@dominio.com" className={`${baseClasses} ${inputDisabledClasses}`} />
          </div>
        )
      case "PHONE":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <input type="tel" disabled placeholder="+1 (555) 123-4567" className={`${baseClasses} ${inputDisabledClasses}`} />
          </div>
        )
      case "URL":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <input type="url" disabled placeholder="https://www.ejemplo.com" className={`${baseClasses} ${inputDisabledClasses}`} />
          </div>
        )
      case "TIME":
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <input type="time" disabled className={`${baseClasses} ${inputDisabledClasses}`} />
          </div>
        )
      case "DROPDOWN":
        return (
          <div className="space-y-3">
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            {renderChoiceList("select")}
          </div>
        )
      case "SCALE": {
        const { min, max } = getRange(question)
        return (
          <div>
            {renderEditableField("title", "Título de la pregunta", false, true)}
            {renderEditableField("description", "Descripción (opcional)", true)}
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
              <span>{question.validation?.minLabel || min}</span>
              <input type="range" min={min} max={max} disabled className="flex-1 accent-blue-600 h-2" />
              <span>{question.validation?.maxLabel || max}</span>
            </div>
          </div>
        )
      }
      default:
        return (
          <p className="text-base text-gray-500 italic">No hay vista previa disponible para este tipo de pregunta.</p>
        )
    }
  }, [
    question,
    options,
    updateMatrix,
    question.type,
    question.options,
    question.id,
    question.title,
    question.description,
    handleUpdate,
    handleUpdateOption,
    handleAddOption,
    handleRemoveOption,
    isTitleMissingAndRequired,
    npsDisplayScore,
  ])


  return (
    <div
      className={`relative border rounded-lg p-4 space-y-4 bg-white shadow-sm transition-all duration-200
                  ${isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"}`}
      onClick={() => !isSelected && onSelectQuestion(index)}
    >
      {/* Botones de acción flotantes para duplicar y eliminar */}
      {isSelected && (
        <div className="absolute top-0 right-0 -mr-3 -mt-3 flex gap-2 z-10"> {/* Añadimos z-10 para asegurar que estén por encima */}
          <button
            type="button"
            className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-30"
            title="Subir"
            disabled={isFirst}
            onClick={(e) => { e.stopPropagation(); onMove(index, -1); }}
          >▲</button>
          <button
            type="button"
            className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-30"
            title="Bajar"
            disabled={isLast}
            onClick={(e) => { e.stopPropagation(); onMove(index, 1); }}
          >▼</button>
          <button
            type="button"
            className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-blue-600 transition-colors"
            title="Duplicar pregunta"
            onClick={(e) => { e.stopPropagation(); onDuplicate(index); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2h-6a2 2 0 01-2-2v-2m0 0H4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2"></path></svg>
          </button>
          {isRemovable && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(index, question.id); }} // Stop propagation
              className="p-2 bg-white rounded-full shadow-md text-red-500 hover:text-red-700 transition-colors"
              title="Eliminar pregunta"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}


      {/* Si no se ha seleccionado un tipo de pregunta, muestra los botones de selección */}
      {!question.type ? (
        <div className="mb-4">
          <label className="block text-base font-medium text-gray-800 mb-3">Agregar nueva pregunta:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {questionTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(e) => { e.stopPropagation(); handleUpdate("type", option.value); onSelectQuestion(index); }} // Seleccionar y elegir tipo
                className={`
                  flex flex-col items-center justify-center p-3 rounded-md
                  border-2 border-gray-200 bg-white shadow-sm
                  hover:border-purple-400 hover:bg-purple-50 transition-all duration-200
                  min-h-[80px] text-center
                `}
              >
                <span className="text-2xl mb-1">{option.icon}</span>
                <span className="text-xs font-medium text-gray-800">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Si ya se seleccionó un tipo, siempre muestra la vista previa con campos editables en línea
        <>
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-md border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Tipo de pregunta:</span>
            <span className="text-sm font-semibold text-purple-700">
              {questionTypeOptions.find((opt) => opt.value === question.type)?.label || question.type}
            </span>
            {/* Si es una pregunta editable por sus opciones (como Multiple Choice), y no es una sección, muestra el switch de obligatorio */}
            {question.type !== "SECTION" && (
                <label className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
                    <input
                        type="checkbox"
                        checked={question.required || false}
                        onChange={(e) => {e.stopPropagation(); handleUpdate("required", e.target.checked);}}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="select-none">Obligatoria</span>
                    {isRemovable && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(index, question.id); }}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
                        </svg>
                        Eliminar
                      </button>
                    )}
                </label>
            )}
          </div>

          {renderPreviewWithInlineEdit()}

          {isSelected && hasSettings(question.type) && (
            <QuestionSettings question={question} onChange={(validation) => handleUpdate("validation", validation)} />
          )}
        </>
      )}
    </div>
  )
}