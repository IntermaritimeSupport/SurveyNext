"use client";

import React, { useState, useEffect, useCallback } from "react";
import QuestionItemEditor from "./QuestionItemEditor"; 
import { QuestionData } from "./survey-manager";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface QuestionManagerProps {
  surveyId: string;
}

export default function QuestionManager({ surveyId }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Cargar preguntas existentes para la encuesta
  useEffect(() => {
    async function fetchQuestions() {
      setQuestionsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/questions`);
        if (response.ok) {
          const data: QuestionData[] = await response.json();
          const sortedQuestions = data ? data.sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
          setQuestions(sortedQuestions);
        } else {
          console.error("Error al cargar las preguntas:", response.statusText);
          alert("Error al cargar las preguntas.");
          setQuestions([]);
        }
      } catch (error) {
        console.error("Error al cargar las preguntas:", error);
        alert("Error de red al cargar las preguntas.");
        setQuestions([]);
      } finally {
        setQuestionsLoading(false);
      }
    }

    if (surveyId) {
      fetchQuestions();
    } else {
      setQuestionsLoading(false);
      setQuestions([]);
    }
  }, [surveyId]);

  // Guardar preguntas
  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!surveyId) {
      alert("Error: ID de encuesta no disponible para guardar preguntas.");
      return;
    }

    setQuestionsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });

      if (response.ok) {
        const updatedQuestions: QuestionData[] = await response.json();
        setQuestions(updatedQuestions.sort((a, b) => (a.order || 0) - (b.order || 0)));
        alert("Preguntas guardadas exitosamente.");
      } else {
        const error = await response.json();
        alert(error.message || "Error al guardar las preguntas.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de red al guardar las preguntas.");
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Agregar nueva pregunta
  const addQuestion = useCallback(() => {
    setQuestions((prev) => {
      const newOrder = prev.length > 0 ? Math.max(...prev.map((q) => q?.order || 0)) + 1 : 1;
      return [
        ...prev,
        {
          title: "",
          description: "",
          type: "TEXT",
          required: false,
          order: newOrder,
          options: null,
          validation: null,
        },
      ];
    });
  }, []);

  // Eliminar pregunta
  const removeQuestion = useCallback(async (index: number, questionId?: string) => {
    if (questionId && window.confirm("¿Estás seguro de que quieres eliminar esta pregunta?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Error al eliminar en el servidor.");

        alert("Pregunta eliminada exitosamente.");
        setQuestions((prev) =>
          prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 }))
        );
      } catch (error) {
        console.error("Error al eliminar pregunta:", error);
        alert("No se pudo eliminar la pregunta. Inténtalo de nuevo.");
      }
    } else if (!questionId) {
      setQuestions((prev) =>
        prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 }))
      );
    }
  }, []);

  // Actualizar pregunta
  const updateQuestion = useCallback(
    (index: number, field: keyof QuestionData, value: any) => {
      setQuestions((prev) => {
        let updated = prev.map((q, i) =>
          i === index
            ? {
                ...q,
                [field]: value,
                ...(field === "type" &&
                  !["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(value as string) && {
                    options: null,
                  }),
                ...(field === "type" &&
                  ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(value as string) && {
                    options: q.options && q.options.length > 0 ? q.options : [{ label: "", value: "" }],
                  }),
                ...(field === "type" &&
                  !["TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE", "URL", "DATE", "TIME"].includes(
                    value as string
                  ) && { validation: null }),
              }
            : q
        );

        // ✅ Si se actualiza "order", normalizamos
        if (field === "order") {
          updated = updated
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((q, i) => ({ ...q, order: i + 1 }));
        }

        return updated;
      });
    },
    []
  );

  if (questionsLoading) {
    return <div className="text-center py-8 text-gray-600">Cargando preguntas...</div>;
  }

  return (
    <form onSubmit={handleQuestionsSubmit} className="space-y-6">
      {questions.length === 0 && (
        <p className="text-gray-600 text-center py-4">
          Aún no hay preguntas para esta encuesta. ¡Añade la primera!
        </p>
      )}

      {questions.map((question, index) => (
        <QuestionItemEditor
          key={question.id || `new-${index}`}
          question={question}
          index={index}
          onUpdate={updateQuestion}
          onRemove={removeQuestion}
          isRemovable={questions.length > 0}
        />
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700"
      >
        + Añadir otra pregunta
      </button>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={questionsLoading}
        >
          Guardar Preguntas
        </button>
      </div>
    </form>
  );
}
