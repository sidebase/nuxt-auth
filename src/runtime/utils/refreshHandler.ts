import type { DefaultRefreshHandlerConfig, ModuleOptionsNormalized, RefreshHandler } from '../types'
import { useAuth, useRuntimeConfig } from '#imports'

export class DefaultRefreshHandler implements RefreshHandler {
  /** Result of `useAuth` composable, mostly used for session data/refreshing */
  auth?: ReturnType<typeof useAuth>

  /** Runtime config is mostly used for getting provider data */
  runtimeConfig?: ModuleOptionsNormalized

  /** Refetch interval */
  refetchIntervalTimer?: ReturnType<typeof setInterval>

  // TODO: find more Generic method to start a Timer for the Refresh Token
  /** Refetch interval for local/refresh schema */
  refreshTokenIntervalTimer?: ReturnType<typeof setInterval>

  /** Because passing `this.visibilityHandler` to `document.addEventHandler` loses `this` context */
  private boundVisibilityHandler: typeof this.visibilityHandler

  constructor(
    public config: DefaultRefreshHandlerConfig
  ) {
    this.boundVisibilityHandler = this.visibilityHandler.bind(this)
  }

  init(): void {
    this.runtimeConfig = useRuntimeConfig().public.auth
    this.auth = useAuth()

    document.addEventListener('visibilitychange', this.boundVisibilityHandler, false)

    const { enablePeriodically } = this.config

    if (enablePeriodically !== false && enablePeriodically !== undefined) {
      const intervalTime = enablePeriodically === true ? 1000 : safeTimerDelay(enablePeriodically)

      this.refetchIntervalTimer = setInterval(() => {
        if (this.auth?.data.value) {
          this.auth.refresh()
        }
      }, intervalTime)
    }

    const provider = this.runtimeConfig.provider
    if (provider.type === 'local' && provider.refresh.isEnabled && provider.refresh.token?.maxAgeInSeconds) {
      const intervalTime = safeTimerDelay(provider.refresh.token.maxAgeInSeconds * 1000)

      this.refreshTokenIntervalTimer = setInterval(() => {
        if (this.auth?.refreshToken.value) {
          this.auth.refresh()
        }
      }, intervalTime)
    }
  }

  destroy(): void {
    // Clear visibility handler
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler, false)

    // Clear refetch interval
    clearInterval(this.refetchIntervalTimer)

    // Clear refetch interval
    if (this.refreshTokenIntervalTimer) {
      clearInterval(this.refreshTokenIntervalTimer)
    }

    // Release state
    this.auth = undefined
    this.runtimeConfig = undefined
  }

  visibilityHandler(): void {
    // Listen for when the page is visible, if the user switches tabs
    // and makes our tab visible again, re-fetch the session, but only if
    // this feature is not disabled.
    if (this.config?.enableOnWindowFocus && document.visibilityState === 'visible' && this.auth?.data.value) {
      this.auth.refresh()
    }
  }
}

// Fix for https://github.com/sidebase/nuxt-auth/issues/1014
// See https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval#return_value
const MAX_SAFE_INTERVAL_MS = 2147483647
function safeTimerDelay(milliseconds: number): number {
  return Math.min(milliseconds, MAX_SAFE_INTERVAL_MS)
}
