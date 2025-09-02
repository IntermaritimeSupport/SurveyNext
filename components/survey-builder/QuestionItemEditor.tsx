"use client"

import React, { useCallback } from "react";
import { QuestionData } from "./survey-manager";

interface QuestionItemEditorProps {
  question: QuestionData;
  index: number;
  onUpdate: (index: number, field: keyof QuestionData, value: any) => void;
  onRemove: (index: number, questionId?: string) => void;
  isRemovable: boolean; // Para controlar cuándo se puede eliminar
}

export default function QuestionItemEditor({
  question,
  index,
  onUpdate,
  onRemove,
  isRemovable,
}: QuestionItemEditorProps) {

  // Funciones auxiliares para actualizar campos y opciones
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
    <div className="border border-gray-200 rounded-lg p-4 space-y-4 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Pregunta {index + 1}</h3>
        {isRemovable && (
          <button
            type="button"
            onClick={() => onRemove(index, question.id)}
            className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
            </svg>
            Eliminar
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título de la pregunta *</label>
        <input
          type="text"
          required
          placeholder="Ej: ¿Cuál es tu opinión sobre el producto?"
          value={question.title}
          onChange={(e) => handleUpdate("title", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
        <textarea
          rows={2}
          placeholder="Añade más detalles o contexto para la pregunta..."
          value={question.description}
          onChange={(e) => handleUpdate("description", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de pregunta</label>
        <select
          value={question.type}
          onChange={(e) => handleUpdate("type", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="TEXT">Texto corto</option>
          <option value="TEXTAREA">Texto largo</option>
          <option value="NUMBER">Número</option>
          <option value="EMAIL">Email</option>
          <option value="PHONE">Teléfono</option>
          <option value="URL">URL</option> {/* Asegúrate de que este tipo existe en tu enum */}
          <option value="DATE">Fecha</option>
          <option value="TIME">Hora</option> {/* Asegúrate de que este tipo existe en tu enum */}
          <option value="MULTIPLE_CHOICE">Opción múltiple</option>
          <option value="CHECKBOXES">Casillas de verificación</option>
          <option value="DROPDOWN">Lista desplegable</option>
          <option value="SCALE">Escala</option>
          <option value="RATING">Calificación</option>
        </select>
      </div>

      {/* Campo para ordenar la pregunta */}
      <div>
        <label htmlFor={`question-order-${question.id || index}`} className="block text-sm font-medium text-gray-700 mb-1">
          Orden de la pregunta
        </label>
        <input
          type="number"
          id={`question-order-${question.id || index}`}
          value={question.order}
          onChange={(e) => handleUpdate("order", parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <label className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={question.required}
          onChange={(e) => handleUpdate("required", e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">Pregunta obligatoria</span>
      </label>

      {/* Opciones para preguntas de selección */}
      {["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(question.type) && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-md border border-gray-200">
          <h4 className="text-md font-medium text-gray-800">Opciones:</h4>
          {question.options && question.options.map((option, optIndex) => (
            <div key={optIndex} className="flex items-center space-x-2">
              <input
                type="text"
                required
                placeholder={`Opción ${optIndex + 1}`}
                value={option.label}
                onChange={(e) => handleUpdateOption(optIndex, e.target.value)}
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
    </div>
  );
}