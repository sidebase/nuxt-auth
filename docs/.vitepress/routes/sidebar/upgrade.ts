import type { DefaultTheme } from 'vitepress'

export const routes: DefaultTheme.SidebarItem[] = [
  {
    text: 'Versions',
    base: '/upgrade',
    items: [
      {
        text: 'Version 0.10.0',
        link: '/version-0.10.0'
      },
      {
        text: 'Version 0.9.0',
        link: '/version-0.9.0'
      },
      {
        text: 'Version 0.8.0',
        link: '/version-0.8.0'
      }
    ],
  },
]
