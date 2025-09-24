// src/types/survey-manager.ts (o donde quieras definirlo)

export interface QuestionOption {
  label: string;
  value: string;
}

export interface QuestionData {
  id: string;
  title: string;
  description: string;
  // 'type' puede ser string (cuando está seleccionado) o null (cuando no se ha seleccionado aún)
  type: string | null;
  options: QuestionOption[] | null; // null si no aplica (ej. preguntas de texto)
  required: boolean;
  order: number;
}