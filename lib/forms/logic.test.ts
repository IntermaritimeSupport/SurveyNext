import { describe, expect, it } from 'vitest'
import { evaluateCondition, getLogic, paginate, visibleQuestionIds } from './logic'

const q = (id: string, order: number, type = 'TEXT', logic?: unknown) => ({ id, order, type, logic })

describe('getLogic', () => {
  it('ignores missing or malformed rules', () => {
    expect(getLogic({})).toBeNull()
    expect(getLogic({ logic: { showIf: [{ questionId: '', op: 'eq' }] } })).toBeNull()
    expect(getLogic({ logic: { showIf: [{ questionId: 'a', op: 'hack' }] } })).toBeNull()
    expect(getLogic({ logic: { showIf: [{ questionId: 'a', op: 'eq', value: 'x' }] } })?.match).toBe('all')
  })
})

describe('evaluateCondition', () => {
  it('compares single answers case-insensitively and numbers numerically', () => {
    expect(evaluateCondition({ questionId: 'a', op: 'eq', value: 'opt_si' }, 'opt_si')).toBe(true)
    expect(evaluateCondition({ questionId: 'a', op: 'eq', value: 'Panamá' }, ' panamá ')).toBe(true)
    expect(evaluateCondition({ questionId: 'a', op: 'eq', value: 7 }, '7')).toBe(true)
    expect(evaluateCondition({ questionId: 'a', op: 'gt', value: 6 }, 9)).toBe(true)
    expect(evaluateCondition({ questionId: 'a', op: 'lt', value: 7 }, 9)).toBe(false)
  })
  it('handles checkboxes and matrix with includes', () => {
    expect(evaluateCondition({ questionId: 'a', op: 'includes', value: 's2' }, ['s1', 's2'])).toBe(true)
    expect(evaluateCondition({ questionId: 'a', op: 'not_includes', value: 's3' }, ['s1'])).toBe(true)
    expect(evaluateCondition({ questionId: 'a', op: 'includes', value: 'c1' }, { r1: 'c1' })).toBe(true)
  })
  it('treats empty answers sensibly', () => {
    expect(evaluateCondition({ questionId: 'a', op: 'answered' }, '')).toBe(false)
    expect(evaluateCondition({ questionId: 'a', op: 'not_answered' }, undefined)).toBe(true)
    expect(evaluateCondition({ questionId: 'a', op: 'eq', value: 'x' }, undefined)).toBe(false)
    expect(evaluateCondition({ questionId: 'a', op: 'neq', value: 'x' }, undefined)).toBe(true)
    expect(evaluateCondition({ questionId: 'a', op: 'gt', value: 1 }, 'abc')).toBe(false)
  })
})

describe('visibleQuestionIds', () => {
  const questions = [
    q('nps', 1, 'NET_PROMOTER_SCORE'),
    q('why', 2, 'TEXTAREA', { showIf: [{ questionId: 'nps', op: 'lt', value: 7 }] }),
    q('detail', 3, 'TEXT', { showIf: [{ questionId: 'why', op: 'answered' }] }),
    q('sec', 4, 'SECTION', { showIf: [{ questionId: 'nps', op: 'gt', value: 8 }] }),
    q('promo1', 5),
    q('sec2', 6, 'SECTION'),
    q('end', 7),
  ]
  it('shows follow-ups only when their condition holds', () => {
    const v = visibleQuestionIds(questions, { nps: 3, why: 'slow' })
    expect([...v]).toEqual(['nps', 'why', 'detail', 'sec2', 'end'])
  })
  it('cascades: a hidden question counts as unanswered downstream', () => {
    const v = visibleQuestionIds(questions, { nps: 9, why: 'stale answer from before' })
    expect(v.has('why')).toBe(false)
    expect(v.has('detail')).toBe(false)
  })
  it('hides every question of a hidden section until the next section', () => {
    expect(visibleQuestionIds(questions, { nps: 9 }).has('promo1')).toBe(true)
    expect(visibleQuestionIds(questions, { nps: 5 }).has('promo1')).toBe(false)
  })
  it('supports "any" matching and Map answers', () => {
    const qs = [q('a', 1), q('b', 2), q('c', 3, 'TEXT', { match: 'any', showIf: [{ questionId: 'a', op: 'eq', value: 'x' }, { questionId: 'b', op: 'eq', value: 'y' }] })]
    expect(visibleQuestionIds(qs, new Map([['b', 'y']])).has('c')).toBe(true)
    expect(visibleQuestionIds(qs, new Map()).has('c')).toBe(false)
  })
})

describe('paginate', () => {
  it('keeps the old behaviour without sections', () => {
    expect(paginate(Array.from({ length: 5 }, (_, i) => q(`q${i}`, i)))).toHaveLength(1)
    expect(paginate(Array.from({ length: 12 }, (_, i) => q(`q${i}`, i))).map((p) => p.length)).toEqual([10, 2])
  })
  it('starts a new page at every section', () => {
    const pages = paginate([q('intro', 1), q('s1', 2, 'SECTION'), q('a', 3), q('s2', 4, 'SECTION'), q('b', 5)])
    expect(pages.map((p) => p.map((x) => x.id))).toEqual([['intro'], ['s1', 'a'], ['s2', 'b']])
  })
})
