import { QuestionType as PrismaQuestionType } from '@prisma/client';

// src/types/survey.ts
// ...
export type QuestionValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  minDate?: string; // <-- Agregado para fechas
  maxDate?: string; // <-- Agregado para fechas
  [key: string]: any;
} | null;

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  order: number; // Order es un campo que puede ser útil para ordenar opciones
}

export interface Question {
  id: string;
  surveyId: string;
  title: string;
  description: string | null;
  type: PrismaQuestionType; // ¡Utiliza el enum de Prisma directamente!
  required: boolean;
  order: number;
  options: QuestionOption[] | null; // Importante: Json? se mapea a T | null
  validation: QuestionValidation;   // Utiliza el tipo definido arriba
  // Si tu modelo Prisma.Question tiene createdAt/updatedAt, inclúyelos también
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Survey {
  id: string
  title: string
  description: string
  customLink: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  questions: Question[]
  responses: SurveyResponse[]
  settings: SurveySettings
}

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "rating"
  | "scale"
  | "date"
  | "email"
  | "number"

export interface QuestionOption {
  id: string
  label: string
  value: string
  order: number
}

export interface SurveyResponse {
  id: string
  surveyId: string
  respondentId?: string
  answers: Answer[]
  submittedAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface Answer {
  questionId: string
  value: string | string[] | number
  textValue?: string
}

export interface SurveySettings {
  allowAnonymous: boolean
  requireEmail: boolean
  showProgressBar: boolean
  allowMultipleSubmissions: boolean
  customTheme?: CustomTheme
  languages: string[]
  defaultLanguage: string
}

export interface CustomTheme {
  primaryColor: string
  backgroundColor: string
  textColor: string
  fontFamily: string
}

export interface SurveyStats {
  totalResponses: number
  completionRate: number
  averageTime: number
  lastResponse?: Date
}

// ... en SurveyManager.tsx
export interface QuestionData {
  id?: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  order: number;
  options: string[] | null; // <-- Esto es correcto. Puede ser un array de strings o null.
  validation?: string | null;
}

// ...
// Cuando añades una nueva pregunta:
// {
//   title: "",
//   description: "",
//   type: "TEXT",
//   required: false,
//   order: newOrder,
//   options: null, // <-- Inicialización con null es compatible con string[] | null
// },