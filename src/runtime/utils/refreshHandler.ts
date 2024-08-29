import type { DefaultRefreshHandlerConfig, ModuleOptionsNormalized, RefreshHandler } from '../types'
import { useAuth, useRuntimeConfig } from '#imports'

export class DefaultRefreshHandler implements RefreshHandler {
  /** Result of `useAuth` composable, mostly used for session data/refreshing */
  auth?: ReturnType<typeof useAuth>

  /** Runtime config is mostly used for getting provider data */
  runtimeConfig?: ModuleOptionsNormalized

  /** Because passing `this.visibilityHandler` to `document.addEventHandler` loses `this` context */
  private boundVisibilityHandler: typeof this.visibilityHandler

  /** Maximum value for setTimeout & setInterval in JavaScript (~24.85 days) */
  private readonly MAX_JS_TIMEOUT: number = 2_147_483_647

  /** Timers for different refresh types */
  private refreshTimers: { [key: string]: ReturnType<typeof setTimeout> } = {}

  /** Reset interval times for periodic refresh, in milliseconds */
  private refreshIntervals: { [key: string]: number } = {}


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
      this.refreshIntervals['periodic'] = enablePeriodically === true ? defaultRefreshInterval : (enablePeriodically ?? defaultRefreshInterval)
      this.startRefreshTimer('periodic', this.refreshIntervals['periodic'])
    }

    // Set up refresh token timer, if applicable
    const provider = this.runtimeConfig.provider
    if (provider.type === 'local' && provider.refresh.isEnabled && provider.refresh.token?.maxAgeInSeconds) {
      this.refreshIntervals['maxAge'] = provider.refresh.token.maxAgeInSeconds * 1000
      this.startRefreshTimer('maxAge', this.refreshIntervals['maxAge'])
    }
  }

  /**
   * Cleans up timers and event listeners.
   */
  destroy(): void {
    // Clear visibility change listener
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler, false)

    // Clear refresh timers
    this.clearAllTimers()

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
   * @param {'periodic' | 'maxAge'} timerName - Identifies which timer to start.
   * @param {number} durationMs - The duration in milliseconds before the next refresh should occur.
   */
  private startRefreshTimer(timerName: 'periodic' | 'maxAge', durationMs: number): void {
    // Ensure the duration is positive; if not, exit early
    if (durationMs <= 0) {
      return
    }

    // Validate that the timerName is one of the allowed values
    if (!['periodic', 'maxAge'].includes(timerName)) {
      throw new Error(`Invalid timer name: ${timerName}`)
    }

    if (durationMs > this.MAX_JS_TIMEOUT) {
      // If the duration exceeds JavaScript's maximum timeout value:
      // Set a timeout for the maximum allowed duration, then recursively call
      // this method with the remaining time when that timeout completes.
      this.refreshTimers[timerName] = setTimeout(() => {
        this.startRefreshTimer(timerName, durationMs - this.MAX_JS_TIMEOUT)
      }, this.MAX_JS_TIMEOUT)
    }
    else {
      // If the duration is within the allowed range:
      // The refresh can be triggered and the timer can be reset.
      this.refreshTimers[timerName] = setTimeout(() => {
        // Determine which auth property to check based on the timer type
        const needsSessOrToken: 'data' | 'refreshToken' = timerName === 'periodic' ? 'data' : 'refreshToken'

        // Only refresh if the relevant auth data exists
        if (this.auth?.[needsSessOrToken].value) {
          this.auth.refresh()
        }

        // Restart timer with its original duration
        this.startRefreshTimer(timerName, this.refreshIntervals[timerName] ?? 0)
      }, durationMs)
    }
  }

  /**
   * Clears all active refresh timers.
   */
  private clearAllTimers(): void {
    Object.values(this.refreshTimers).forEach((timer) => {
      if (timer) {
        clearTimeout(timer)
      }
    })
  }
}
