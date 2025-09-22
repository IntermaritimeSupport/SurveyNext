"use client"

import React, { useCallback } from "react";
import { QuestionData } from "./survey-manager";

interface QuestionItemEditorProps {
  question: QuestionData;
  index: number;
  onUpdate: (index: number, field: keyof QuestionData, value: any) => void;
  onRemove: (index: number, questionId?: string) => void;
  isRemovable: boolean;
}

export default function QuestionItemEditor({
  question,
  index,
  onUpdate,
  onRemove,
  isRemovable,
}: QuestionItemEditorProps) {

  const handleUpdate = useCallback((field: keyof QuestionData, value: any) => {
    onUpdate(index, field, value);
  }, [index, onUpdate]);

  const handleUpdateOption = useCallback((optIndex: number, value: string) => {
    const updatedOptions = question.options
      ? question.options.map((opt, oI) => (oI === optIndex ? { ...opt, label: value, value } : opt))
      : [{ label: value, value }];
    handleUpdate("options", updatedOptions);
  }, [question.options, handleUpdate]);

  const handleAddOption = useCallback(() => {
    const updatedOptions = question.options
      ? [...question.options, { label: "", value: "" }]
      : [{ label: "", value: "" }];
    handleUpdate("options", updatedOptions);
  }, [question.options, handleUpdate]);

  const handleRemoveOption = useCallback((optIndex: number) => {
    const updatedOptions = question.options ? question.options.filter((_, oI) => oI !== optIndex) : null;
    handleUpdate("options", updatedOptions);
  }, [question.options, handleUpdate]);

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-800">Pregunta {index + 1}</h3>
        {isRemovable && (
          <button
            type="button"
            onClick={() => onRemove(index, question.id)}
            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
            </svg>
            Eliminar
          </button>
        )}
      </div>

      <div>
        <input
          type="text"
          required
          placeholder="Título de la pregunta *"
          value={question.title}
          onChange={(e) => handleUpdate("title", e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <textarea
          rows={2}
          placeholder="Descripción (opcional)"
          value={question.description}
          onChange={(e) => handleUpdate("description", e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <select
          value={question.type}
          onChange={(e) => handleUpdate("type", e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="TEXT">📝 Texto corto</option>
          <option value="TEXTAREA">📄 Texto largo</option>
          <option value="NUMBER">🔢 Número</option>
          <option value="EMAIL">📧 Email</option>
          <option value="PHONE">📞 Teléfono</option>
          <option value="URL">🔗 URL</option>
          <option value="DATE">📅 Fecha</option>
          <option value="TIME">⏰ Hora</option>
          <option value="MULTIPLE_CHOICE">🗳️ Opción múltiple</option>
          <option value="CHECKBOXES">☑️ Casillas de verificación</option>
          <option value="DROPDOWN">⬇️ Lista desplegable</option>
          <option value="SCALE">📊 Escala (1-10)</option>
          <option value="RATING">⭐ Calificación (1-5)</option>
        </select>
      </div>

      <div>
        <input
          type="number"
          value={question.order}
          onChange={(e) => handleUpdate("order", parseInt(e.target.value))}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Orden de la pregunta"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={question.required}
          onChange={(e) => handleUpdate("required", e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        Obligatoria
      </label>

      {["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(question.type) && (
        <div className="space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700">Opciones</h4>
          {question.options && question.options.map((option, optIndex) => (
            <div key={optIndex} className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder={`Opción ${optIndex + 1}`}
                value={option.label}
                onChange={(e) => handleUpdateOption(optIndex, e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleRemoveOption(optIndex)}
                className="text-red-500 hover:text-red-700 text-sm px-2"
                title="Eliminar opción"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddOption}
            className="w-full py-1.5 px-2 border border-dashed border-gray-300 rounded-md text-blue-600 hover:border-blue-400 hover:text-blue-700 text-sm"
          >
            + Añadir opción
          </button>
        </div>
      )}
    </div>
  );
}
