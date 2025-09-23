"use client"

import React, { JSX, useState } from "react"
interface InlineEditableProps {
  value: string
  onChange: (newValue: string) => void
  placeholder?: string
  as?: "input" | "textarea"
  displayAs?: "h1" | "h2" | "p" | "span" // estilos de lectura
  className?: string
}

export default function InlineEditable({
  value,
  onChange,
  placeholder = "Haz doble click para editar",
  as = "input",
  displayAs = "span",
  className = "hover:bg-gray-100 rounded-sm p-1",
}: InlineEditableProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleBlur = () => setIsEditing(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && as === "input") {
      setIsEditing(false)
    }
  }

  if (!isEditing) {
    const commonClasses = `cursor-pointer ${value ? "" : "text-gray-400 italic"} ${className}`

    const displayMap: Record<string, JSX.Element> = {
      h1: <h1 className={`text-2xl font-bold ${commonClasses}`} onDoubleClick={() => setIsEditing(true)}>{value || placeholder}</h1>,
      h2: <h2 className={`text-xl font-semibold ${commonClasses}`} onDoubleClick={() => setIsEditing(true)}>{value || placeholder}</h2>,
      p: <p className={`text-gray-700 ${commonClasses}`} onDoubleClick={() => setIsEditing(true)}>{value || placeholder}</p>,
      span: <span className={commonClasses} onDoubleClick={() => setIsEditing(true)}>{value || placeholder}</span>,
    }

    return displayMap[displayAs]
  }

  if (as === "textarea") {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        rows={3}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
    )
  }

  return (
    <input
      type="text"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  )
}
