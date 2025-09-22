"use client"

import { useState, useEffect } from "react"
import { surveyStore } from "@/lib/survey-store"
import { LinkValidator } from "@/lib/link-validator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, RefreshCw, Check, AlertCircle } from "lucide-react"

interface LinkManagerProps {
  currentLink: string
  surveyId: string
  onLinkChange: (link: string) => void
}

export function LinkManager({ currentLink, surveyId, onLinkChange }: LinkManagerProps) {
  const [inputValue, setInputValue] = useState(currentLink)
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true })
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/survey/${inputValue}`

  useEffect(() => {
    setInputValue(currentLink)
  }, [currentLink])

  useEffect(() => {
    const checkLink = async () => {
      if (!inputValue) {
        setValidation({ valid: false, error: "El enlace es requerido" })
        setSuggestions([])
        return
      }

      setIsChecking(true)

      // Validar formato
      const formatValidation = LinkValidator.isValidCustomLink(inputValue)
      if (!formatValidation.valid) {
        setValidation(formatValidation)
        setSuggestions([])
        setIsChecking(false)
        return
      }

      // Verificar unicidad
      const existingSurvey = surveyStore.getSurveyByLink(inputValue)
      if (existingSurvey && existingSurvey.id !== surveyId) {
        setValidation({ valid: false, error: "Este enlace ya está en uso" })

        // Generar sugerencias
        const allSurveys = surveyStore.getSurveys()
        const existingLinks = allSurveys.map((s) => s.customLink)
        const newSuggestions = LinkValidator.generateSuggestions(inputValue, existingLinks)
        setSuggestions(newSuggestions)
      } else {
        setValidation({ valid: true })
        setSuggestions([])
      }

      setIsChecking(false)
    }

    const timeoutId = setTimeout(checkLink, 300)
    return () => clearTimeout(timeoutId)
  }, [inputValue, surveyId])

  const handleInputChange = (value: string) => {
    const sanitized = LinkValidator.sanitizeLink(value)
    setInputValue(sanitized)
  }

  const handleApplyLink = () => {
    if (validation.valid) {
      onLinkChange(inputValue)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Error copying to clipboard:", err)
    }
  }

  const openPreview = () => {
    if (validation.valid && inputValue) {
      window.open(fullUrl)
    }
  }

  const generateRandomLink = () => {
    const adjectives = ["rapida", "simple", "facil", "nueva", "moderna", "completa"]
    const nouns = ["encuesta", "formulario", "cuestionario", "consulta"]
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomNum = Math.floor(Math.random() * 1000)

    const randomLink = `${randomAdj}-${randomNoun}-${randomNum}`
    setInputValue(randomLink)
  }

  return (
    <Card className="survey-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Enlace Personalizado</span>
          <Button variant="outline" size="sm" onClick={generateRandomLink}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="customLink">Enlace de la Encuesta</Label>
          <div className="flex mt-1">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
              /survey/
            </span>
            <Input
              id="customLink"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="mi-encuesta-personalizada"
              className={`rounded-l-none ${validation.valid ? "border-slate-300" : "border-red-300"}`}
            />
          </div>

          {/* Validation Status */}
          <div className="flex items-center mt-2 space-x-2">
            {isChecking ? (
              <div className="flex items-center text-sm text-slate-500">
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Verificando...
              </div>
            ) : validation.valid ? (
              <div className="flex items-center text-sm text-green-600">
                <Check className="h-4 w-4 mr-1" />
                Enlace disponible
              </div>
            ) : (
              <div className="flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validation.error}
              </div>
            )}
          </div>
        </div>

        {/* URL Preview */}
        {validation.valid && inputValue && (
          <div className="space-y-2">
            <Label>URL Completa</Label>
            <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
              <code className="flex-1 text-sm text-slate-700 break-all">{fullUrl}</code>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={openPreview}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            {copied && <p className="text-xs text-green-600">¡Enlace copiado al portapapeles!</p>}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Label>Sugerencias Disponibles</Label>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => setInputValue(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Apply Button */}
        {inputValue !== currentLink && (
          <div className="pt-2">
            <Button onClick={handleApplyLink} disabled={!validation.valid} className="w-full">
              Aplicar Enlace
            </Button>
          </div>
        )}

        {/* Help Text */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Consejos para enlaces:</strong>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Solo letras minúsculas, números y guiones</li>
              <li>• Entre 3 y 50 caracteres</li>
              <li>• No puede empezar o terminar con guión</li>
              <li>• Debe ser único en todo el sistema</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
