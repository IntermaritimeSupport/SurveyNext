// How to label a response in the admin UI now that there are no fixed respondent columns.
type AnswerLike = { value: unknown; question?: { type?: string; order?: number } | null }
type ResponseLike = {
  email?: string | null
  user?: { name?: string | null; email?: string | null } | null
  answers?: AnswerLike[] | null
}

/**
 * Name: the answer to the form's first question when it is a TEXT question
 * (usually "Nombre" / "Full Name"), else the account name, else the email.
 * Detail: the email, when it isn't already used as the name.
 */
export function getParticipant(resp: ResponseLike): { name: string; detail: string | null } {
  const answers = [...(resp.answers ?? [])].sort(
    (a, b) => (a.question?.order ?? Infinity) - (b.question?.order ?? Infinity),
  )
  const first = answers[0]
  const firstText =
    first?.question?.type === 'TEXT' && typeof first.value === 'string' && first.value.trim() !== ''
      ? first.value.trim()
      : null

  const email = resp.email || resp.user?.email || null
  const name = firstText || resp.user?.name || email || 'Anónimo'
  return { name, detail: email && email !== name ? email : null }
}
