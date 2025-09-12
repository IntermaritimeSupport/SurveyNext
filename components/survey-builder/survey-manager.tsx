"use client"

import { useAuth } from "@/contexts/auth-context";
import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation";
import QuestionManager from "./QuestionManager";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface QuestionOption {
  label: string;
  value: string;
}
// Define interfaces para la estructura de datos que esperamos
export interface QuestionData {
  id?: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  order: number;
  options: QuestionOption[] | null; // Correcto: array de strings o null
  validation?: Record<string, any> | null; // Correcto: objeto o null
}

export interface SurveyData {
  id?: string;
  title: string;
  description: string;
  customLink: string;
  isAnonymous: boolean;
  showProgress: boolean;
  allowMultipleResponses: boolean;
  startDate: string;
  endDate: string;
  isPublished: boolean; // Ahora es un booleano directamente en el cliente
  questions?: QuestionData[];
}

export default function SurveyManager() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  // Extraemos el surveyId de los parámetros de la URL
  // 'id' es el nombre del parámetro en la ruta dinámica (ej. /surveys/[id])
  const routeSurveyId = typeof params.id === 'string' ? params.id : undefined;

  // currentSurveyId será el ID real o 'undefined' si es una nueva encuesta ('new')
  const [currentSurveyId, setCurrentSurveyId] = useState<string | undefined>(
    routeSurveyId === 'new' ? undefined : routeSurveyId
  );

  const [surveyData, setSurveyData] = useState<SurveyData>({
    title: "",
    description: "",
    customLink: "",
    isAnonymous: false,
    showProgress: true,
    allowMultipleResponses: false,
    startDate: "",
    endDate: "",
    isPublished: false, // Por defecto como borrador
  });

  const [surveyLoading, setSurveyLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"survey" | "questions">("survey");

  // Removido handleTogglePublish, su lógica ahora se integra en handleSurveySubmit
  // y la actualización del estado local del checkbox.

  useEffect(() => {
    async function fetchSurveyData() {
      if (currentSurveyId) { // Solo intenta cargar si currentSurveyId tiene un valor real (no es undefined o 'new')
        setSurveyLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/surveys/${currentSurveyId}`);
          if (response.ok) {
            const data: SurveyData & { status: string } = await response.json(); // La API devuelve 'status', lo mapeamos a 'isPublished'
            setSurveyData({
              ...data,
              // Mapeamos el enum 'status' de Prisma (DRAFT/PUBLISHED) a nuestro booleano 'isPublished'
              isPublished: data.status === "PUBLISHED",
              startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
              endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
            });
            // No es necesario actualizar setCurrentSurveyId aquí, ya está inicializado desde la URL
          } else {
            console.error("Error al cargar la encuesta:", response.statusText);
            alert("Error al cargar la encuesta.");
            router.push('/admin/surveys');
          }
        } catch (error) {
          console.error("Error al cargar la encuesta:", error);
          alert("Error de red al cargar la encuesta.");
          router.push('/admin/surveys');
        } finally {
          setSurveyLoading(false);
        }
      } else {
        // Si currentSurveyId es undefined (modo creación), terminamos la carga inmediatamente.
        setSurveyLoading(false);
      }
    }
    fetchSurveyData();
    // Las dependencias son currentSurveyId y router.
    // surveyData no debe ser dependencia para evitar bucles infinitos.
  }, [currentSurveyId, router]);

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userId = user?.id;
    if (!userId) {
      alert("Error: No se pudo obtener el ID del usuario. Por favor, asegúrate de haber iniciado sesión.");
      return;
    }

    setSurveyLoading(true);

    try {
      const method = currentSurveyId ? "PUT" : "POST";
      const url = currentSurveyId ? `${API_BASE_URL}/api/surveys/${currentSurveyId}` : `${API_BASE_URL}/api/surveys`;

      // Preparamos los datos a enviar
      const dataToSend = {
        ...surveyData,
        // ✅ EXCLUIMOS el campo 'status' directamente del spread de surveyData
        // para asegurarnos de que solo 'isPublished' controle el estado.
        // Si SurveyData tiene una propiedad 'status', la sobrescribimos o la eliminamos.
        status: undefined, // Aseguramos que no se envíe un 'status' obsoleto
        userId: userId,
        startDate: surveyData.startDate || null,
        endDate: surveyData.endDate || null,
        isPublished: surveyData.isPublished // ✅ Enviamos el valor actual del checkbox
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend), // Usamos dataToSend
      });

      if (response.ok) {
        const result = await response.json();
        if (!currentSurveyId) {
          setCurrentSurveyId(result.id);
          router.push(`/admin/surveys/${result.id}/edit`);
        }
        // Actualizamos el estado isPublished de surveyData con la respuesta del servidor (status)
        setSurveyData(prev => ({
          ...prev,
          isPublished: result.status === "PUBLISHED"
        }));
        alert(`Encuesta ${currentSurveyId ? 'actualizada' : 'creada'} exitosamente.`);
        setActiveTab("questions");
      } else {
        const error = await response.json();
        alert(error.message || `Error al ${currentSurveyId ? 'actualizar' : 'crear'} la encuesta`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`Error de red al ${currentSurveyId ? 'actualizar' : 'crear'} la encuesta`);
    } finally {
      setSurveyLoading(false);
    }
  };

  if (authLoading || surveyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-red-600">Debes iniciar sesión para gestionar encuestas.</p>
      </div>
    );
  }
  // Función para generar un slug
  const generateCustomLink = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")        // espacios -> guiones
      .replace(/[^a-z0-9-]/g, "")  // solo letras/números/-
      .replace(/^-+|-+$/g, "");    // quita guiones al inicio/fin
  };


  // Bandera para determinar si estamos creando una nueva encuesta
  const isCreatingNewSurvey = currentSurveyId === undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {isCreatingNewSurvey ? "Crear Nueva Encuesta" : "Editar Encuesta"}
          </h1>

          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab("survey")}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === "survey"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Configuración de la Encuesta
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === "questions"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                disabled={isCreatingNewSurvey} // Deshabilita si estamos creando una nueva encuesta
                title={isCreatingNewSurvey ? "Primero debes guardar la configuración de la encuesta." : ""}
              >
                Preguntas de la Encuesta
              </button>
            </nav>
          </div>

          {activeTab === "survey" && (
            <form onSubmit={handleSurveySubmit} className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Información de la Encuesta</h2>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Título de la Encuesta *
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    placeholder="Ej: Encuesta de Satisfacción del Cliente"
                    value={surveyData.title}
                    onChange={(e) => setSurveyData({ ...surveyData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Describe el propósito de tu encuesta..."
                    value={surveyData.description}
                    onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-700">
                    Estado: {surveyData.isPublished ? "Publicada" : "Borrador"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={surveyData.isPublished}
                      onChange={(e) => setSurveyData({ ...surveyData, isPublished: e.target.checked })} // ✅ Directamente al estado
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Enlace Personalizado</h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (!surveyData.title.trim()) {
                        alert("Primero escribe un título para generar el enlace");
                        return;
                      }
                      setSurveyData({
                        ...surveyData,
                        customLink: generateCustomLink(surveyData.title),
                      });
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    🔄 Generar
                  </button>

                </div>

                <div>
                  <label htmlFor="customLink" className="block text-sm font-medium text-gray-700 mb-1">
                    Enlace de la Encuesta
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      /survey/
                    </span>
                    <input
                      type="text"
                      id="customLink"
                      required
                      placeholder="mi-encuesta-personalizada"
                      value={surveyData.customLink}
                      onChange={(e) => setSurveyData({ ...surveyData, customLink: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {surveyData.customLink.trim() === '' && <p className="text-red-600 text-sm mt-1">El enlace es requerido</p>}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 mt-0.5">ℹ️</div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-2">Consejos para enlaces:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Solo letras minúsculas, números y guiones</li>
                        <li>• Entre 3 y 50 caracteres</li>
                        <li>• No puede empezar o terminar con guión</li>
                        <li>• Debe ser único en todo el sistema</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={surveyData.isAnonymous}
                      onChange={(e) => setSurveyData({ ...surveyData, isAnonymous: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Permitir respuestas anónimas</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={surveyData.showProgress}
                      onChange={(e) => setSurveyData({ ...surveyData, showProgress: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Mostrar barra de progreso</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={surveyData.allowMultipleResponses}
                      onChange={(e) => setSurveyData({ ...surveyData, allowMultipleResponses: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Permitir múltiples respuestas por usuario</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={surveyData.startDate}
                      onChange={(e) => setSurveyData({ ...surveyData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de fin
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={surveyData.endDate}
                      onChange={(e) => setSurveyData({ ...surveyData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/admin/surveys')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={surveyLoading}
                >
                  {isCreatingNewSurvey ? "Crear Encuesta y Continuar" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "questions" && currentSurveyId && (
            <QuestionManager surveyId={currentSurveyId} />
          )}
          {activeTab === "questions" && !currentSurveyId && (
            <div className="text-center py-8 text-gray-600">
              Por favor, guarda la configuración de la encuesta primero para poder añadir preguntas.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}