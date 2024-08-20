import type { DefaultTheme } from 'vitepress'

import { routes as guideRoutes } from './guide'
import { routes as recipesRoutes } from './recipes'

export const routes: DefaultTheme.Config['sidebar'] = {
  '/guide': guideRoutes,
  '/recipes': recipesRoutes
}
