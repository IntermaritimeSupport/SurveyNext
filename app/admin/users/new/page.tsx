// app/admin/users/new/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserForm } from "../_components/user-form"
import { useAuth } from "@/contexts/auth-context"

export default function CreateUserPage() {
  const router = useRouter();
  const { user } = useAuth()
  const myRole = user?.role || "USER" 

  // Función que se llamará cuando el formulario UserForm guarde exitosamente
  const handleSaveSuccess = () => {
    router.push('/admin/users'); // Redirigir a la lista de usuarios
  };

  // Función que se llamará si el usuario cancela la creación
  const handleCancel = () => {
    router.back(); // Volver a la página anterior (generalmente /admin/users)
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4">
        {/* Encabezado y botón de Volver */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={handleCancel}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 flex-1 text-center pr-20">Crear Nuevo Usuario</h1>
          <div></div> {/* Espaciador para centrar el título */}
        </div>
        
        {/* El formulario de usuario para la creación */}
        {/* No pasamos 'initialUser' porque es para creación */}
        <UserForm myRole={myRole} onSaveSuccess={handleSaveSuccess} onCancel={handleCancel} />
      </div>
    </AdminLayout>
  );
}