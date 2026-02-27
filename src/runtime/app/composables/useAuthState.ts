import type { Session } from '@auth/core/types'
import type { CommonUseAuthStateReturn } from '../../shared/types'
import { makeCommonAuthState } from './commonAuthState'

/**
 * The session data structure returned by Auth.js. This type is imported
 * directly from `@auth/core/types` and represents the authenticated user's
 * session information.
 *
 * A typical session object contains user information (name, email, image),
 * an expiration timestamp, and any additional data you've configured in
 * your Auth.js callbacks. The exact shape depends on your Auth.js
 * configuration and the session callback you've defined.
 *
 * @example
 * A typical session object structure:
 * ```ts
 * {
 *   user: {
 *     name: "John Doe",
 *     email: "john@example.com",
 *     image: "https://example.com/avatar.jpg"
 *   },
 *   expires: "2024-01-15T10:30:00.000Z"
 * }
 * ```
 *
 * @see {@link https://authjs.dev/getting-started/session-management} for
 *      details on customizing session data
 */
export type SessionData = Session

/**
 * The return type of the useAuthState composable. This type provides access
 * to the reactive authentication state without the action methods available
 * in useAuth. It includes the session data, loading state, last refresh
 * timestamp, and a computed authentication status.
 *
 * All properties are reactive Vue refs or computed properties, allowing you
 * to use them directly in templates or watch them for changes.
 */
export type UseAuthStateReturn = CommonUseAuthStateReturn<SessionData>

/**
 * A low-level composable that provides direct access to the authentication
 * state without the action methods (signIn, signOut, etc.) available in
 * useAuth. This composable is useful when you only need to read the current
 * authentication status without performing any authentication actions.
 *
 * The state returned by this composable is shared across your application.
 * When authentication status changes (through signIn, signOut, or session
 * refresh), all components using this composable will automatically update.
 *
 * This composable uses Nuxt's useState under the hood to maintain state
 * across server-side rendering and client-side hydration. The session data
 * fetched on the server is automatically transferred to the client, avoiding
 * unnecessary duplicate requests.
 *
 * For most use cases, you should use useAuth instead, which provides both
 * the state and the action methods. Use useAuthState when you need a lighter
 * alternative that doesn't include the signIn/signOut functionality, such as
 * in components that only display authentication status.
 *
 * @returns An object containing reactive authentication state properties
 *
 * @example
 * Displaying user information in a header component:
 * ```vue
 * <script setup>
 * const { data, status } = useAuthState()
 *
 * const userName = computed(() => data.value?.user?.name ?? 'Guest')
 * const isLoading = computed(() => status.value === 'loading')
 * </script>
 *
 * <template>
 *   <header>
 *     <span v-if="isLoading">Loading...</span>
 *     <span v-else>Hello, {{ userName }}</span>
 *   </header>
 * </template>
 * ```
 *
 * @example
 * Watching for authentication changes:
 * ```ts
 * const { status } = useAuthState()
 *
 * watch(status, (newStatus, oldStatus) => {
 *   if (oldStatus === 'authenticated' && newStatus === 'unauthenticated') {
 *     console.log('User has been logged out')
 *     navigateTo('/login')
 *   }
 * })
 * ```
 *
 * @example
 * Accessing the raw loading state for custom loading indicators:
 * ```ts
 * const { loading, lastRefreshedAt } = useAuthState()
 *
 * // Show a loading spinner while fetching session
 * const showSpinner = computed(() => loading.value)
 *
 * // Display when the session was last refreshed
 * const lastUpdate = computed(() => {
 *   if (!lastRefreshedAt.value) return 'Never'
 *   return lastRefreshedAt.value.toLocaleTimeString()
 * })
 * ```
 *
 * @see `useAuth` for the full authentication composable with action methods
 * @see {@link SessionData} for the structure of the session object
 */
export function useAuthState(): UseAuthStateReturn {
  return makeCommonAuthState<SessionData>()
}
