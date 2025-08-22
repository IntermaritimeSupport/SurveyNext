"use client"

import { useState, useEffect } from "react"
import { type Language, getTranslation, type TranslationKey } from "@/lib/translations"

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("es")

  useEffect(() => {
    const stored = localStorage.getItem("language") as Language
    if (stored && ["es", "en", "zh"].includes(stored)) {
      setLanguage(stored)
    }
  }, [])

  const changeLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const t = (key: TranslationKey) => getTranslation(language, key)

  return {
    language,
    changeLanguage,
    t,
  }
}
