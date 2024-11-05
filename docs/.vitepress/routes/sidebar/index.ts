import type { DefaultTheme } from 'vitepress'

import { routes as guideRoutes } from './guide'
import { routes as recipesRoutes } from './recipes'
import { routes as upgradeRoutes } from './upgrade'

export const routes: DefaultTheme.Config['sidebar'] = {
  '/guide': guideRoutes,
  '/recipes': recipesRoutes,
  '/upgrade': upgradeRoutes
}
