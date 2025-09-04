// components/reports/overview-cards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import React from "react"

interface SurveyOverviewCardProps {
  title: string
  value: string | number
  description: string
}

export function SurveyOverviewCards({ title, value, description }: SurveyOverviewCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {/* Puedes añadir un icono aquí si lo deseas */}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}