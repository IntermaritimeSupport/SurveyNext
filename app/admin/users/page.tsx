// app/admin/users/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation" // Importar useRouter
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, Search, Edit, Trash2, Mail, Calendar, Shield, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react" // Añadir iconos de estado y loader
import Link from "next/link"
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Para formatear fechas en español

// Importar enums de Prisma directamente
import { Role, UserStatus } from '@prisma/client';
import { Alert, AlertDescription } from "@/components/ui/alert"

// Interfaz para el usuario que se recibe del API (debe coincidir con tu API /api/users)
interface APIUser {
  id: string;
  email: string;
  name: string;
  role: Role; // Usar el enum de Prisma
  status: UserStatus; // Usar el enum de Prisma
  createdAt: string; // Date como string ISO
  updatedAt: string; // Date como string ISO
  lastLogin: string | null; // Date como string ISO
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function UsersPage() {
  const router = useRouter(); // Instanciar useRouter
  const [users, setUsers] = useState<APIUser[]>([]); // Usar APIUser[]
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true); // Estado de carga
  const [error, setError] = useState<string | null>(null); // Estado de error

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      if (!res.ok) {
        throw new Error(`Error al cargar usuarios: ${res.statusText}`);
      }
      const data: APIUser[] = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Error al cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(); // Cargar usuarios al montar el componente
  }, []); // El array de dependencias vacío asegura que se ejecuta una vez

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}"? Esta acción es irreversible.`)) {
      return;
    }

    setLoading(true); // Mostrar carga mientras se elimina
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error desconocido al eliminar usuario.');
      }

      alert(`Usuario "${userName}" eliminado correctamente.`);
      fetchUsers(); // Volver a cargar la lista de usuarios después de eliminar
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "admins" && user.role === Role.ADMIN) || // Usar enum
      (activeTab === "users" && user.role === Role.USER) ||   // Usar enum
      (activeTab === "active" && user.status === UserStatus.ACTIVE) || // Usar enum
      (activeTab === "inactive" && user.status === UserStatus.INACTIVE) || // Usar enum
      (activeTab === "suspended" && user.status === UserStatus.SUSPENDED) // Añadir si tienes estado suspendido
    return matchesSearch && matchesTab
  });

  // Calcular estadísticas con los usuarios cargados de la API
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === Role.ADMIN).length,
    active: users.filter((u) => u.status === UserStatus.ACTIVE).length,
    inactive: users.filter((u) => u.status === UserStatus.INACTIVE).length,
    suspended: users.filter((u) => u.status === UserStatus.SUSPENDED).length, // Si tienes
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="ml-2 text-slate-500">Cargando usuarios...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchUsers} className="m-4">
            Reintentar
        </Button>
      </AdminLayout>
    );
  }


  return (
    <AdminLayout>
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
            <p className="text-slate-600 mt-1">Administra usuarios y permisos del sistema</p>
          </div>
          <Link href="/admin/users/new"> {/* Enlace para crear nuevo usuario */}
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Usuario
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <div className="h-2 w-2 bg-green-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
              <div className="h-2 w-2 bg-red-500 rounded-full" /> {/* O un icono de X si prefieres */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Usuarios</CardTitle>
                <CardDescription>Gestiona todos los usuarios del sistema</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="admins">Administradores</TabsTrigger>
                <TabsTrigger value="users">Usuarios</TabsTrigger>
                <TabsTrigger value="active">Activos</TabsTrigger>
                <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                {stats.suspended > 0 && <TabsTrigger value="suspended">Suspendidos</TabsTrigger>} {/* Mostrar solo si hay suspendidos */}
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                <div className="space-y-4">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No se encontraron usuarios que coincidan con los criterios de búsqueda.
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">{user.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-slate-900">{user.name}</h3>
                              <Badge variant={user.role === Role.ADMIN ? "default" : "secondary"}>
                                {user.role === Role.ADMIN ? "Admin" : "Usuario"}
                              </Badge>
                              <Badge variant={
                                  user.status === UserStatus.ACTIVE ? "default" :
                                  user.status === UserStatus.INACTIVE ? "destructive" :
                                  "secondary" // Para Suspended, usa "secondary" como color diferente
                                }>
                                {user.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>Creado: {format(new Date(user.createdAt), 'PP', { locale: es })}</span>
                              </div>
                              {user.lastLogin && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Último acceso: {format(new Date(user.lastLogin), 'PPPp', { locale: es })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Link href={`/admin/users/${user.id}`}>
                            <Button variant="outline" size="sm" title="Editar Usuario">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id, user.name)} title="Eliminar Usuario">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}