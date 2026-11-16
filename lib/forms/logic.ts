// Conditional logic ("show this question if …") and page layout, shared by the public
// form and the responses API so both agree on which questions a respondent must answer.
import { isEmptyAnswer } from './validate'

export type LogicOp = 'eq' | 'neq' | 'includes' | 'not_includes' | 'gt' | 'lt' | 'answered' | 'not_answered'

export interface LogicCondition {
  questionId: string
  op: LogicOp
  value?: unknown
}

export interface QuestionLogic {
  match: 'all' | 'any'
  showIf: LogicCondition[]
}

export interface LogicQuestion {
  id: string
  type: string
  order: number
  logic?: unknown
}

export const LOGIC_OPS: { value: LogicOp; label: string; needsValue: boolean }[] = [
  { value: 'eq', label: 'es igual a', needsValue: true },
  { value: 'neq', label: 'no es igual a', needsValue: true },
  { value: 'includes', label: 'incluye', needsValue: true },
  { value: 'not_includes', label: 'no incluye', needsValue: true },
  { value: 'gt', label: 'es mayor que', needsValue: true },
  { value: 'lt', label: 'es menor que', needsValue: true },
  { value: 'answered', label: 'está respondida', needsValue: false },
  { value: 'not_answered', label: 'no está respondida', needsValue: false },
]

const OPS = new Set(LOGIC_OPS.map((o) => o.value))

/** Parses Question.logic defensively; returns null when there is no usable rule. */
export function getLogic(q: { logic?: unknown }): QuestionLogic | null {
  const raw: any = q.logic
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.showIf)) return null
  const showIf = raw.showIf.filter(
    (c: any) => c && typeof c.questionId === 'string' && c.questionId && OPS.has(c.op),
  ) as LogicCondition[]
  if (showIf.length === 0) return null
  return { match: raw.match === 'any' ? 'any' : 'all', showIf }
}

export function evaluateCondition(cond: LogicCondition, answer: unknown): boolean {
  const empty = isEmptyAnswer(answer)
  switch (cond.op) {
    case 'answered':
      return !empty
    case 'not_answered':
      return empty
  }
  if (empty) return cond.op === 'neq' || cond.op === 'not_includes'

  const target = cond.value
  switch (cond.op) {
    case 'eq':
      return looseEqual(answer, target)
    case 'neq':
      return !looseEqual(answer, target)
    case 'includes':
      return includes(answer, target)
    case 'not_includes':
      return !includes(answer, target)
    case 'gt':
    case 'lt': {
      const a = Number(answer)
      const b = Number(target)
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false
      return cond.op === 'gt' ? a > b : a < b
    }
    default:
      return false
  }
}

function looseEqual(answer: unknown, target: unknown): boolean {
  if (Array.isArray(answer)) return answer.length === 1 && String(answer[0]) === String(target)
  if (typeof answer === 'number' || typeof target === 'number') return Number(answer) === Number(target)
  return String(answer).trim().toLowerCase() === String(target ?? '').trim().toLowerCase()
}

function includes(answer: unknown, target: unknown): boolean {
  if (Array.isArray(answer)) return answer.map(String).includes(String(target))
  if (answer && typeof answer === 'object') return Object.values(answer).map(String).includes(String(target))
  return String(answer).toLowerCase().includes(String(target ?? '').toLowerCase())
}

/**
 * Which questions are visible given the current answers. Questions are processed in order:
 * a hidden question counts as unanswered for later conditions, and a hidden SECTION hides
 * every question until the next SECTION.
 */
export function visibleQuestionIds<Q extends LogicQuestion>(
  questions: Q[],
  answers: Map<string, unknown> | Record<string, unknown>,
): Set<string> {
  const get = (id: string) => (answers instanceof Map ? answers.get(id) : answers[id])
  const ordered = [...questions].sort((a, b) => a.order - b.order)
  const visible = new Set<string>()
  let sectionHidden = false

  for (const q of ordered) {
    const logic = getLogic(q)
    let shown = true
    if (logic) {
      const results = logic.showIf.map((c) => evaluateCondition(c, visible.has(c.questionId) ? get(c.questionId) : undefined))
      shown = logic.match === 'any' ? results.some(Boolean) : results.every(Boolean)
    }
    if (q.type === 'SECTION') {
      sectionHidden = !shown
      if (shown) visible.add(q.id)
      continue
    }
    if (shown && !sectionHidden) visible.add(q.id)
  }
  return visible
}

/**
 * Splits questions into pages. With SECTION questions, each SECTION starts a new page.
 * Without them, the previous behaviour is kept: one page up to `threshold` questions,
 * otherwise pages of `perPage`.
 */
export function paginate<Q extends { type: string; order: number }>(questions: Q[], perPage = 10, threshold = 5): Q[][] {
  const ordered = [...questions].sort((a, b) => a.order - b.order)
  if (ordered.length === 0) return []
  if (ordered.some((q) => q.type === 'SECTION')) {
    const pages: Q[][] = []
    for (const q of ordered) {
      if (q.type === 'SECTION' || pages.length === 0) pages.push([])
      pages[pages.length - 1].push(q)
    }
    return pages.filter((p) => p.length > 0)
  }
  if (ordered.length <= threshold) return [ordered]
  const pages: Q[][] = []
  for (let i = 0; i < ordered.length; i += perPage) pages.push(ordered.slice(i, i + perPage))
  return pages
}
