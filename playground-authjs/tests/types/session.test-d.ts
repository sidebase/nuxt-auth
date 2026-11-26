import { expectTypeOf, test } from 'vitest'
import { useAuth, useAuthState } from '#imports'
import { getServerSession, getToken, NuxtAuthHandler } from '#auth'
import type { H3Event } from 'h3'

// Vitest typechecks .test-d.ts files without executing their test bodies.
// https://vitest.dev/guide/testing-types.html
test('AuthJS session augmentation reaches client composables', async () => {
  const auth = useAuth()
  const state = useAuthState()

  expectTypeOf(auth.data.value?.user?.username).toEqualTypeOf<string | undefined>()
  expectTypeOf(state.data.value?.user?.username).toEqualTypeOf<string | undefined>()

  const session = await auth.getSession()
  expectTypeOf(session?.user?.username).toEqualTypeOf<string | undefined>()

  // Missing field should have `never` type
  type SessionUser = NonNullable<NonNullable<typeof auth.data.value>['user']>
  expectTypeOf<Extract<'missingField', keyof SessionUser>>().toBeNever()
})

test('User, Account and JWT augmentations reach handler callbacks', () => {
  NuxtAuthHandler({
    providers: [],
    callbacks: {
      jwt({ token, user, account }) {
        if (user) {
          expectTypeOf(user.username).toEqualTypeOf<string | undefined>()

          // Check that augmented User fields can be persisted in the JWT
          token.username = user.username

          // Missing field should have `never` type
          expectTypeOf<Extract<'missingField', keyof typeof user>>().toBeNever()
        }

        if (account) {
          expectTypeOf(account.tenantId).toEqualTypeOf<string | undefined>()
        }

        return token
      },
      session({ session, token }) {
        expectTypeOf(token.username).toEqualTypeOf<string | undefined>()
        if (session.user) {
          // Check that augmented JWT fields can be exposed in the session
          session.user.username = token.username
        }

        return session
      }
    }
  })
})

test('server helpers preserve Session and JWT augmentation', async () => {
  const event = {} as H3Event
  const session = await getServerSession(event)
  const token = await getToken({ event })

  expectTypeOf(session?.user?.username).toEqualTypeOf<string | undefined>()
  expectTypeOf(token?.username).toEqualTypeOf<string | undefined>()
})
