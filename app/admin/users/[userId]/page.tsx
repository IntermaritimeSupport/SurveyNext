// app/admin/users/[userId]/page.tsx
"use client"

import React, { useEffect, useState } from "react" // `React` se importa pero no se usa con .use() aquí
import { useParams, useRouter } from "next/navigation"
import { UserForm } from "../_components/user-form"
import { Loader2, ChevronLeft } from "lucide-react"
import { Role, UserStatus } from '@prisma/client';
import { Button } from "../../../../components/ui/button" // Ajusta la ruta según la ubicación real del archivo Button
import { AdminLayout } from "../../../../components/admin/admin-layout"

// Interfaz para el usuario que se recibe del API
interface APIUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// --- CORRECCIÓN CLAVE AQUÍ: Acceso directo a params.userId ---
// En Client Components, 'params' es un objeto proxy. Puedes acceder directamente a sus propiedades.
// La advertencia es una "sugerencia" de migración futura, no un error actual de uso.
export default function EditUserPage({ params }: { params: { userId: string } }) {
  const userId = useParams() // <-- Acceso directo, como estaba originalmente antes de React.use()
  // --- FIN CORRECCIÓN CLAVE ---

  const router = useRouter();
  const [user, setUser] = useState<APIUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${userId.userId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Usuario no encontrado.");
          }
          throw new Error(`Error al cargar usuario: ${res.statusText}`);
        }
        const data: APIUser = await res.json();
        setUser(data);
      } catch (err: any) {
        console.error("Error fetching user details:", err);
        setError(err.message || "Error al cargar los detalles del usuario.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) { 
      fetchUser();
    }
  }, [userId]); // `userId` es una dependencia estable aquí

  const handleSaveSuccess = () => {
    router.push('/admin/users');
  };

  const handleCancel = () => {
    router.back();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="ml-2 text-slate-500">Cargando detalles del usuario...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <div className="p-4">
            <Button onClick={handleCancel}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">No se pudo cargar el usuario.</span>
          </div>
          <div className="p-4">
            <Button onClick={handleCancel}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={handleCancel}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 flex-1 text-center pr-20">Editar Usuario</h1>
          <div></div>
        </div>
        <UserForm initialUser={user} onSaveSuccess={handleSaveSuccess} onCancel={handleCancel} />
      </div>
    );
  };

  return (
     <AdminLayout>
        {renderContent()}
    </AdminLayout>
  );
}