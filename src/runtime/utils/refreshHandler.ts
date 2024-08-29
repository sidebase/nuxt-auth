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

  /** Maximum age of the refresh token, in milliseconds */
  private maxAgeMs?: number

  /** Maximum JS value for setTimeout & setInterval (~24.85 days) */
  private readonly MAX_JS_TIMEOUT = 2_147_483_647

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
    const defaultRefreshInterval = 5 * 60 * 1000 // 5 minutes, in ms

    if (enablePeriodically !== false) {
      const intervalTime = enablePeriodically === true ? defaultRefreshInterval : enablePeriodically
      this.refetchIntervalTimer = setInterval(() => {
        if (this.auth?.data.value) {
          this.auth.refresh()
        }
      }, intervalTime)
    }

    const provider = this.runtimeConfig.provider
    if (provider.type === 'local' && provider.refresh.isEnabled && provider.refresh.token?.maxAgeInSeconds) {
      this.maxAgeMs = provider.refresh.token.maxAgeInSeconds * 1000
      this.startRefreshTimer(this.maxAgeMs)
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

  /**
   * Starts the refresh timer, breaking down large intervals
   * into smaller chunks, to avoid overflow issues.
   *
   * @param durationMs - Duration, in milliseconds.
   */
  private startRefreshTimer(durationMs: number): void {
    // Validate duration.
    if (durationMs <= 0) {
      return
    }

    if (durationMs > this.MAX_JS_TIMEOUT) {
      // Postpone for max value, when the interval exceeds it.
      // It will continue with the remaining time.
      this.refreshTokenIntervalTimer = setTimeout(() => {
        const remainingDurationMs = durationMs - this.MAX_JS_TIMEOUT
        this.startRefreshTimer(remainingDurationMs)
      }, this.MAX_JS_TIMEOUT)
    }
    else {
      // Perform refresh for a safe duration
      // and reset its timer to the original value.
      this.refreshTokenIntervalTimer = setTimeout(() => {
        if (this.auth?.refreshToken.value) {
          this.auth.refresh()
        }

        // Restart the timer to its original value.
        this.startRefreshTimer(this.maxAgeMs ?? 0)
      }, durationMs)
    }
  }
}
