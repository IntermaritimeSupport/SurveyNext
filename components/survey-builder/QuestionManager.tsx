// src/components/QuestionManager.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import QuestionItemEditor from "./QuestionItemEditor";
import type { QuestionData } from "./survey-manager"; // Using 'type' for type imports is a good practice
import { useRouter } from "next/navigation";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface QuestionManagerProps {
  surveyId: string;
}

export default function QuestionManager({ surveyId }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const router = useRouter();
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [hasMissingRequiredTitles, setHasMissingRequiredTitles] = useState(false);
  const [generalValidationErrors, setGeneralValidationErrors] = useState<string[]>([]);
  const validateQuestions = useCallback((currentQuestions: QuestionData[]) => {
    const errors: string[] = [];
    let missingRequiredFrontendTitles = false;

    currentQuestions.forEach((q, index) => {
      // 1. Validar el título de preguntas obligatorias (frontend)
      if (q.required && q.type !== "SECTION" && (!q.title || q.title.trim() === "")) {
        missingRequiredFrontendTitles = true;
      }

      // 2. Validar que el tipo de pregunta esté seleccionado (backend podría requerirlo siempre)
      if (!q.type || q.type.trim() === "") {
        errors.push(`La pregunta ${index + 1} no tiene un tipo seleccionado.`);
      }

      // 3. Validar que el título tenga contenido (backend podría requerirlo siempre, incluso si no es 'required' por el frontend)
      // Excepto para secciones, si tu backend las trata diferente
      if (q.type !== "SECTION" && (!q.title || q.title.trim() === "")) {
         errors.push(`La pregunta ${index + 1} requiere un título.`);
      }
      // Para secciones, si tu backend requiere un título (que no sea para guardar)
      if (q.type === "SECTION" && (!q.title || q.title.trim() === "")) {
         // Puedes decidir si una sección con título vacío es un error aquí o no
         // Por ahora, lo dejaré solo para preguntas normales, ya que el mensaje de error de la imagen
         // apunta más a `title` general y `type`.
      }


      // 4. Validar que el orden exista y sea un número (backend lo requiere)
      if (q.order === undefined || q.order === null) {
        errors.push(`La pregunta ${index + 1} no tiene un orden definido.`);
      }
    });

    setHasMissingRequiredTitles(missingRequiredFrontendTitles);
    setGeneralValidationErrors(errors);

    return errors.length === 0 && !missingRequiredFrontendTitles; // Retorna true si todo es válido
  }, []);

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
    if (!validateQuestions(questions)) {
      if (hasMissingRequiredTitles) {
        alert("Por favor, completa los títulos de todas las preguntas marcadas como obligatorias.");
      } else if (generalValidationErrors.length > 0) {
        alert("Por favor, corrige los siguientes errores antes de guardar:\n" + generalValidationErrors.join("\n"));
      }
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
        const sortedUpdatedQuestions = processedUpdatedQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
        setQuestions(sortedUpdatedQuestions);
        setSelectedQuestionIndex(null);
        validateQuestions(sortedUpdatedQuestions);
        alert("Preguntas guardadas exitosamente.");
        window.location.reload();
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
        type: "",
        required: false,
        order: newOrder,
        options: null,
        validation: null,
      };
      const updatedQuestions = [...prev, newQuestion];
      setSelectedQuestionIndex(updatedQuestions.length - 1); // Seleccionar la última (recién añadida) pregunta
      validateQuestions(updatedQuestions); // Validar al añadir
      return updatedQuestions;
    });
  }, [validateQuestions]);

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
            if (selectedQuestionIndex === index) {
              setSelectedQuestionIndex(null);
            } else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) {
              setSelectedQuestionIndex(selectedQuestionIndex - 1);
            }
            validateQuestions(updatedQuestions); // Validar al eliminar
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
        if (selectedQuestionIndex === index) {
            setSelectedQuestionIndex(null);
        } else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) {
            setSelectedQuestionIndex(selectedQuestionIndex - 1);
        }
        validateQuestions(updatedQuestions); // Validar al eliminar
        return updatedQuestions;
      });
    }
  }, [selectedQuestionIndex, validateQuestions]);


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
                  ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"].includes(value as string) &&
                  (q.options === null || q.options.length === 0) && {
                    options: [{ label: "", value: "" }],
                  }),
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

        validateQuestions(updated); // Validar al actualizar
        return updated;
      });
    },
    [validateQuestions] // Añade validateQuestions a las dependencias
  );

  // 2. Define the handler for selecting a question
  const handleSelectQuestion = useCallback((index: number) => {
    setSelectedQuestionIndex(index);
  }, []);


  const isSaveButtonDisabled = questionsLoading || hasMissingRequiredTitles || generalValidationErrors.length > 0;

  return (
    <form onSubmit={handleQuestionsSubmit} className="space-y-6">
      {questions.length === 0 && (
        <p className="text-gray-600 text-center py-4">
          Aún no hay preguntas para esta encuesta. ¡Añade la primera!
        </p>
      )}
      {hasMissingRequiredTitles && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          ⚠️ Por favor, completa los títulos de todas las preguntas marcadas como obligatorias para poder guardar.
        </div>
      )}
      {generalValidationErrors.length > 0 && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          <p className="font-semibold mb-1">Se encontraron los siguientes problemas:</p>
          <ul className="list-disc pl-5">
            {generalValidationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
          <p className="mt-2">Por favor, corrige estos errores para poder guardar las preguntas.</p>
        </div>
      )}

      {questions.map((question, index) => (
        <QuestionItemEditor
          key={question.id || `new-${index}`}
          question={question}
          index={index}
          onUpdate={updateQuestion}
          onRemove={removeQuestion}
          isRemovable={questions.length > 0}
          onSelectQuestion={handleSelectQuestion}
          isSelected={index === selectedQuestionIndex}
          // Pasa el estado de validación al QuestionItemEditor
          isTitleMissingAndRequired={question.required && question.type !== "SECTION" && (!question.title || question.title.trim() === "")}
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
          className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${isSaveButtonDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          disabled={isSaveButtonDisabled}
        >
          Guardar Preguntas
        </button>
      </div>
    </form>
  );
}