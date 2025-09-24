"use client";

import { QuestionData } from "@/types/survey";
import React, { useCallback } from "react";

// Puedes definir tus iconos o usar librerías como Heroicons o Lucide React
// Para este ejemplo, usaré caracteres simples como iconos.

interface QuestionItemEditorProps {
  question: QuestionData;
  index: number;
  onUpdate: (index: number, field: keyof QuestionData, value: any) => void;
    onRemove: (index: number, questionId?: string) => void;
  isRemovable: boolean;
}

// Define las opciones de tipo de pregunta con sus iconos
const questionTypeOptions = [
  { value: "MULTIPLE_CHOICE", label: "Opción", icon: "●" },
  { value: "TEXT", label: "Texto", icon: "T" },
  { value: "RATING", label: "Calificación", icon: "👍" },
  { value: "DATE", label: "Fecha", icon: "📅" },
  { value: "RANKING", label: "Clasificación", icon: "⇅" }, // Representa el icono de doble flecha
  { value: "LIKERT", label: "Likert", icon: "▦" }, // Icono para Likert
  { value: "FILE_UPLOAD", label: "Cargar archivo", icon: "⤒" }, // Icono para cargar archivo
  { value: "NET_PROMOTER_SCORE", label: "Net Promoter Score®", icon: "‽" }, // Icono para NPS
  { value: "SECTION", label: "Sección", icon: "🗐" }, // Icono para sección
];

export default function QuestionItemEditor({
  question,
  index,
  onUpdate,
  onRemove,
  isRemovable,
}: QuestionItemEditorProps) {
  const handleUpdate = useCallback(
    (field: keyof QuestionData, value: any) => {
      onUpdate(index, field, value);
    },
    [index, onUpdate]
  );

  const handleUpdateOption = useCallback(
    (optIndex: number, value: string) => {
      const updatedOptions = question.options
        ? question.options.map((opt, oI) => (oI === optIndex ? value : opt))
        : [value];
      handleUpdate("options", updatedOptions);
    },
    [question.options, handleUpdate]
  );

  const handleAddOption = useCallback(() => {
    const updatedOptions = question.options
      ? [...question.options, ""]
      : [""];
    handleUpdate("options", updatedOptions);
  }, [question.options, handleUpdate]);

  const handleRemoveOption = useCallback(
    (optIndex: number) => {
      const updatedOptions = question.options
        ? question.options.filter((_, oI) => oI !== optIndex)
        : null;
      handleUpdate("options", updatedOptions);
    },
    [question.options, handleUpdate]
  );

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Pregunta {index + 1}
        </h3>
        {isRemovable && (
          <button
            type="button"
            onClick={() => onRemove(index, question.id)}
            className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* Paso 1: Selección de tipo con el nuevo diseño */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de pregunta
        </label>
        <div className="grid grid-cols-3 gap-3"> {/* Grid para organizar los botones */}
          {questionTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleUpdate("type", option.value)}
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg
                border-2 transition-all duration-200
                ${
                  question.type === option.value
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                }
              `}
            >
              <span className="text-2xl mb-1">{option.icon}</span> {/* Icono */}
              <span className="text-sm font-medium text-gray-800">{option.label}</span> {/* Texto */}
            </button>
          ))}
        </div>
      </div>

      {/* Paso 2: Solo mostrar los demás campos si ya se eligió un tipo */}
      {question.type && (
        <>
          {/* ... el resto de tu código para título, descripción, orden, obligatorio y opciones dinámicas ... */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título de la pregunta *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: ¿Cuál es tu opinión sobre el producto?"
              value={question?.title || ""}
              onChange={(e) => handleUpdate("title", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Añade más detalles o contexto para la pregunta..."
              value={question?.description || ""}
              onChange={(e) => handleUpdate("description", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor={`question-order-${question.id || index}`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Orden de la pregunta
            </label>
            <input
              type="number"
              id={`question-order-${question.id || index}`}
              value={question.order || 0}
              onChange={(e) =>
                handleUpdate("order", parseInt(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={question.required || false}
              onChange={(e) => handleUpdate("required", e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Pregunta obligatoria
            </span>
          </label>

          {/* Opciones dinámicas si aplica */}
          {["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(
            question.type
          ) && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-md border border-gray-200">
              <h4 className="text-md font-medium text-gray-800">Opciones:</h4>
              {question.options &&
                question.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center space-x-2">
                    <input
                      type="text"
                      required
                      placeholder={`Opción ${optIndex + 1}`}
                      value={option}
                      onChange={(e) =>
                        handleUpdateOption(optIndex, e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(optIndex)}
                      className="p-2 text-red-600 hover:text-red-800 rounded-md"
                      title="Eliminar opción"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-blue-600 hover:border-blue-400 hover:text-blue-700 mt-2"
              >
                + Añadir Opción
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}