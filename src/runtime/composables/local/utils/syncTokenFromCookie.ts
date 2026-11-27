import type { Ref } from 'vue'

export function syncTokenFromCookie(
  refreshCookie: (name: string) => void,
  cookieName: string,
  cookie: Ref<string | null>,
  state: Ref<string | null>
): void {
  refreshCookie(cookieName)
  state.value = cookie.value
}
