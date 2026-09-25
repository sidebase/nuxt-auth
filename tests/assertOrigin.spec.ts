import { resolve } from 'node:path'
import { loadNuxt } from 'nuxt'
import { describe, expect, it } from 'vitest'

const playground = resolve(import.meta.dirname, '../playground-authjs')

describe.each([
  { trustHost: true, expected: false },
  { trustHost: false, expected: true }
])('assertOrigin with trustHost=$trustHost', ({ trustHost, expected }) => {
  it(`${expected ? 'registers' : 'skips'} the plugin`, async () => {
    const nuxt = await loadNuxt({
      cwd: playground,
      dev: false,
      ready: true,
      overrides: {
        auth: {
          provider: {
            type: 'authjs',
            trustHost
          }
        }
      }
    })

    try {
      const registered = nuxt.options.nitro.plugins?.some(plugin =>
        typeof plugin === 'string'
        && plugin.includes('/runtime/server/plugins/assertOrigin')
      ) ?? false

      expect(registered).toBe(expected)
    }
    finally {
      await nuxt.close()
    }
  })
})
