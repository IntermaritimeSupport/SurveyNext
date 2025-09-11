// app/admin/surveys/[id]/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import SurveyManager from "@/components/survey-builder/survey-manager"


export default function EditSurveyPage() {

  return (
    <AdminLayout>
      <SurveyManager />
    </AdminLayout>
  )
}
