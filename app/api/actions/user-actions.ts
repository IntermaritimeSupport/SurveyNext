// actions/user-actions.ts
'use server'; // Marcar el archivo como un Server Action
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache'; // Para revalidar cachés de rutas
import { PrismaClient, Role, UserStatus } from '@prisma/client'
const prisma = new PrismaClient()
// Crear un nuevo usuario
export async function createUser(formData: FormData) {
  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as Role; // Asegúrate de que 'Role' sea un tipo válido si lo usas con FormData

  if (!email || !name || !password) {
    return { error: 'Faltan campos obligatorios' };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'USER',
      },
      select: { id: true, email: true, name: true, role: true },
    });
    revalidatePath('/admin/users'); // Revalida la caché de la página de usuarios si existe
    return { success: true, user: newUser };
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return { error: 'El correo electrónico ya está registrado' };
    }
    return { error: 'Error al crear usuario' };
  }
}

// Actualizar un usuario
export async function updateUser(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string | null;
  const role = formData.get('role') as Role;
  const status = formData.get('status') as UserStatus;

  const dataToUpdate: any = { name, email, role, status };

  if (password) {
    dataToUpdate.password = await bcrypt.hash(password, 10);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    revalidatePath(`/admin/users/${id}`); // Revalida la página del usuario específico
    revalidatePath('/admin/users'); // Revalida la lista también
    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return { error: 'El correo electrónico ya está registrado' };
    }
    if (error.code === 'P2025') {
      return { error: 'Usuario no encontrado para actualizar' };
    }
    return { error: 'Error al actualizar usuario' };
  }
}

// Eliminar un usuario
export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath('/admin/users');
    return { success: true, message: 'Usuario eliminado correctamente' };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2025') {
      return { error: 'Usuario no encontrado para eliminar' };
    }
    return { error: 'Error al eliminar usuario' };
  }
}

// Obtener un usuario por ID (para Server Components)
export async function getUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

// Obtener todos los usuarios (para Server Components)
export async function getAllUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}