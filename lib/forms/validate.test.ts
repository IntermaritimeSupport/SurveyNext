import { describe, expect, it } from 'vitest'
import { validateAnswer, isEmptyAnswer } from './validate'
import { formatAnswer, getRange, getChoiceOptions } from './question-types'

const q = (type: string, extra: Record<string, any> = {}) => ({ type, required: false, options: null, validation: null, ...extra })
const okValue = (r: ReturnType<typeof validateAnswer>) => {
  expect(r.ok).toBe(true)
  return r.ok ? r.value : undefined
}
const errorOf = (r: ReturnType<typeof validateAnswer>) => {
  expect(r.ok).toBe(false)
  return r.ok ? '' : r.error
}

describe('required / empty', () => {
  it('treats empty strings, arrays and objects as empty', () => {
    for (const v of [undefined, null, '', '   ', [], {}]) expect(isEmptyAnswer(v)).toBe(true)
    expect(isEmptyAnswer(0)).toBe(false)
  })
  it('rejects empty required answers and stores null for empty optional ones', () => {
    expect(errorOf(validateAnswer(q('TEXT', { required: true }), ' '))).toMatch(/required/)
    expect(okValue(validateAnswer(q('TEXT'), ''))).toBeNull()
  })
  it('never requires an answer for SECTION', () => {
    expect(okValue(validateAnswer(q('SECTION', { required: true }), undefined))).toBeNull()
  })
})

describe('text types', () => {
  it('trims and applies length limits', () => {
    expect(okValue(validateAnswer(q('TEXT'), '  hola  '))).toBe('hola')
    expect(errorOf(validateAnswer(q('TEXT', { validation: { minLength: 5 } }), 'abc'))).toMatch(/Minimum 5/)
    expect(errorOf(validateAnswer(q('TEXTAREA', { validation: { maxLength: 3 } }), 'abcd'))).toMatch(/Maximum 3/)
  })
  it('validates email, phone and url', () => {
    expect(validateAnswer(q('EMAIL'), 'a@b.co').ok).toBe(true)
    expect(validateAnswer(q('EMAIL'), 'nope').ok).toBe(false)
    expect(validateAnswer(q('PHONE'), '+507 6123-4567').ok).toBe(true)
    expect(validateAnswer(q('PHONE'), 'abc').ok).toBe(false)
    expect(validateAnswer(q('URL'), 'https://x.org').ok).toBe(true)
    expect(validateAnswer(q('URL'), 'javascript:alert(1)').ok).toBe(false)
  })
  it('applies a pattern but ignores an invalid one', () => {
    expect(validateAnswer(q('TEXT', { validation: { pattern: '^IMO\\d{7}$' } }), 'IMO1234567').ok).toBe(true)
    expect(validateAnswer(q('TEXT', { validation: { pattern: '^IMO\\d{7}$' } }), 'X').ok).toBe(false)
    expect(validateAnswer(q('TEXT', { validation: { pattern: '([' } }), 'anything').ok).toBe(true)
  })
})

describe('numbers and ranges', () => {
  it('normalizes numeric strings and enforces min/max/integer', () => {
    expect(okValue(validateAnswer(q('NUMBER'), '42'))).toBe(42)
    expect(validateAnswer(q('NUMBER'), 'x').ok).toBe(false)
    expect(validateAnswer(q('NUMBER', { validation: { min: 0 } }), -1).ok).toBe(false)
    expect(validateAnswer(q('NUMBER', { validation: { integer: true } }), 1.5).ok).toBe(false)
  })
  it('uses the same RATING default (1-5) everywhere', () => {
    expect(getRange(q('RATING'))).toEqual({ min: 1, max: 5 })
    expect(validateAnswer(q('RATING'), 5).ok).toBe(true)
    expect(validateAnswer(q('RATING'), 6).ok).toBe(false)
    expect(validateAnswer(q('RATING'), 0).ok).toBe(false)
  })
  it('allows a 0 minimum (no falsy-zero bug) and falls back on an inverted range', () => {
    expect(getRange(q('SCALE', { validation: { min: 0, max: 4 } }))).toEqual({ min: 0, max: 4 })
    expect(getRange(q('SCALE', { validation: { min: 9, max: 2 } }))).toEqual({ min: 0, max: 10 })
  })
  it('fixes NPS to 0-10 integers', () => {
    expect(getRange(q('NET_PROMOTER_SCORE', { validation: { min: 1, max: 3 } }))).toEqual({ min: 0, max: 10 })
    expect(validateAnswer(q('NET_PROMOTER_SCORE'), 0).ok).toBe(true)
    expect(validateAnswer(q('NET_PROMOTER_SCORE'), 7.5).ok).toBe(false)
  })
})

describe('dates and times', () => {
  it('validates format and limits', () => {
    expect(validateAnswer(q('DATE'), '2026-11-16').ok).toBe(true)
    expect(validateAnswer(q('DATE'), '16/11/2026').ok).toBe(false)
    expect(validateAnswer(q('DATE', { validation: { minDate: '2026-12-01' } }), '2026-11-16').ok).toBe(false)
    expect(validateAnswer(q('TIME'), '09:30').ok).toBe(true)
    expect(validateAnswer(q('TIME', { validation: { maxTime: '17:00' } }), '18:00').ok).toBe(false)
  })
})

describe('choices', () => {
  const opts = [{ label: 'Sí', value: 'opt_si' }, { label: 'No', value: 'opt_no' }]
  it('accepts only configured values', () => {
    expect(validateAnswer(q('MULTIPLE_CHOICE', { options: opts }), 'opt_si').ok).toBe(true)
    expect(validateAnswer(q('DROPDOWN', { options: opts }), 'Sí').ok).toBe(false)
  })
  it('dedupes checkboxes and enforces selection limits', () => {
    expect(okValue(validateAnswer(q('CHECKBOXES', { options: opts }), ['opt_si', 'opt_si']))).toEqual(['opt_si'])
    expect(validateAnswer(q('CHECKBOXES', { options: opts, validation: { minSelections: 2 } }), ['opt_si']).ok).toBe(false)
  })
  it('reads legacy options stored as strings or JSON', () => {
    expect(getChoiceOptions(q('DROPDOWN', { options: JSON.stringify(['A', 'B']) }))).toEqual([
      { label: 'A', value: 'A' },
      { label: 'B', value: 'B' },
    ])
  })
})

describe('matrix', () => {
  const options = {
    rows: [{ label: 'Rapidez', value: 'r1' }, { label: 'Trato', value: 'r2' }],
    columns: [{ label: 'Mal', value: 'c1' }, { label: 'Bien', value: 'c2' }],
  }
  it('accepts valid cells and requires every row when required', () => {
    expect(validateAnswer(q('MATRIX', { options }), { r1: 'c2' }).ok).toBe(true)
    expect(errorOf(validateAnswer(q('MATRIX', { options, required: true }), { r1: 'c2' }))).toMatch(/every row/)
    expect(validateAnswer(q('MATRIX', { options }), { r9: 'c1' }).ok).toBe(false)
  })
  it('formats answers with labels', () => {
    expect(formatAnswer(q('MATRIX', { options }), { r1: 'c2', r2: 'c1' })).toBe('Rapidez: Bien; Trato: Mal')
  })
})

describe('hidden types', () => {
  it('rejects answers to FILE_UPLOAD and SIGNATURE until they are implemented', () => {
    expect(validateAnswer(q('FILE_UPLOAD'), { fileName: 'a.pdf' }).ok).toBe(false)
  })
})
