"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, Search, Edit, Trash2, Mail, Calendar, Shield, Clock } from "lucide-react"
import Link from "next/link"
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Role, UserStatus } from '@prisma/client';
import { Alert, AlertDescription } from "@/components/ui/alert"
import Loader from "@/components/loaders/loader"

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

export default function UsersPage() {
  const [users, setUsers] = useState<APIUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}"? Esta acción es irreversible.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error desconocido al eliminar usuario.');
      }

      alert(`Usuario "${userName}" eliminado correctamente.`);
      fetchUsers();
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
      (activeTab === "admins" && user.role === Role.ADMIN) ||
      (activeTab === "users" && user.role === Role.USER) ||
      (activeTab === "active" && user.status === UserStatus.ACTIVE) ||
      (activeTab === "inactive" && user.status === UserStatus.INACTIVE) ||
      (activeTab === "suspended" && user.status === UserStatus.SUSPENDED)
    return matchesSearch && matchesTab
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === Role.ADMIN).length,
    active: users.filter((u) => u.status === UserStatus.ACTIVE).length,
    inactive: users.filter((u) => u.status === UserStatus.INACTIVE).length,
    suspended: users.filter((u) => u.status === UserStatus.SUSPENDED).length,
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader/>
          <p className="text-xl text-gray-700">Cargando Usuarios...</p>
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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
            <p className="text-slate-600 mt-1">Administra usuarios y permisos del sistema</p>
          </div>
          <Link href="/admin/users/new">
            <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Usuario
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
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
              <div className="h-2 w-2 bg-red-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Usuarios</CardTitle>
                <CardDescription>Gestiona todos los usuarios del sistema</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto justify-center sm:justify-start">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="admins">Administradores</TabsTrigger>
                <TabsTrigger value="users">Usuarios</TabsTrigger>
                <TabsTrigger value="active">Activos</TabsTrigger>
                <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                {stats.suspended > 0 && <TabsTrigger value="suspended">Suspendidos</TabsTrigger>}
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
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-slate-50 space-y-3 sm:space-y-0"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-grow min-w-0"> {/* Añadir flex-grow y min-w-0 */}
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-blue-600">{user.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0"> {/* Contenedor para el texto que puede desbordarse */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                              <h3 className="font-medium text-slate-900 truncate">{user.name}</h3> {/* Aplicar truncate al nombre */}
                              <div className="flex gap-2 flex-wrap">
                                <Badge variant={user.role === Role.ADMIN ? "default" : "secondary"}>
                                  {user.role === Role.ADMIN ? "Admin" : "Usuario"}
                                </Badge>
                                <Badge variant={
                                    user.status === UserStatus.ACTIVE ? "default" :
                                    user.status === UserStatus.INACTIVE ? "destructive" :
                                    "secondary"
                                  }>
                                  {user.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-slate-500 mt-1">
                              <div className="flex items-center space-x-1 min-w-0"> {/* Añadir min-w-0 */}
                                <Mail className="h-3 w-3 flex-shrink-0" /> {/* flex-shrink-0 para el icono */}
                                <span className="truncate">{user.email}</span> {/* Aplicar truncate al email */}
                              </div>
                              <div className="flex items-center space-x-1 min-w-0"> {/* Añadir min-w-0 */}
                                <Calendar className="h-3 w-3 flex-shrink-0" /> {/* flex-shrink-0 para el icono */}
                                <span className="truncate">Creado: {format(new Date(user.createdAt), 'PP', { locale: es })}</span> {/* Aplicar truncate a la fecha de creación */}
                              </div>
                              {user.lastLogin && (
                                <div className="flex items-center space-x-1 min-w-0"> {/* Añadir min-w-0 */}
                                  <Clock className="h-3 w-3 flex-shrink-0" /> {/* flex-shrink-0 para el icono */}
                                  <span className="truncate">Último acceso: {format(new Date(user.lastLogin), 'PPPp', { locale: es })}</span> {/* Aplicar truncate a la fecha de último acceso */}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-3 sm:mt-0 ml-auto sm:ml-4 flex-shrink-0"> {/* flex-shrink-0 para los botones */}
                          <Link href={`/admin/users/${user.id}`}>
                            <Button variant="outline" size="sm" title="Editar Usuario">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button color="bg-red-500" variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id, user.name)} title="Eliminar Usuario">
                            <Trash2 className="h-4 w-4 text-black" />
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