import type { RefreshHandlerConfig, RefreshHandler } from '../types'
import { useRuntimeConfig, useAuth, useAuthState } from '#imports'

interface DefaultRefreshHandler extends RefreshHandler {
    config?: RefreshHandlerConfig
    refetchIntervalTimer?: ReturnType<typeof setInterval>
    refreshTokenIntervalTimer?: ReturnType<typeof setInterval>
    visibilityHandler(): void
}

const defaultRefreshHandler: DefaultRefreshHandler = {
  // Session configuration keep this for reference
  config: undefined,

  // Refetch interval
  refetchIntervalTimer: undefined,

  // TODO: find more Generic method to start a Timer for the Refresh Token
  // Refetch interval for local/refresh schema
  refreshTokenIntervalTimer: undefined,

  visibilityHandler () {
    // Listen for when the page is visible, if the user switches tabs
    // and makes our tab visible again, re-fetch the session, but only if
    // this feature is not disabled.
    if (this.config?.enableRefreshOnWindowFocus && document.visibilityState === 'visible') {
      useAuth().getSession()
    }
  },

  init (config: RefreshHandlerConfig): void {
    this.config = config

    const runtimeConfig = useRuntimeConfig().public.auth

    const { data } = useAuthState()
    const { getSession } = useAuth()

    document.addEventListener('visibilitychange', this.visibilityHandler, false)

    const { enableRefreshPeriodically } = config

    if (enableRefreshPeriodically !== false) {
      const intervalTime =
        enableRefreshPeriodically === true ? 1000 : enableRefreshPeriodically
      this.refetchIntervalTimer = setInterval(() => {
        if (data.value) {
          getSession()
        }
      }, intervalTime)
    }

    if (runtimeConfig.provider.type === 'refresh') {
      const intervalTime = runtimeConfig.provider.token.maxAgeInSeconds! * 1000
      const { refresh, refreshToken } = useAuth()

      this.refreshTokenIntervalTimer = setInterval(() => {
        if (refreshToken.value) {
          refresh()
        }
      }, intervalTime)
    }
  },

  destroy (): void {
    // Clear visibility handler
    document.removeEventListener('visibilitychange', this.visibilityHandler, false)

    // Clear refetch interval
    clearInterval(this.refetchIntervalTimer)

    // Clear refetch interval
    if (this.refreshTokenIntervalTimer) {
      clearInterval(this.refreshTokenIntervalTimer)
    }
  }
}

export default defaultRefreshHandler
