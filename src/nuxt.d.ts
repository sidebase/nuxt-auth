import '@nuxt/nitro-server/augments'
import type { RenderResponse } from 'nitropack/types'

declare module '#app' {
  interface NuxtSSRContext {
    /** @deprecated Nuxt 4.3 renamed this field, but keeps runtime support until Nuxt 5. */
    _renderResponse?: Partial<RenderResponse>
  }
}
