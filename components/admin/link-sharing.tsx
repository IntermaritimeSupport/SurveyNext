"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface LinkSharingProps {
  surveyTitle: string
  customLink: string
  isActive: boolean
}

export function LinkSharing({ surveyTitle, customLink, isActive }: LinkSharingProps) {
  const [copied, setCopied] = useState(false)

  const surveyUrl = `${window.location.origin}/survey/${customLink}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl)
      setCopied(true)
      toast.success("Enlace copiado")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Error al copiar")
    }
  }

  const handleOpenSurvey = () => {
    window.open(surveyUrl)
  }

  if (!isActive) {
    return <span className="text-xs text-slate-400">—</span>
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-6 w-6 p-0 hover:bg-slate-100">
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{copied ? "¡Copiado!" : "Copiar enlace"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleOpenSurvey} className="h-6 w-6 p-0 hover:bg-slate-100">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Abrir encuesta</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
