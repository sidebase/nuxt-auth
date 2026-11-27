import { computed, shallowReactive } from 'vue'
import type { Ref, WritableComputedRef } from 'vue'

/**
 * Browsers only guarantee 4096 bytes per cookie, which includes the name and its attributes.
 * The values mirror the chunking done by NextAuth/Auth.js.
 *
 * @see https://github.com/nextauthjs/next-auth/blob/v4/packages/next-auth/src/core/lib/cookie.ts
 */
const ALLOWED_COOKIE_SIZE = 4096
const ESTIMATED_EMPTY_COOKIE_SIZE = 163
export const COOKIE_CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE

/** Options for chunk cookies: values are stored pre-encoded, so they are written and read as-is */
export const RAW_COOKIE_CODEC = {
  encode: (value: string) => value,
  decode: (value: string) => value
}

export function getChunkCookieName(name: string, index: number): string {
  return `${name}.${index}`
}

export function splitIntoChunks(value: string, chunkSize = COOKIE_CHUNK_SIZE): string[] {
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += chunkSize) {
    chunks.push(value.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Creates a cookie with the given name.
 * - The main cookie (`isChunk: false`) must use the default cookie encoding;
 * - Chunk cookies (`isChunk: true`) must use {@link RAW_COOKIE_CODEC}.
 */
export type CookieFactory = (name: string, isChunk: boolean) => Ref<string | null | undefined>

/**
 * A cookie-backed ref which transparently splits values that do not fit into a single cookie.
 *
 * Values that fit are stored in the cookie `name` exactly like before.
 * Larger values are URI-encoded and stored across `name.0`, `name.1`, ... (like Auth.js does),
 * while the cookie `name` is removed. Chunks which are no longer needed get removed as well.
 */
export function createChunkedCookie(
  name: string,
  createCookie: CookieFactory,
  chunkSize = COOKIE_CHUNK_SIZE
): WritableComputedRef<string | null> {
  const mainCookie = createCookie(name, false)

  // Discover the chunks currently present
  const chunkCookies = shallowReactive<Ref<string | null | undefined>[]>([])
  while (true) {
    const chunkCookie = createCookie(getChunkCookieName(name, chunkCookies.length), true)
    if (!chunkCookie.value) {
      break
    }
    chunkCookies.push(chunkCookie)
  }

  function readChunks(): string | null {
    const parts: string[] = []
    for (const chunkCookie of chunkCookies) {
      if (!chunkCookie.value) {
        break
      }
      parts.push(chunkCookie.value)
    }
    if (parts.length === 0) {
      return null
    }

    try {
      return decodeURIComponent(parts.join(''))
    }
    catch {
      // Chunks are malformed (e.g. one of them is missing)
      return null
    }
  }

  function writeChunks(chunks: string[]) {
    while (chunkCookies.length < chunks.length) {
      chunkCookies.push(createCookie(getChunkCookieName(name, chunkCookies.length), true))
    }
    chunkCookies.forEach((chunkCookie, index) => {
      chunkCookie.value = chunks[index] ?? null
    })
  }

  return computed({
    get() {
      return mainCookie.value ?? readChunks()
    },
    set(value) {
      const encoded = value === null || value === undefined ? null : encodeURIComponent(value)

      if (encoded === null || encoded.length <= chunkSize) {
        mainCookie.value = value ?? null
        writeChunks([])
      }
      else {
        mainCookie.value = null
        writeChunks(splitIntoChunks(encoded, chunkSize))
      }
    }
  })
}
