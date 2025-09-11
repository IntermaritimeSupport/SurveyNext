// app/components/ProtectedRoute.tsx (o donde tengas este componente)
"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation" // Importamos usePathname
import { Role } from '@prisma/client'; // Importamos el enum Role de Prisma

interface ProtectedRouteProps {
  children: React.ReactNode
  // requireAdmin:
  // Si es 'true', solo SUPERADMIN y ADMIN pueden acceder.
  // Si es 'false' (o no se especifica), SUPERADMIN, ADMIN y MODERATOR pueden acceder
  // (excluyendo roles como USER, EDITOR, etc., que son redirigidos a '/')
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Obtenemos la ruta actual

  useEffect(() => {
    // Si todavía estamos cargando el estado de autenticación, esperamos.
    if (isLoading) {
      return;
    }

    // 1. Verificación de Autenticación
    if (!isAuthenticated) {
      router.push("/auth/login"); // Redirige a la página de login si no está autenticado
      return;
    }

    // Si el usuario está autenticado, pero el objeto 'user' aún no está disponible (caso raro pero posible)
    if (!user) {
        router.push("/auth/login"); // O a una página de error
        return;
    }

    const userRole = user.role as Role; // Aseguramos que el rol del usuario sea del tipo Role

    // Define las rutas específicas que requieren el nivel más alto de administración (SUPERADMIN o ADMIN)
    const strictAdminPaths = ["/admin/users", "/admin/settings"];
    // Comprueba si la ruta actual es una de las rutas de "administrador estricto"
    const isStrictAdminPath = strictAdminPaths.some(path => pathname?.startsWith(path));

    // 2. Verificación de Autorización Basada en Roles
    let isAuthorized = false;

    if (isStrictAdminPath) {
        // Regla para /admin/users y /admin/settings: solo SUPERADMIN y ADMIN
        if (userRole === Role.SUPERADMIN || userRole === Role.ADMIN) {
            isAuthorized = true;
        }
    } else if (requireAdmin) {
        // Regla para otras rutas marcadas con requireAdmin=true: solo SUPERADMIN y ADMIN
        if (userRole === Role.SUPERADMIN || userRole === Role.ADMIN || userRole === Role.MODERATOR) {
            isAuthorized = true;
        }
    } else {
        // Regla para todas las demás rutas protegidas (donde requireAdmin=false):
        // SUPERADMIN, ADMIN, MODERATOR
        const allowedGeneralRoles: Role[] = [Role.SUPERADMIN, Role.ADMIN, Role.MODERATOR];
        if (allowedGeneralRoles.includes(userRole)) {
            isAuthorized = true;
        }
    }

    // Si el usuario no está autorizado, redirige a la página de inicio
    if (!isAuthorized) {
        router.push("/");
        return;
    }

  }, [isAuthenticated, isLoading, user, router, pathname, requireAdmin]); // pathname agregado a las dependencias

  // Muestra un spinner de carga mientras se verifican la autenticación y autorización
  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si llegamos aquí, el usuario está autenticado y autorizado, renderiza los hijos
  return <>{children}</>;
}