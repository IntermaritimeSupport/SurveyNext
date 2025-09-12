// components/auth/AuthPageWrapper.tsx
'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context'; // Ajusta la ruta a tu AuthContext
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '../loaders/loader';

interface AuthPageWrapperProps {
  children: React.ReactNode;
}

export function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const { isAuthenticated, isLoading, user } = useAuth(); // Obtén user también si quieres redirigir por rol
  const router = useRouter();

  useEffect(() => {
    // Si no está cargando y está autenticado
    if (!isLoading && isAuthenticated) {
      // Redirige al dashboard o a la página de admin si es admin
      if (user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/login'); // O la ruta por defecto para usuarios normales
      }
    }
    // No redirijas si está cargando, ya que el estado de auth aún no es definitivo
  }, [isAuthenticated, isLoading, router, user]); // Añade user a las dependencias

  // Muestra un loader o nada mientras la autenticación se verifica
  // Esto evita un "flash" de contenido antes de la redirección
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader />
      </div>
    );
  }

  // Si no está autenticado, muestra el contenido de la página de login/registro
  // Si está autenticado, el useEffect ya lo redirigió, así que no debería mostrar este contenido
  return <>{children}</>;
}