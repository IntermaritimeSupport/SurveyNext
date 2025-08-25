// contexts/auth-context.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';

// Define el tipo para la información del usuario que se almacenará en el contexto
interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER'; // Asegúrate de que esto coincida con tus enums de Prisma
}

// Define el tipo para el estado del contexto de autenticación
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean; // <-- ¡Nuevo!
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>;
}

// Crea el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define la URL base de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Proveedor de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/me`);

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error desconocido al iniciar sesión');
      }

      const data = await response.json();
      setUser(data.user);
      console.log('Login exitoso:', data.user);
    } catch (error: any) {
      console.error('Error en el login:', error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error desconocido al cerrar sesión');
      }

      setUser(null);
      console.log('Sesión cerrada exitosamente');
      router.push('/');
    } catch (error) {
      console.error('Error en el logout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Calcula isAuthenticated basado en si el usuario existe
  const isAuthenticated = user !== null; // <-- ¡Nuevo!

  const register = async (data: { name: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error desconocido al registrar usuario');
      }

      const responseData = await response.json();
      setUser(responseData.user);
      console.log('Registro exitoso:', responseData.user);
    } catch (error: any) {
      console.error('Error en el registro:', error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    user,
    isLoading,
    isAuthenticated, // <-- ¡Añadir aquí!
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Hook personalizado para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}