import type { DefaultRefreshHandlerConfig, RefreshHandler, ModuleOptionsNormalized } from '../types'
import { useRuntimeConfig, useAuth } from '#imports'

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

  constructor (
    public config: DefaultRefreshHandlerConfig
  ) {
    this.boundVisibilityHandler = this.visibilityHandler.bind(this)
  }

  init (): void {
    this.runtimeConfig = useRuntimeConfig().public.auth
    this.auth = useAuth()

    document.addEventListener('visibilitychange', this.boundVisibilityHandler, false)

    const { enablePeriodically } = this.config

    if (enablePeriodically !== false) {
      const intervalTime = enablePeriodically === true ? 1000 : enablePeriodically
      this.refetchIntervalTimer = setInterval(() => {
        if (this.auth?.data.value) {
          this.auth.refresh()
        }
      }, intervalTime)
    }

    if (this.runtimeConfig.provider.type === 'refresh') {
      const intervalTime = this.runtimeConfig.provider.token.maxAgeInSeconds! * 1000

      this.refreshTokenIntervalTimer = setInterval(() => {
        if (this.auth?.refreshToken.value) {
          this.auth.refresh()
        }
      }, intervalTime)
    }
  }

  destroy (): void {
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

  visibilityHandler (): void {
    // Listen for when the page is visible, if the user switches tabs
    // and makes our tab visible again, re-fetch the session, but only if
    // this feature is not disabled.
    if (this.config?.enableOnWindowFocus && document.visibilityState === 'visible') {
      this.auth?.refresh()
    }
  }
}
