"use client";

import React from "react";

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Opción" },
  { value: "TEXT", label: "Texto corto" },
  { value: "RATING", label: "Calificación" },
  { value: "DATE", label: "Fecha" },
  { value: "SCALE", label: "Clasificación" },
  { value: "LIKERT", label: "Likert" },
  { value: "FILE", label: "Cargar archivo" },
  { value: "NPS", label: "Net Promoter Score®" },
  { value: "SECTION", label: "Sección" },
];

interface QuestionTypeSelectorProps {
  onSelect: (type: string) => void;
}

export default function QuestionTypeSelector({ onSelect }: QuestionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {QUESTION_TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => onSelect(t.value)}
          className="p-4 rounded-lg border border-gray-300 hover:border-blue-500 hover:text-blue-600 transition"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
