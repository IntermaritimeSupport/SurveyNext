// src/components/QuestionManager.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import QuestionItemEditor from "./QuestionItemEditor";
import type { QuestionData } from "./survey-manager"; // Using 'type' for type imports is a good practice

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface QuestionManagerProps {
  surveyId: string;
}

export default function QuestionManager({ surveyId }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  // 1. Add state to keep track of the currently selected question's index
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      setQuestionsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/questions`);
        if (response.ok) {
          const data: QuestionData[] = await response.json();
          const processedData = data.map(q => ({ ...q, type: q.type || "TEXT" }));
          const sortedQuestions = processedData ? processedData.sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
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

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!surveyId) {
      alert("Error: ID de encuesta no disponible para guardar preguntas.");
      return;
    }

    setQuestionsLoading(true);

    try {
      // Antes de enviar, asegúrate de que 'type' no sea null si tu backend lo requiere.
      const questionsToSend = questions.map(q => ({ ...q, type: q.type || "TEXT" }));

      const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: questionsToSend }),
      });

      if (response.ok) {
        const updatedQuestions: QuestionData[] = await response.json();
        const processedUpdatedQuestions = updatedQuestions.map(q => ({ ...q, type: q.type || "TEXT" }));
        setQuestions(processedUpdatedQuestions.sort((a, b) => (a.order || 0) - (b.order || 0)));
        alert("Preguntas guardadas exitosamente.");
        // After saving, you might want to clear the selection or re-select the first one.
        // For now, let's clear it.
        setSelectedQuestionIndex(null);
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

  const addQuestion = useCallback(() => {
    setQuestions((prev) => {
      const newOrder = prev.length > 0 ? Math.max(...prev.map((q) => q?.order || 0)) + 1 : 1;
      const newQuestion: QuestionData = {
        id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: "",
        description: "",
        type: "", // <-- string vacío en vez de null, como lo tienes
        required: false,
        order: newOrder,
        options: null,
        validation: null,
      };
      // When adding a new question, automatically select it
      setSelectedQuestionIndex(prev.length); // Select the last (newly added) question
      return [
        ...prev,
        newQuestion,
      ];
    });
  }, []);

  const removeQuestion = useCallback(async (index: number, questionId?: string) => {
    if (questionId && !questionId.startsWith("new-")) {
      if (window.confirm("¿Estás seguro de que quieres eliminar esta pregunta de forma permanente?")) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Error al eliminar en el servidor.");

          alert("Pregunta eliminada exitosamente.");
          setQuestions((prev) => {
            const updatedQuestions = prev.filter((q) => q.id !== questionId).map((q, i) => ({ ...q, order: i + 1 }));
            // If the removed question was selected, clear selection or select another
            if (selectedQuestionIndex === index) {
              setSelectedQuestionIndex(null);
            } else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) {
              setSelectedQuestionIndex(selectedQuestionIndex - 1); // Adjust index if a previous one was removed
            }
            return updatedQuestions;
          });
        } catch (error) {
          console.error("Error al eliminar pregunta:", error);
          alert("No se pudo eliminar la pregunta. Inténtalo de nuevo.");
        }
      }
    } else {
      setQuestions((prev) => {
        const updatedQuestions = prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 }));
        // If the removed question was selected, clear selection or select another
        if (selectedQuestionIndex === index) {
            setSelectedQuestionIndex(null);
        } else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) {
            setSelectedQuestionIndex(selectedQuestionIndex - 1); // Adjust index if a previous one was removed
        }
        return updatedQuestions;
      });
    }
  }, [selectedQuestionIndex]); // Add selectedQuestionIndex to dependencies


  const updateQuestion = useCallback(
    (index: number, field: keyof QuestionData, value: any) => {
      setQuestions((prev) => {
        let updated = prev.map((q, i) =>
          i === index
            ? {
                ...q,
                [field]: value,
                // Logic for resetting options if question type changes
                ...(field === "type" &&
                  !["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(value as string) && {
                    options: null,
                  }),
                ...(field === "type" &&
                  ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(value as string) &&
                  // Only initialize options if they are null or empty
                  (q.options === null || q.options.length === 0) && {
                    options: [{ label: "", value: "" }],
                  }),
                // Logic for resetting validation if question type changes
                ...(field === "type" &&
                  !["TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE", "URL", "DATE", "TIME", "RANKING", "LIKERT", "FILE_UPLOAD", "NET_PROMOTER_SCORE", "SECTION"].includes(
                    value as string
                  ) && { validation: null }),
              }
            : q
        );

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

  // 2. Define the handler for selecting a question
  const handleSelectQuestion = useCallback((index: number) => {
    setSelectedQuestionIndex(index);
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
          // 3. Pass the new props
          onSelectQuestion={handleSelectQuestion}
          isSelected={index === selectedQuestionIndex}
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