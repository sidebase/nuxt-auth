/**
 * Safely extract the `url` returned by the authjs handler when `json: true` is requested.
 *
 * The response data may be missing, e.g. when the request failed due to a network error
 * and the swallowed fetch error carries no `data`, or when the handler responded with a non-JSON body.
 *
 * @see https://github.com/sidebase/nuxt-auth/issues/823
 */
export function extractRedirectUrl(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined
  }

  const url = (data as { url?: unknown }).url
  return typeof url === 'string' && url.length > 0 ? url : undefined
}
