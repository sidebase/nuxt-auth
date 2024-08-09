import { createError, type H3Event } from 'h3'
import getURL from 'requrl'
import { joinURL } from 'ufo'
import { jsonPointerGet, useTypedBackendConfig } from '../../../helpers'
import { getToken } from './getToken'

// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
import { useRuntimeConfig } from '#imports'

function joinPathToApiURL (event: H3Event, path: string) {
  const { origin, pathname, fullBaseUrl } = useRuntimeConfig().public.auth.computed

  let baseURL
  if (origin) {
    // Case 1: An origin was supplied by the developer in the runtime-config. Use it by returning the already assembled full base url that contains it
    baseURL = fullBaseUrl
  } else {
    // Case 2: An origin was not supplied, we determine it from the request
    const determinedOrigin = getURL(event.node.req, false)
    baseURL = joinURL(determinedOrigin, pathname)
  }

  const base = path.startsWith('/') ? pathname : baseURL
  return joinURL(base, path)
}

export async function getServerSession (event: H3Event): Promise<SessionData | null> {
  const token = getToken(event)
  if (!token) {
    return null
  }

  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const { path, method } = config.endpoints.getSession

  // Compose heads to request the session
  const headers = new Headers(token ? { [config.token.headerName]: token } as HeadersInit : undefined)

  try {
    const url = joinPathToApiURL(event, path)
    const result = await $fetch<any>(url, { method, headers })
    const { dataResponsePointer: sessionDataResponsePointer } = config.session
    return jsonPointerGet<SessionData>(result, sessionDataResponsePointer)
  } catch (err) {
    console.error(err)
    throw createError({ statusCode: 401, statusMessage: 'Session could not be retrieved.' })
  }
}
