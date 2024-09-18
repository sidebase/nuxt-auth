import type { RefreshHandler } from '../../'

// You may also use a plain object with `satisfies RefreshHandler`, of course!
class CustomRefreshHandler implements RefreshHandler {
  init(): void {
    console.info('Use the full power of classes to customize refreshHandler!')
  }

  destroy(): void {
    console.info(
      'Hover above class properties or go to their definition '
      + 'to learn more about how to craft a refreshHandler'
    )
  }
}

export default new CustomRefreshHandler()
