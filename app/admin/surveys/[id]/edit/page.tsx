"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { SurveyBuilder } from "@/components/survey-builder/survey-builder"

interface EditSurveyPageProps {
  params: {
    id: string
  }
}

export default function EditSurveyPage({ params }: EditSurveyPageProps) {
  return (
    <AdminLayout>
      <SurveyBuilder surveyId={params.id} />
    </AdminLayout>
  )
}
