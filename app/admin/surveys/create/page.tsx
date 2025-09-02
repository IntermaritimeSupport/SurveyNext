"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import SurveyManager from "@/components/survey-builder/survey-manager"

export default function CreateSurveyPage() {
  return (
    <AdminLayout>
      <SurveyManager />
    </AdminLayout>
  )
}
