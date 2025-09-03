export class LinkValidator {
  private static readonly RESERVED_WORDS = [
    "admin",
    "api",
    "auth",
    "login",
    "register",
    "admin",
    "survey",
    "surveys",
    "response",
    "responses",
    "report",
    "reports",
    "user",
    "users",
    "settings",
    "config",
    "help",
    "support",
    "about",
    "contact",
    "privacy",
    "terms",
    "www",
    "mail",
    "ftp",
    "blog",
    "news",
    "static",
    "assets",
    "public",
    "private",
    "test",
    "dev",
    "staging",
    "prod",
    "production",
  ]

  static isValidCustomLink(link: string): { valid: boolean; error?: string } {
    // Verificar que no esté vacío
    if (!link || link.trim().length === 0) {
      return { valid: false, error: "El enlace no puede estar vacío" }
    }

    // Verificar longitud
    if (link.length < 3) {
      return { valid: false, error: "El enlace debe tener al menos 3 caracteres" }
    }

    if (link.length > 50) {
      return { valid: false, error: "El enlace no puede tener más de 50 caracteres" }
    }

    // Verificar caracteres válidos (solo letras, números y guiones)
    const validPattern = /^[a-z0-9-]+$/
    if (!validPattern.test(link)) {
      return { valid: false, error: "Solo se permiten letras minúsculas, números y guiones" }
    }

    // No puede empezar o terminar con guión
    if (link.startsWith("-") || link.endsWith("-")) {
      return { valid: false, error: "El enlace no puede empezar o terminar con guión" }
    }

    // No puede tener guiones consecutivos
    if (link.includes("--")) {
      return { valid: false, error: "No se permiten guiones consecutivos" }
    }

    // Verificar palabras reservadas
    if (this.RESERVED_WORDS.includes(link.toLowerCase())) {
      return { valid: false, error: "Esta palabra está reservada, elige otra" }
    }

    return { valid: true }
  }

  static generateSuggestions(baseLink: string, existingLinks: string[]): string[] {
    const suggestions: string[] = []
    const cleanBase = this.sanitizeLink(baseLink)

    // Sugerencia original si es válida
    if (this.isValidCustomLink(cleanBase).valid && !existingLinks.includes(cleanBase)) {
      suggestions.push(cleanBase)
    }

    // Sugerencias con números
    for (let i = 1; i <= 5; i++) {
      const suggestion = `${cleanBase}-${i}`
      if (this.isValidCustomLink(suggestion).valid && !existingLinks.includes(suggestion)) {
        suggestions.push(suggestion)
      }
    }

    // Sugerencias con palabras adicionales
    const additionalWords = ["encuesta", "form", "survey", "cuestionario"]
    for (const word of additionalWords) {
      const suggestion = `${cleanBase}-${word}`
      if (this.isValidCustomLink(suggestion).valid && !existingLinks.includes(suggestion)) {
        suggestions.push(suggestion)
      }
    }

    return suggestions.slice(0, 5) // Máximo 5 sugerencias
  }

  static sanitizeLink(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Remover caracteres especiales
      .replace(/\s+/g, "-") // Espacios a guiones
      .replace(/-+/g, "-") // Múltiples guiones a uno solo
      .replace(/^-|-$/g, "") // Remover guiones al inicio y final
      .substring(0, 50) // Limitar longitud
  }
}
