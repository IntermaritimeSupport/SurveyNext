// Single source of truth for question types: shared by the builder, the public
// renderer, answer validation (client + server) and the admin views.

export type QuestionTypeKey =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'DATE'
  | 'TIME'
  | 'MULTIPLE_CHOICE'
  | 'CHECKBOXES'
  | 'DROPDOWN'
  | 'SCALE'
  | 'RATING'
  | 'NET_PROMOTER_SCORE'
  | 'MATRIX'
  | 'SECTION'
  | 'FILE_UPLOAD'
  | 'SIGNATURE'

export interface ChoiceOption {
  label: string
  value: string
}

/** MATRIX questions store their grid in `options` as an object instead of an array. */
export interface MatrixOptions {
  rows: ChoiceOption[]
  columns: ChoiceOption[]
}

export interface QuestionLike {
  id?: string
  title?: string
  type: string
  required?: boolean
  options?: unknown
  validation?: Record<string, any> | null
}

export interface QuestionTypeInfo {
  value: QuestionTypeKey
  label: string
  icon: string
  /** Hidden types are not offered in the builder (not implemented yet). */
  hidden?: boolean
}

export const QUESTION_TYPES: QuestionTypeInfo[] = [
  { value: 'TEXT', label: 'Texto corto', icon: 'T' },
  { value: 'TEXTAREA', label: 'Texto largo', icon: '📄' },
  { value: 'MULTIPLE_CHOICE', label: 'Opción única', icon: '●' },
  { value: 'CHECKBOXES', label: 'Casillas (varias)', icon: '☑️' },
  { value: 'DROPDOWN', label: 'Lista desplegable', icon: '⬇️' },
  { value: 'NUMBER', label: 'Número', icon: '🔢' },
  { value: 'EMAIL', label: 'Email', icon: '📧' },
  { value: 'PHONE', label: 'Teléfono', icon: '📞' },
  { value: 'URL', label: 'URL', icon: '🔗' },
  { value: 'DATE', label: 'Fecha', icon: '📅' },
  { value: 'TIME', label: 'Hora', icon: '⏰' },
  { value: 'RATING', label: 'Valoración', icon: '★' },
  { value: 'SCALE', label: 'Escala', icon: '📊' },
  { value: 'NET_PROMOTER_SCORE', label: 'NPS (0-10)', icon: '📣' },
  { value: 'MATRIX', label: 'Matriz / Likert', icon: '▦' },
  { value: 'SECTION', label: 'Sección', icon: '§' },
  { value: 'FILE_UPLOAD', label: 'Archivo', icon: '📎', hidden: true },
  { value: 'SIGNATURE', label: 'Firma', icon: '✍️', hidden: true },
]

export const CHOICE_TYPES = new Set(['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'])
export const TEXT_TYPES = new Set(['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'URL'])
export const NUMERIC_RANGE_TYPES = new Set(['RATING', 'SCALE', 'NET_PROMOTER_SCORE'])

export function typeLabel(type: string): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type
}

/** SECTION is a heading / page break, not something the respondent answers. */
export function isAnswerable(type: string): boolean {
  return type !== 'SECTION'
}

const RANGE_DEFAULTS: Record<string, { min: number; max: number }> = {
  RATING: { min: 1, max: 5 },
  SCALE: { min: 0, max: 10 },
  NET_PROMOTER_SCORE: { min: 0, max: 10 },
}

/** Min/max for RATING, SCALE and NPS. NPS is always 0-10. */
export function getRange(q: QuestionLike): { min: number; max: number } {
  const def = RANGE_DEFAULTS[q.type] ?? { min: 0, max: 10 }
  if (q.type === 'NET_PROMOTER_SCORE') return def
  const min = toFiniteNumber(q.validation?.min) ?? def.min
  const max = toFiniteNumber(q.validation?.max) ?? def.max
  return min < max ? { min, max } : def
}

export function toFiniteNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** Options of a choice question, tolerating legacy shapes (JSON string, plain strings). */
export function getChoiceOptions(q: QuestionLike): ChoiceOption[] {
  let raw: unknown = q.options
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((o: any) =>
      typeof o === 'string'
        ? { label: o, value: o }
        : o && typeof o === 'object'
          ? { label: String(o.label ?? o.value ?? ''), value: String(o.value ?? o.label ?? '') }
          : null,
    )
    .filter((o): o is ChoiceOption => !!o && o.value !== '')
}

export function getMatrixOptions(q: QuestionLike): MatrixOptions {
  const raw: any = typeof q.options === 'string' ? safeParse(q.options) : q.options
  const norm = (list: unknown): ChoiceOption[] =>
    Array.isArray(list)
      ? list
          .map((o: any) => (typeof o === 'string' ? { label: o, value: o } : { label: String(o?.label ?? ''), value: String(o?.value ?? o?.label ?? '') }))
          .filter((o) => o.value !== '')
      : []
  return { rows: norm(raw?.rows), columns: norm(raw?.columns) }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

/** Stable value for a new option, so later label edits don't orphan stored answers. */
export function newOptionValue(): string {
  return `opt_${Math.random().toString(36).slice(2, 8)}`
}

/** Human-readable answer for admin views and exports (maps option values to labels). */
export function formatAnswer(q: QuestionLike, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (CHOICE_TYPES.has(q.type)) {
    const opts = getChoiceOptions(q)
    const label = (v: unknown) => opts.find((o) => o.value === v)?.label ?? String(v)
    return Array.isArray(value) ? value.map(label).join(', ') : label(value)
  }
  if (q.type === 'MATRIX' && typeof value === 'object' && !Array.isArray(value)) {
    const { rows, columns } = getMatrixOptions(q)
    return Object.entries(value as Record<string, unknown>)
      .map(([r, c]) => `${rows.find((x) => x.value === r)?.label ?? r}: ${columns.find((x) => x.value === c)?.label ?? c}`)
      .join('; ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
