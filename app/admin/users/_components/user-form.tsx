// app/admin/users/_components/user-form.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, Trash2 } from "lucide-react"
import { Role, UserStatus } from '@prisma/client'; // Importar enums de Prisma

// Interfaz para el usuario que se mostrará/editará
interface UserFormProps {
  initialUser?: { // Opcional, si estamos editando
    id: string;
    email: string;
    name: string;
    role: Role;
    status: UserStatus;
    // No incluir la contraseña aquí por seguridad
  };
  onSaveSuccess?: () => void; // Callback después de guardar exitosamente
  onCancel?: () => void; // Callback para cancelar
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function UserForm({ initialUser, onSaveSuccess, onCancel }: UserFormProps) {
  const router = useRouter();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validaciones del formulario
    if (!email.trim() || !name.trim()) {
      setError("El email y el nombre son obligatorios.");
      setIsLoading(false);
      return;
    }

    if (!isEditing && (!password.trim() || !confirmPassword.trim())) {
      setError("La contraseña y su confirmación son obligatorias para nuevos usuarios.");
      setIsLoading(false);
      return;
    }

    if (password.trim() && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setIsLoading(false);
      return;
    }

    const userData: any = {
      email,
      name,
      role,
      status,
    };

    if (password.trim()) { // Solo enviar la contraseña si se ha modificado/ingresado
      userData.password = password;
    }

    try {
      let response;
      if (isEditing) {
        // Actualizar usuario existente
        response = await fetch(`${API_BASE_URL}/api/users/${initialUser!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
      } else {
        // Crear nuevo usuario
        response = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el usuario.`);
      }

      alert(`Usuario ${isEditing ? 'actualizado' : 'creado'} con éxito!`);
      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        router.push('/admin/users'); // Redirigir a la lista de usuarios
      }
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !initialUser || !window.confirm(`¿Estás seguro de que quieres eliminar a "${initialUser.name}"? Esta acción es irreversible.`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${initialUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error desconocido al eliminar usuario.');
      }

      alert(`Usuario "${initialUser.name}" eliminado correctamente.`);
      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        router.push('/admin/users');
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message);
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
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@dominio.com"
              disabled={isLoading || isEditing} // El email no se edita en este formulario una vez creado
            // Si permites editar email, quita `isEditing` de `disabled`
            />
            {isEditing && <p className="text-sm text-slate-500 mt-1">El email no se puede cambiar directamente.</p>}
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

          {/* Contraseña solo si es nuevo usuario o si se quiere cambiar */}
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
              onClick={() => setShowPasswordFields(true)} // mostrar los campos
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
                <SelectItem value={Role.USER}>Usuario</SelectItem>
                <SelectItem value={Role.ADMIN}>Administrador</SelectItem>
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
                  <SelectItem value={UserStatus.ACTIVE}>Activo</SelectItem>
                  <SelectItem value={UserStatus.INACTIVE}>Inactivo</SelectItem>
                  <SelectItem value={UserStatus.SUSPENDED}>Suspendido</SelectItem>
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