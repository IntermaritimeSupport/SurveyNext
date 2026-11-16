// Answer validation shared by the public form (client) and the responses API (server),
// so both sides always accept and reject exactly the same answers.
import {
  getChoiceOptions,
  getMatrixOptions,
  getRange,
  toFiniteNumber,
  type QuestionLike,
} from './question-types'

export type ValidationResult = { ok: true; value: unknown } | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s().-]{6,20}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isEmptyAnswer(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0)
  )
}

const ok = (value: unknown): ValidationResult => ({ ok: true, value })
const fail = (error: string): ValidationResult => ({ ok: false, error })

/**
 * Validates one answer and returns the normalized value to store
 * (numbers as numbers, trimmed strings, null for empty optional answers).
 */
export function validateAnswer(q: QuestionLike, raw: unknown): ValidationResult {
  if (q.type === 'SECTION') return ok(null)

  if (isEmptyAnswer(raw)) {
    return q.required ? fail('This question is required.') : ok(null)
  }

  const v = q.validation ?? {}

  switch (q.type) {
    case 'TEXT':
    case 'TEXTAREA':
    case 'EMAIL':
    case 'PHONE':
    case 'URL': {
      if (typeof raw !== 'string') return fail('The answer must be text.')
      const s = raw.trim()
      const minLength = toFiniteNumber(v.minLength)
      const maxLength = toFiniteNumber(v.maxLength)
      if (minLength !== undefined && s.length < minLength) return fail(`Minimum ${minLength} characters.`)
      if (maxLength !== undefined && s.length > maxLength) return fail(`Maximum ${maxLength} characters.`)
      if (q.type === 'EMAIL' && !EMAIL_RE.test(s)) return fail('Please enter a valid email.')
      if (q.type === 'PHONE' && !PHONE_RE.test(s)) return fail('Please enter a valid phone number.')
      if (q.type === 'URL' && !isUrl(s)) return fail('Please enter a valid URL (https://...).')
      if (typeof v.pattern === 'string' && v.pattern) {
        let re: RegExp | null = null
        try {
          re = new RegExp(v.pattern)
        } catch {
          re = null // an invalid pattern configured by an admin must not block respondents
        }
        if (re && !re.test(s)) return fail(v.patternMessage || 'The answer does not have the expected format.')
      }
      return ok(s)
    }

    case 'NUMBER': {
      const n = toFiniteNumber(raw)
      if (n === undefined) return fail('Must be a valid number.')
      const min = toFiniteNumber(v.min)
      const max = toFiniteNumber(v.max)
      if (min !== undefined && n < min) return fail(`Minimum value is ${min}.`)
      if (max !== undefined && n > max) return fail(`Maximum value is ${max}.`)
      if (v.integer && !Number.isInteger(n)) return fail('Must be a whole number.')
      return ok(n)
    }

    case 'RATING':
    case 'SCALE':
    case 'NET_PROMOTER_SCORE': {
      const n = toFiniteNumber(raw)
      const { min, max } = getRange(q)
      if (n === undefined || !Number.isInteger(n)) return fail('Please select a value.')
      if (n < min || n > max) return fail(`Must be between ${min} and ${max}.`)
      return ok(n)
    }

    case 'DATE': {
      if (typeof raw !== 'string' || !DATE_RE.test(raw) || isNaN(new Date(raw).getTime())) {
        return fail('Invalid date (YYYY-MM-DD).')
      }
      if (typeof v.minDate === 'string' && v.minDate && raw < v.minDate) return fail(`Date cannot be before ${v.minDate}.`)
      if (typeof v.maxDate === 'string' && v.maxDate && raw > v.maxDate) return fail(`Date cannot be after ${v.maxDate}.`)
      return ok(raw)
    }

    case 'TIME': {
      if (typeof raw !== 'string' || !TIME_RE.test(raw)) return fail('Invalid time (HH:mm).')
      if (typeof v.minTime === 'string' && v.minTime && raw < v.minTime) return fail(`Time cannot be before ${v.minTime}.`)
      if (typeof v.maxTime === 'string' && v.maxTime && raw > v.maxTime) return fail(`Time cannot be after ${v.maxTime}.`)
      return ok(raw)
    }

    case 'MULTIPLE_CHOICE':
    case 'DROPDOWN': {
      const opts = getChoiceOptions(q)
      if (typeof raw !== 'string' || !opts.some((o) => o.value === raw)) return fail('The selected option is invalid.')
      return ok(raw)
    }

    case 'CHECKBOXES': {
      if (!Array.isArray(raw)) return fail('Please select one or more options.')
      const valid = new Set(getChoiceOptions(q).map((o) => o.value))
      const unique = [...new Set(raw)]
      if (!unique.every((x) => typeof x === 'string' && valid.has(x))) return fail('One or more selected options are invalid.')
      const minSel = toFiniteNumber(v.minSelections)
      const maxSel = toFiniteNumber(v.maxSelections)
      if (minSel !== undefined && unique.length < minSel) return fail(`Please select at least ${minSel} options.`)
      if (maxSel !== undefined && unique.length > maxSel) return fail(`Please select at most ${maxSel} options.`)
      return ok(unique)
    }

    case 'MATRIX': {
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fail('Invalid answer.')
      const { rows, columns } = getMatrixOptions(q)
      const rowSet = new Set(rows.map((r) => r.value))
      const colSet = new Set(columns.map((c) => c.value))
      const out: Record<string, string> = {}
      for (const [r, c] of Object.entries(raw as Record<string, unknown>)) {
        if (!rowSet.has(r) || typeof c !== 'string' || !colSet.has(c)) return fail('Invalid answer.')
        out[r] = c
      }
      if (q.required && rows.some((r) => !(r.value in out))) return fail('Please answer every row.')
      return ok(out)
    }

    case 'FILE_UPLOAD':
    case 'SIGNATURE':
      return fail('This question type is not available yet.')

    default:
      return fail('Unsupported question type.')
  }
}

function isUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
