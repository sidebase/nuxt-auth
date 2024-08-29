import type { DefaultRefreshHandlerConfig, ModuleOptionsNormalized, RefreshHandler } from '../types'
import { useAuth, useRuntimeConfig } from '#imports'

export class DefaultRefreshHandler implements RefreshHandler {
  /** Result of `useAuth` composable, mostly used for session data/refreshing */
  auth?: ReturnType<typeof useAuth>

  /** Runtime config is mostly used for getting provider data */
  runtimeConfig?: ModuleOptionsNormalized

  /** Timer for periodic refresh */
  refetchIntervalTimer?: ReturnType<typeof setInterval>

  /** Timer for refresh token renewal */
  // TODO: find more Generic method to start a Timer for the Refresh Token
  refreshTokenIntervalTimer?: ReturnType<typeof setInterval>

  /** Because passing `this.visibilityHandler` to `document.addEventHandler` loses `this` context */
  private boundVisibilityHandler: typeof this.visibilityHandler

  /** Maximum age of the refresh token, in milliseconds */
  private maxAgeMs?: number

  /** Interval time for periodic refresh, in milliseconds */
  private intervalTime?: number

  /** Maximum value for setTimeout & setInterval in JavaScript (~24.85 days) */
  private readonly MAX_JS_TIMEOUT: number = 2_147_483_647

  constructor(
    public config: DefaultRefreshHandlerConfig
  ) {
    this.boundVisibilityHandler = this.visibilityHandler.bind(this)
  }

  /**
   * Initializes the refresh handler, setting up timers and event listeners.
   */
  init(): void {
    this.runtimeConfig = useRuntimeConfig().public.auth
    this.auth = useAuth()

    // Set up visibility change listener
    document.addEventListener('visibilitychange', this.boundVisibilityHandler, false)

    const { enablePeriodically } = this.config
    const defaultRefreshInterval: number = 5 * 60 * 1000 // 5 minutes, in ms

    // Set up periodic refresh, if enabled
    if (enablePeriodically !== false) {
      this.intervalTime = enablePeriodically === true ? defaultRefreshInterval : (enablePeriodically ?? defaultRefreshInterval)
      this.startRefreshTimer(this.intervalTime, 'refetchIntervalTimer')
    }

    // Set up refresh token timer, if applicable
    const provider = this.runtimeConfig.provider
    if (provider.type === 'local' && provider.refresh.isEnabled && provider.refresh.token?.maxAgeInSeconds) {
      this.maxAgeMs = provider.refresh.token.maxAgeInSeconds * 1000
      this.startRefreshTimer(this.maxAgeMs, 'refreshTokenIntervalTimer')
    }
  }

  /**
   * Cleans up timers and event listeners.
   */
  destroy(): void {
    // Clear visibility change listener
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler, false)

    // Clear periodic refresh timer
    if (this.refetchIntervalTimer) {
      clearInterval(this.refetchIntervalTimer)
    }

    // Clear refresh token timer
    if (this.refreshTokenIntervalTimer) {
      clearInterval(this.refreshTokenIntervalTimer)
    }

    // Release state
    this.auth = undefined
    this.runtimeConfig = undefined
  }

  /**
   * Handles visibility changes, refreshing the session when the browser tab/page becomes visible.
   */
  visibilityHandler(): void {
    if (this.config?.enableOnWindowFocus && document.visibilityState === 'visible' && this.auth?.data.value) {
      this.auth.refresh()
    }
  }

  /**
   * Starts or restarts a refresh timer, handling large durations by breaking them into smaller intervals.
   * This method is used to periodically trigger the refresh.
   *
   * @param {number} durationMs - The duration in milliseconds before the next refresh should occur.
   * @param {'refetchIntervalTimer' | 'refreshTokenIntervalTimer'} timerName - Identifies which timer to start.
   */
  private startRefreshTimer(durationMs: number, timerName: 'refetchIntervalTimer' | 'refreshTokenIntervalTimer'): void {
    // Ensure the duration is positive; if not, exit early
    if (durationMs <= 0) {
      return
    }

    // Validate that the timerName is one of the allowed values
    if (!['refetchIntervalTimer', 'refreshTokenIntervalTimer'].includes(timerName)) {
      throw new Error(`Invalid timer name: ${timerName}`)
    }

    if (durationMs > this.MAX_JS_TIMEOUT) {
      // If the duration exceeds JavaScript's maximum timeout value:
      // Set a timeout for the maximum allowed duration, then recursively call
      // this method with the remaining time when that timeout completes.
      (this as any)[timerName] = setTimeout(() => {
        this.startRefreshTimer(durationMs - this.MAX_JS_TIMEOUT, timerName)
      }, this.MAX_JS_TIMEOUT)
    }
    else {
      // If the duration is within the allowed range:
      // The refresh can be triggered and the timer can be reset.
      (this as any)[timerName] = setTimeout(() => {
        // Determine which auth property to check based on the timer type
        const needsSessOrToken: 'data' | 'refreshToken' = timerName === 'refetchIntervalTimer' ? 'data' : 'refreshToken'

        // Only refresh if the relevant auth data exists
        if (this.auth?.[needsSessOrToken].value) {
          this.auth.refresh()
        }

        // Restart timer with its original duration
        const originalDuration: number = timerName === 'refetchIntervalTimer' ? this.intervalTime ?? 0 : this.maxAgeMs ?? 0
        this.startRefreshTimer(originalDuration, timerName)
      }, durationMs)
    }
  }
}
