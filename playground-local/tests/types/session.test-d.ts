import { expectTypeOf, test } from 'vitest'
import { useAuth, useAuthState } from '#imports'

// Vitest typechecks .test-d.ts files without executing their test bodies.
// https://vitest.dev/guide/testing-types.html
test('local session data includes imported backend fields', async () => {
  const auth = useAuth()
  const state = useAuthState()

  expectTypeOf(auth.data.value?.userRole).toEqualTypeOf<'admin' | 'user' | undefined>()
  expectTypeOf(state.data.value?.userRole).toEqualTypeOf<'admin' | 'user' | undefined>()

  const session = await auth.getSession()
  expectTypeOf(session?.userRole).toEqualTypeOf<'admin' | 'user' | undefined>()

  // Missing field should have `never` type
  expectTypeOf<Extract<'missingField', keyof NonNullable<typeof auth.data.value>>>().toBeNever()
})
