"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import SurveyManager from "@/components/survey-builder/survey-manager"

interface EditSurveyPageProps {
  params: {
    id: string
  }
}

export default function EditSurveyPage({ params }: EditSurveyPageProps) {
  return (
    <AdminLayout>
      <SurveyManager />
    </AdminLayout>
  )
}
