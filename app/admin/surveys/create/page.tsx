"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { SurveyBuilder } from "@/components/survey-builder/survey-builder"

export default function CreateSurveyPage() {
  return (
    <AdminLayout>
      <SurveyBuilder />
    </AdminLayout>
  )
}
