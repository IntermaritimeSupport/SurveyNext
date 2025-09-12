"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, LogIn } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

export function LoginForm() {
  const { login, isLoading } = useAuth()
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await login(formData)
      toast({
        title: "Inicio de sesión exitoso",
        description: "Redirigiendo al panel de administración...",
        variant: "success",
      })
      window.location.href = "/admin"
    } catch (err) {
      toast({
        title: "Error al iniciar sesión",
        description: "Por favor, verifica tus credenciales e intenta de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
        <CardDescription>Accede a tu panel de administración</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@survey.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              "Iniciando sesión..."
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Iniciar Sesión
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              Regístrate aquí
            </Link>
          </div>

        </form>
      </CardContent>
    </Card>
  )
}
