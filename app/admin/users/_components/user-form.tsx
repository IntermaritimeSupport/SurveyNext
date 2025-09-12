// app/admin/users/_components/user-form.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trash2 } from "lucide-react"
import { Role, UserStatus } from '@prisma/client'; // Importar enums de Prisma
import { useToast } from "@/components/ui/use-toast"

// Interfaz para el usuario que se mostrará/editará
interface UserFormProps {
  initialUser?: { // Opcional, si estamos editando
    id: string; // Asumiendo que el ID es un string (e.g., UUID), si fuera Int, cambiar a number
    email: string;
    name: string;
    role: Role;
    status: UserStatus;
    // No incluir la contraseña aquí por seguridad
  };
  onSaveSuccess?: () => void; // Callback después de guardar exitosamente
  onCancel?: () => void; // Callback para cancelar
  myRole?: string; // El rol del usuario actualmente logueado
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function UserForm({ initialUser, onSaveSuccess, onCancel, myRole }: UserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = !!initialUser;

  const [email, setEmail] = useState(initialUser?.email || '');
  const [name, setName] = useState(initialUser?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>(initialUser?.role || Role.USER);
  const [status, setStatus] = useState<UserStatus>(initialUser?.status || UserStatus.ACTIVE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);


  // Efecto para manejar el estado de las contraseñas al cambiar de modo
  useEffect(() => {
    if (!isEditing) {
      // Si estamos creando un nuevo usuario, asegúrate de que los campos de contraseña estén visibles
      setShowPasswordFields(true);
      setPassword('');
      setConfirmPassword('');
    } else {
      // Si estamos editando un usuario existente, ocultar los campos por defecto
      setShowPasswordFields(false);
      setPassword(''); // Limpiar cualquier valor previo
      setConfirmPassword('');
    }
  }, [isEditing]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.trim() || !name.trim()) {
      toast({
        title: "Error",
        description: "El email y el nombre son obligatorios.",
        duration: 5000,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!isEditing && (!password.trim() || !confirmPassword.trim())) {
      toast({
        title: "Error",
        description: "La contraseña y su confirmación son obligatorias para nuevos usuarios.",
        duration: 5000,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if ((password.trim() || confirmPassword.trim()) && password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden.",
        duration: 5000,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const userData: any = { email, name, role, status };
    if (password.trim()) userData.password = password;

    try {
      let response;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'x-requester-role': myRole || "USER",
      };

      if (isEditing) {
        response = await fetch(`${API_BASE_URL}/api/users/${initialUser!.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(userData),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify(userData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${isEditing ? "actualizar" : "crear"} el usuario.`);
      }

      toast({
        title: `Usuario ${isEditing ? "actualizado" : "creado"}`,
        description: `El usuario "${name}" ha sido ${isEditing ? "actualizado" : "creado"} exitosamente.`,
        duration: 5000,
        variant: "success",
      });

      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        router.push('/admin/users');
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || `Error al ${isEditing ? "actualizar" : "crear"} el usuario.`,
        duration: 5000,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !initialUser || !window.confirm(`¿Eliminar a "${initialUser.name}"?`)) return;

    setIsLoading(true);

    try {
      const headers: HeadersInit = { 'x-requester-role': myRole || "USER" };
      const response = await fetch(`${API_BASE_URL}/api/users/${initialUser.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar usuario.');
      }

      toast({
        title: "Usuario eliminado",
        description: `El usuario "${initialUser.name}" ha sido eliminado.`,
        duration: 5000,
        variant: "success",
      });

      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        router.push('/admin/users');
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Error al eliminar el usuario.',
        duration: 5000,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? `Editar Usuario: ${initialUser?.name}` : "Crear Nuevo Usuario"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@dominio.com"
              disabled={isLoading || isEditing} // Deshabilitar si se está editando o cargando (el email no se edita directamente)
            />
            {isEditing && <p className="text-sm text-slate-500 mt-1">El email no se puede cambiar directamente para usuarios existentes.</p>}
          </div>

          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del usuario"
              disabled={isLoading}
            />
          </div>

          {/* Campos de Contraseña */}
          {!isEditing || showPasswordFields ? (
            <>
              <div>
                <Label htmlFor="password">{isEditing ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña *"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEditing ? "Dejar vacío para no cambiar" : "Contraseña segura"}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">{isEditing ? "Confirmar Nueva Contraseña" : "Confirmar Contraseña *"}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma la contraseña"
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPasswordFields(true)} // Botón para mostrar los campos de contraseña en modo edición
              className="w-full"
              disabled={isLoading}
            >
              Cambiar Contraseña
            </Button>
          )}


          <div>
            <Label htmlFor="role">Rol *</Label>
            <Select value={role} onValueChange={(value: Role) => setRole(value)} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {/* Genera las opciones de rol dinámicamente desde el enum de Prisma */}
                {Object.values(Role).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()} {/* Formateo de nombre */}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isEditing && ( // El estado solo es editable para usuarios existentes
            <div>
              <Label htmlFor="status">Estado *</Label>
              <Select value={status} onValueChange={(value: UserStatus) => setStatus(value)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {/* Genera las opciones de estado dinámicamente desde el enum de Prisma */}
                  {Object.values(UserStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()} {/* Formateo de nombre */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancelar
              </Button>
            )}
            {isEditing && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}