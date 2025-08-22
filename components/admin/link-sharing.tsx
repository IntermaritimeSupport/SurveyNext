"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Mail, MessageCircle, Check, QrCode } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface LinkSharingProps {
  surveyTitle: string
  customLink: string
  isActive: boolean
}

export function LinkSharing({ surveyTitle, customLink, isActive }: LinkSharingProps) {
  const [copied, setCopied] = useState(false)
  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/survey/${customLink}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Error copying to clipboard:", err)
    }
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Encuesta: ${surveyTitle}`)
    const body = encodeURIComponent(
      `Hola,\n\nTe invito a participar en esta encuesta: "${surveyTitle}"\n\nPuedes acceder aquí: ${fullUrl}\n\n¡Gracias por tu participación!`,
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(`¡Hola! Te invito a participar en esta encuesta: "${surveyTitle}"\n\n${fullUrl}`)
    window.open(`https://wa.me/?text=${message}`)
  }

  const openPreview = () => {
    window.open(fullUrl, "_blank")
  }

  const generateQRCode = () => {
    // Usar un servicio gratuito de QR codes
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}`
    window.open(qrUrl, "_blank")
  }

  return (
    <Card className="survey-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Compartir Encuesta</span>
          <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Activa" : "Inactiva"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Display */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
            <code className="flex-1 text-sm text-slate-700 break-all">{fullUrl}</code>
            <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={!isActive}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {copied && <p className="text-xs text-green-600">¡Enlace copiado!</p>}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={openPreview} disabled={!isActive} className="justify-start bg-transparent">
            <ExternalLink className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!isActive} className="justify-start bg-transparent">
                <QrCode className="h-4 w-4 mr-2" />
                Código QR
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Código QR de la Encuesta</DialogTitle>
              </DialogHeader>
              <div className="text-center space-y-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}`}
                  alt="QR Code"
                  className="mx-auto"
                />
                <p className="text-sm text-slate-600">Escanea este código para acceder a la encuesta</p>
                <Button onClick={generateQRCode} variant="outline">
                  Descargar QR
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={shareViaEmail}
            disabled={!isActive}
            className="justify-start bg-transparent"
          >
            <Mail className="h-4 w-4 mr-2" />
            Por Email
          </Button>

          <Button
            variant="outline"
            onClick={shareViaWhatsApp}
            disabled={!isActive}
            className="justify-start bg-transparent"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>

        {/* Share Text Templates */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700">Plantillas para Compartir</h4>

          <div className="space-y-2">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Email formal:</p>
              <p className="text-sm text-slate-700">
                "Te invito a participar en nuestra encuesta '{surveyTitle}'. Tu opinión es muy importante para nosotros.
                Accede aquí: {fullUrl}"
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Mensaje casual:</p>
              <p className="text-sm text-slate-700">
                "¡Hola! ¿Podrías ayudarme completando esta encuesta? Solo toma unos minutos: {fullUrl}"
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Redes sociales:</p>
              <p className="text-sm text-slate-700">
                "🔍 Nueva encuesta disponible: '{surveyTitle}' - Tu participación cuenta! {fullUrl} #encuesta #feedback"
              </p>
            </div>
          </div>
        </div>

        {!isActive && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ La encuesta está inactiva. Actívala para que los participantes puedan acceder.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
