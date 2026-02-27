/* eslint-disable react-hooks/rules-of-hooks */
import type {
  DefaultRefreshHandlerConfig,
  RefreshHandler,
} from '../../shared/types'
import { useAuth } from '#imports'

export class DefaultRefreshHandler implements RefreshHandler {
  /** Result of `useAuth` composable, mostly used for session data/refreshing */
  auth?: ReturnType<typeof useAuth>

  /** Refetch interval */
  refetchIntervalTimer?: ReturnType<typeof setInterval>

  /** Because passing `this.visibilityHandler` to `document.addEventHandler` loses `this` context */
  private boundVisibilityHandler: typeof this.visibilityHandler

  constructor(public config: DefaultRefreshHandlerConfig) {
    this.boundVisibilityHandler = this.visibilityHandler.bind(this)
  }

  init(): void {
    this.auth = useAuth()

    document.addEventListener(
      'visibilitychange',
      this.boundVisibilityHandler,
      false,
    )

    const { enablePeriodically } = this.config

    if (enablePeriodically !== false && enablePeriodically !== undefined) {
      const intervalTime =
        enablePeriodically === true ? 1000 : safeTimerDelay(enablePeriodically)

      this.refetchIntervalTimer = setInterval(() => {
        if (this.auth?.data.value) {
          void this.auth.refresh()
        }
      }, intervalTime)
    }
  }

  destroy(): void {
    // Clear visibility handler
    document.removeEventListener(
      'visibilitychange',
      this.boundVisibilityHandler,
      false,
    )

    // Clear refetch interval
    clearInterval(this.refetchIntervalTimer)

    // Release state
    this.auth = undefined
  }

  visibilityHandler(): void {
    // Listen for when the page is visible, if the user switches tabs
    // and makes our tab visible again, re-fetch the session, but only if
    // this feature is not disabled.
    if (
      this.config?.enableOnWindowFocus &&
      document.visibilityState === 'visible' &&
      this.auth?.data.value
    ) {
      void this.auth.refresh()
    }
  }
}

// Fix for https://github.com/zitadel/nuxt-auth/issues/1014
// See https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval#return_value
const MAX_SAFE_INTERVAL_MS = 2147483647
function safeTimerDelay(milliseconds: number): number {
  return Math.min(milliseconds, MAX_SAFE_INTERVAL_MS)
}
