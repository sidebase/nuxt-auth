import type { DefaultTheme } from 'vitepress'

export const routes: DefaultTheme.SidebarItem[] = [
  {
    text: 'Introduction',
    base: '/recipes/introduction',
    items: [
      {
        text: 'Welcome',
        link: '/welcome',
      },
      {
        text: 'Adding your recipe',
        link: '/adding-your-recipe',
      }
    ],
  },
  {
    text: 'Official',
    base: '/recipes/official',
    items: [
      {
        text: 'Mocking with Vitest',
        link: '/mocking-with-vitest',
      },
    ],
  },
  {
    text: 'Community',
    base: '/recipes/community',
    items: [
      {
        text: 'Strapi',
        link: '/strapi'
      },
      {
        text: 'Directus',
        link: '/directus',
      },
      {
        text: 'Laravel Passport',
        link: '/laravel-passport'
      }
    ],
  },
]
