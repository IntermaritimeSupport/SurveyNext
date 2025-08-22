import type { User, LoginCredentials, RegisterCredentials } from "@/types/auth"

class AuthStore {
  private users: User[] = []

  constructor() {
    // Crear usuario admin por defecto
    this.initializeDefaultAdmin()
  }

  private initializeDefaultAdmin() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("users")
      if (stored) {
        this.users = JSON.parse(stored)
      } else {
        // Crear admin por defecto
        const defaultAdmin: User = {
          id: "admin-1",
          email: "admin@survey.com",
          name: "Administrador",
          role: "admin",
          createdAt: new Date(),
        }
        this.users = [defaultAdmin]
        localStorage.setItem("users", JSON.stringify(this.users))
        localStorage.setItem("passwords", JSON.stringify({ "admin@survey.com": "admin123" }))
      }
    }
  }

  getUsers(): User[] {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("users")
      if (stored) {
        this.users = JSON.parse(stored)
      }
    }
    return this.users
  }

  getUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email === email)
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const user = this.getUserByEmail(credentials.email)
    if (!user) {
      throw new Error("Usuario no encontrado")
    }

    // Verificar contraseña
    const passwords = JSON.parse(localStorage.getItem("passwords") || "{}")
    if (passwords[credentials.email] !== credentials.password) {
      throw new Error("Contraseña incorrecta")
    }

    // Guardar sesión
    localStorage.setItem("currentUser", JSON.stringify(user))
    return user
  }

  async register(credentials: RegisterCredentials): Promise<User> {
    const existingUser = this.getUserByEmail(credentials.email)
    if (existingUser) {
      throw new Error("El usuario ya existe")
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: credentials.email,
      name: credentials.name,
      role: "user",
      createdAt: new Date(),
    }

    const users = this.getUsers()
    users.push(newUser)
    this.users = users

    // Guardar usuario y contraseña
    localStorage.setItem("users", JSON.stringify(users))
    const passwords = JSON.parse(localStorage.getItem("passwords") || "{}")
    passwords[credentials.email] = credentials.password
    localStorage.setItem("passwords", JSON.stringify(passwords))

    // Guardar sesión
    localStorage.setItem("currentUser", JSON.stringify(newUser))
    return newUser
  }

  getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("currentUser")
      if (stored) {
        return JSON.parse(stored)
      }
    }
    return null
  }

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("currentUser")
    }
  }
}

export const authStore = new AuthStore()
