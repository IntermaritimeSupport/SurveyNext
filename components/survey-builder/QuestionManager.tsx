"use client"

import React, { useState, useEffect, useCallback } from "react";
import QuestionItemEditor from "./QuestionItemEditor"; // Importa el componente para editar una pregunta individual
import { QuestionData } from "./survey-manager";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface QuestionManagerProps {
  surveyId: string; // El ID de la encuesta a la que pertenecen estas preguntas
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
          const data: QuestionData[] = await response.json(); // Prisma ya devuelve JSON parseado
          const sortedQuestions = data ? data.sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
          setQuestions(sortedQuestions.length > 0 ? sortedQuestions : []);
        } else {
          console.error("Error al cargar las preguntas:", response.statusText);
          alert("Error al cargar las preguntas.");
          setQuestions([]); // Limpiar en caso de error
        }
      } catch (error) {
        console.error("Error al cargar las preguntas:", error);
        alert("Error de red al cargar las preguntas.");
        setQuestions([]); // Limpiar en caso de error
      } finally {
        setQuestionsLoading(false);
      }
    }
    if (surveyId) {
      fetchQuestions();
    } else {
      setQuestionsLoading(false); // No hay surveyId, no hay preguntas que cargar
      setQuestions([]);
    }
  }, [surveyId]);

  // Manejar el envío del formulario de preguntas (crear/actualizar en lote)
  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!surveyId) {
      alert("Error: ID de encuesta no disponible para guardar preguntas.");
      return;
    }

    setQuestionsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/questions`, {
        method: "POST", // Usamos POST para enviar un batch de preguntas para sincronizar
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions }), // Prisma lo gestiona como Json, no necesitamos stringify aquí
      });

      if (response.ok) {
        const updatedQuestions: QuestionData[] = await response.json(); // Prisma ya devuelve JSON parseado
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

  // Función para añadir una nueva pregunta al estado local
  const addQuestion = useCallback(() => {
    setQuestions((prevQuestions) => {
      const newOrder = prevQuestions.length > 0 ? Math.max(...prevQuestions.map(q => q.order || 0)) + 1 : 0;
      return [
        ...prevQuestions,
        {
          title: "",
          description: "",
          type: "TEXT", // Asegúrate de que este sea un valor válido de QuestionType
          required: false,
          order: newOrder,
          options: null,
          validation: null,
        },
      ];
    });
  }, []);

  // Función para eliminar una pregunta (localmente y en el servidor si tiene ID)
  const removeQuestion = useCallback(async (index: number, questionId?: string) => {
    if (questionId && window.confirm("¿Estás seguro de que quieres eliminar esta pregunta? Esta acción es irreversible.")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Error al eliminar la pregunta en el servidor.");
        }
        alert("Pregunta eliminada exitosamente.");
        setQuestions((prevQuestions) => prevQuestions.filter((_, i) => i !== index));
      } catch (error) {
        console.error("Error al eliminar pregunta:", error);
        alert("No se pudo eliminar la pregunta. Inténtalo de nuevo.");
      }
    } else if (!questionId) {
      setQuestions((prevQuestions) => prevQuestions.filter((_, i) => i !== index));
    }
  }, []);

  // Función para actualizar un campo específico de una pregunta (pasada a QuestionItemEditor)
  // Función para actualizar un campo específico de una pregunta (pasada a QuestionItemEditor)
  const updateQuestion = useCallback((index: number, field: keyof QuestionData, value: any) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q, i) =>
        i === index
          ? {
            ...q,
            [field]: value,
            // Si el tipo no es de opciones, borramos options
            ...(field === "type" && !["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(value as string) && { options: null }),
            // Si el tipo es de opciones, inicializamos con [{label, value}]
            ...(field === "type" && ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(value as string) && {
              options: q.options && q.options.length > 0 ? q.options : [{ label: "", value: "" }]
            }),
            // Limpiar validación si el tipo no aplica
            ...(field === "type" && !["TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE", "URL", "DATE", "TIME"].includes(value as string) && { validation: null }),
          }
          : q
      ).sort((a, b) => (a.order || 0) - (b.order || 0))
    );
  }, []);


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
  )
}