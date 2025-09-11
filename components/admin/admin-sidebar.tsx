"use client"

import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/hooks/use-language"
import { Button } from "@/components/ui/button"
import { LanguageSelector } from "@/components/language-selector"
import { BarChart3, FileText, Users, Settings, LogOut, PlusCircle, Home, MessageSquare, TrendingUp } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Role } from "@prisma/client"

export function AdminSidebar() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()

  const userRole = user?.role || "USER" 

  const navigation = [
    {
      name: t("admin"),
      href: "/admin",
      icon: Home,
      current: pathname === "/admin",
      roles: [Role.ADMIN, Role.SUPERADMIN,Role.MODERATOR] // Todos pueden ver el inicio del panel
    },
    {
      name: t("surveys"),
      href: "/admin/surveys",
      icon: FileText,
      current: pathname.startsWith("/admin/surveys"),
      roles: [Role.ADMIN, Role.SUPERADMIN,Role.MODERATOR] // Todos pueden ver las encuestas
    },
    {
      name: t("responses"),
      href: "/admin/responses",
      icon: MessageSquare,
      current: pathname.startsWith("/admin/responses"),
      roles: [Role.ADMIN, Role.SUPERADMIN,Role.MODERATOR] // Todos pueden ver las respuestas
    },
    {
      name: t("reports"),
      href: "/admin/reports",
      icon: TrendingUp,
      current: pathname.startsWith("/admin/reports"),
      roles: [Role.ADMIN, Role.SUPERADMIN,Role.MODERATOR] // Todos pueden ver los reportes
    },
    {
      name: "Usuarios", // Asumo que "Usuarios" no se traduce ya que no usaste t()
      href: "/admin/users",
      icon: Users,
      current: pathname.startsWith("/admin/users"),
      roles: [Role.ADMIN, Role.SUPERADMIN] // Solo Super Admin y Admin pueden ver usuarios
    },
    {
      name: t("settings"),
      href: "/admin/settings",
      icon: Settings,
      current: pathname.startsWith("/admin/settings"),
      roles: [Role.ADMIN, Role.SUPERADMIN] // Solo Super Admin y Admin pueden ver configuraciones
    },
  ]

  // Filtra los elementos de navegación basados en el rol del usuario
  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-full w-64 flex-col bg-white shadow-lg border-r border-slate-200">

      {/* User Info */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavigation.map((item) => { // Ahora mapeamos sobre la navegación filtrada
          const Icon = item.icon
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={item.current ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  item.current
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Footer with Language Selector and Logout */}
      <div className="border-t border-slate-200 p-4 space-y-2">
        <LanguageSelector />
        <Button
          variant="outline"
          onClick={logout}
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 bg-transparent"
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}