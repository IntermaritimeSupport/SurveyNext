"use client"

import { useAuth } from "@/contexts/auth-context";
import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation";
import QuestionManager from "./QuestionManager";
import Loader from "../loaders/loader";
import { Pencil, Settings } from "lucide-react";
import InlineEditable from "../boton/inline-editable";
import Imagenes from "@/lib/images";
import { toast } from "../ui/use-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface QuestionData {
  id?: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  order: number;
  options: QuestionOption[] | null;
  validation?: Record<string, any> | null;
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
  isPublished: boolean;
  questions?: QuestionData[];
}

export default function SurveyManager() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const routeSurveyId = typeof params.id === 'string' ? params.id : undefined;

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
    isPublished: false,
  });

  const [surveyLoading, setSurveyLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"survey" | "questions">("survey");

  useEffect(() => {
    async function fetchSurveyData() {
      if (currentSurveyId) {
        setSurveyLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/surveys/${currentSurveyId}`);
          if (response.ok) {
            const data: SurveyData & { status: string } = await response.json();
            setSurveyData({
              ...data,
              isPublished: data.status === "PUBLISHED",
              startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
              endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
            });

          } else {
            console.error("Error al cargar la encuesta:", response.statusText);
            toast({
              title: "Error",
              description: "Error al cargar la encuesta.",
              duration: 5000,
              variant: "destructive",
            });
            router.push('/admin/surveys');
          }
        } catch (error) {
          console.error("Error al cargar la encuesta:", error);
          toast({
            title: "Error",
            description: "Error de red al cargar la encuesta.",
            duration: 5000,
            variant: "destructive",
          });
          router.push('/admin/surveys');
        } finally {
          setSurveyLoading(false);
        }
      } else {
        setSurveyLoading(false);
      }
    }
    fetchSurveyData();
  }, [currentSurveyId, router]);

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userId = user?.id;
    if (!userId) {
      alert("Error: No se pudo obtener el ID del usuario.");
      return;
    }

    setSurveyLoading(true);

    try {
      const method = currentSurveyId ? "PUT" : "POST";
      const url = currentSurveyId ? `${API_BASE_URL}/api/surveys/${currentSurveyId}` : `${API_BASE_URL}/api/surveys`;

      const dataToSend = {
        ...surveyData,
        status: undefined,
        userId: userId,
        startDate: surveyData.startDate || null,
        endDate: surveyData.endDate || null,
        isPublished: surveyData.isPublished
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        const result = await response.json();
        if (!currentSurveyId) {
          setCurrentSurveyId(result.id);
          router.push(`/admin/surveys/${result.id}/edit`);
        }
        setSurveyData(prev => ({
          ...prev,
          isPublished: result.status === "PUBLISHED"
        }));
        toast({
          title: `Encuesta ${currentSurveyId ? 'actualizada' : 'creada'} exitosamente.`,
          description: `La encuesta "${name}" ha sido ${currentSurveyId ? "actualizado" : "creado"} exitosamente.`,
          duration: 5000,
          variant: "success",
        });
        setActiveTab("questions");
      } else {
        const error = await response.json();
        toast({
          title: `Error al ${currentSurveyId ? 'actualizar' : 'crear'} la encuesta`,
          description: `Error al ${currentSurveyId ? 'actualizar' : 'crear'} la encuesta`,
          duration: 5000,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: `Error de red al ${currentSurveyId ? 'actualizar' : 'crear'} la encuesta`,
        description: `Error de red al ${currentSurveyId ? 'actualizar' : 'crear'} la encuesta`,
        duration: 5000,
        variant: "destructive",
      });
    } finally {
      setSurveyLoading(false);
    }
  };

  if (authLoading || surveyLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader />
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

  const generateCustomLink = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
  };

  const isCreatingNewSurvey = currentSurveyId === undefined;

  return (
    <div className="min-h-screen py-2">
      <div className="max-w-4xl mx-auto px-1">
        <div className="bg-gradient-to-r p-4 gap-x-6 from-blue-600 to-indigo-600 rounded-t-xl shadow-lg flex items-center justify-start  border-slate-200 px-4">
          <img src={Imagenes?.icsLogo || ""} height={75} width={75} alt="ics.logo" className="rounded-md object-center" />

          <div className=" flex flex-col gap-y-2">
            <InlineEditable
              value={surveyData.title}
              onChange={(newValue) => setSurveyData({ ...surveyData, title: newValue })}
              placeholder="Ej: Encuesta de Satisfacción del Cliente"
              as="input"
              displayAs="h1"
              className="text-white"
            />
            <InlineEditable
              value={surveyData.description}
              onChange={(newValue) => setSurveyData({ ...surveyData, description: newValue })}
              placeholder="Describe el propósito de tu encuesta..."
              as="textarea"
              displayAs="p"
              className="text-white/90"
            />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto sm:space-x-8" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab("survey")}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none flex gap-2 justify-center items-center ${activeTab === "survey"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                <Settings />
                <span>Configuración</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none flex gap-2 justify-center items-center ${activeTab === "questions"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                disabled={isCreatingNewSurvey}
                title={isCreatingNewSurvey ? "Primero debes guardar la configuración de la encuesta." : ""}
              >
                <Pencil />
                <span>Preguntas</span>
              </button>
            </nav>
          </div>

          {activeTab === "survey" && (
            <form onSubmit={handleSurveySubmit} className="space-y-6">
              <div className="space-y-4">

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-700">
                    Estado: {surveyData.isPublished ? "Publicada" : "Borrador"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={surveyData.isPublished}
                      onChange={(e) => setSurveyData({ ...surveyData, isPublished: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Enlace Personalizado</h2>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-500 text-sm rounded-l-md border border-gray-200">
                    /survey/
                  </span>
                  <input
                    type="text"
                    id="customLink"
                    required
                    placeholder="mi-encuesta-personalizada"
                    value={surveyData.customLink}
                    onChange={(e) => setSurveyData({ ...surveyData, customLink: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-r-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!surveyData.title.trim()) {
                        toast({
                          title: `Primero escribe un título para generar el enlace`,
                          description: `Primero escribe un título para generar el enlace`,
                          duration: 5000,
                          variant: "destructive",
                        });
                        return;
                      }
                      setSurveyData({
                        ...surveyData,
                        customLink: generateCustomLink(surveyData.title),
                      });
                    }}
                    className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition"
                  >
                    🔄 Generar
                  </button>
                </div>

                {surveyData.customLink.trim() === '' && (
                  <p className="text-red-600 text-sm mt-1">El enlace es requerido</p>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                  <div className="flex items-start space-x-2">
                    <div className="mt-0.5 text-blue-600">ℹ️</div>
                    <div>
                      <p className="font-medium text-blue-900 mb-1">Consejos para enlaces:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Solo letras minúsculas, números y guiones</li>
                        <li>Entre 3 y 50 caracteres</li>
                        <li>No puede empezar o terminar con guión</li>
                        <li>Debe ser único en todo el sistema</li>
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
                  {isCreatingNewSurvey ? "Crear Encuesta y continuar" : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "questions" && currentSurveyId && (
            <QuestionManager surveyId={currentSurveyId} />
          )}
        </div>
      </div>
    </div>
  );
}
