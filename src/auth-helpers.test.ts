import { describe, expect, it } from 'vitest'
import { isEmailIdentifier, isValidUsername } from './auth-helpers'

describe('account identifiers', () => {
  it('recognizes email sign-in without mistaking a username for an email', () => {
    expect(isEmailIdentifier('person@example.com')).toBe(true)
    expect(isEmailIdentifier('person.name')).toBe(false)
  })

  it('allows the documented unique username characters only', () => {
    expect(isValidUsername('razin.dev-1')).toBe(true)
    expect(isValidUsername('no spaces')).toBe(false)
    expect(isValidUsername('ab')).toBe(false)
  })
})
