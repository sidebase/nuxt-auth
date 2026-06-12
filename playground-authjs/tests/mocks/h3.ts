import { defu } from 'defu'
import type { H3Event } from 'h3'

// Adapted from https://22.frenchintelligence.org/2025/07/03/a-developers-guide-to-unit-testing-nuxt-3-server-routes/
export const createMockH3Event = (
  partialEvent: Partial<H3Event> & {
    body?: Record<string, any>
    params?: Record<string, any>
    query?: Record<string, any>
  }
): H3Event => {
  const event = {
    node: {
      req: {
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      },
    },
    context: {
      params: partialEvent.params || {},
      query: partialEvent.query || {},
    },
    // Our mock readBody function will look for this property
    _requestBody: partialEvent.body,
  } as unknown as H3Event

  // Deeply merge the partial event to allow for overrides
  return defu(event, partialEvent) as H3Event
}
