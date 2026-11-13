import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { syncTokenFromCookie } from '../src/runtime/composables/local/utils/syncTokenFromCookie'

describe('syncTokenFromCookie', () => {
  it('preserves matching cookie and auth state values', () => {
    const cookie = ref<string | null>('current-token')
    const state = ref<string | null>('current-token')
    const refreshCookie = vi.fn()

    syncTokenFromCookie(refreshCookie, 'auth-token', cookie, state)

    expect(refreshCookie).toHaveBeenCalledWith('auth-token')
    expect(state.value).toBe('current-token')
  })
})
