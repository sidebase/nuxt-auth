import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { Ref } from 'vue'
import { COOKIE_CHUNK_SIZE, createChunkedCookie, splitIntoChunks } from '../src/runtime/composables/local/utils/chunkedCookie'

const NAME = 'auth.token'
const CHUNK_SIZE = 10

/**
 * In-memory cookie jar, mimicking `useCookie`: one ref per name, `null` deletes the cookie.
 * Main cookie values are stored decoded, chunk values are stored raw.
 */
function createJar(initial: Record<string, string> = {}) {
  const jar = new Map<string, string>(Object.entries(initial))

  function createCookie(name: string): Ref<string | null | undefined> {
    const cookie = ref<string | null | undefined>(jar.get(name) ?? null)
    return {
      get value() {
        return cookie.value
      },
      set value(value) {
        cookie.value = value
        if (value === null || value === undefined) {
          jar.delete(name)
        }
        else {
          jar.set(name, value)
        }
      }
    } as Ref<string | null | undefined>
  }

  return { jar, createCookie }
}

describe('splitIntoChunks', () => {
  it('splits into chunks of the given size', () => {
    expect(splitIntoChunks('abcdefg', 3)).toEqual(['abc', 'def', 'g'])
    expect(splitIntoChunks('abc', 3)).toEqual(['abc'])
    expect(splitIntoChunks('', 3)).toEqual([])
  })

  it('uses a chunk size that keeps each cookie within the 4096 bytes limit', () => {
    expect(COOKIE_CHUNK_SIZE).toBeLessThan(4096)
    expect(COOKIE_CHUNK_SIZE).toBeGreaterThan(3000)
  })
})

describe('createChunkedCookie', () => {
  it('stores short values in a single cookie', () => {
    const { jar, createCookie } = createJar()
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    cookie.value = 'short'

    expect(Object.fromEntries(jar)).toEqual({ [NAME]: 'short' })
    expect(cookie.value).toBe('short')
  })

  it('splits long values across several cookies', () => {
    const { jar, createCookie } = createJar()
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    const value = 'a-value-which-is-too-long'
    cookie.value = value

    expect(Object.fromEntries(jar)).toEqual({
      [`${NAME}.0`]: 'a-value-wh',
      [`${NAME}.1`]: 'ich-is-too',
      [`${NAME}.2`]: '-long'
    })
    expect(cookie.value).toBe(value)
  })

  it('chunks the URI-encoded value and decodes it when reading', () => {
    const { jar, createCookie } = createJar()
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    const value = 'ünïcödé and spaces'
    cookie.value = value

    expect(jar.has(NAME)).toBe(false)
    expect([...jar.keys()]).toHaveLength(Math.ceil(encodeURIComponent(value).length / CHUNK_SIZE))
    expect(cookie.value).toBe(value)
  })

  it('reads chunks that already exist (e.g. from the request)', () => {
    const { createCookie } = createJar({
      [`${NAME}.0`]: 'first-',
      [`${NAME}.1`]: 'second-',
      [`${NAME}.2`]: 'third'
    })
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    expect(cookie.value).toBe('first-second-third')
  })

  it('reads an existing single cookie', () => {
    const { createCookie } = createJar({ [NAME]: 'single' })
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    expect(cookie.value).toBe('single')
  })

  it('removes stale chunks when the value shrinks', () => {
    const { jar, createCookie } = createJar()
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    cookie.value = 'x'.repeat(CHUNK_SIZE * 3)
    expect(jar.size).toBe(3)

    cookie.value = 'y'.repeat(CHUNK_SIZE + 1)
    expect(Object.fromEntries(jar)).toEqual({
      [`${NAME}.0`]: 'y'.repeat(CHUNK_SIZE),
      [`${NAME}.1`]: 'y'
    })

    cookie.value = 'short'
    expect(Object.fromEntries(jar)).toEqual({ [NAME]: 'short' })
  })

  it('removes the single cookie when the value grows', () => {
    const { jar, createCookie } = createJar({ [NAME]: 'short' })
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    cookie.value = 'z'.repeat(CHUNK_SIZE * 2)

    expect(jar.has(NAME)).toBe(false)
    expect(jar.size).toBe(2)
    expect(cookie.value).toBe('z'.repeat(CHUNK_SIZE * 2))
  })

  it('removes all cookies when cleared', () => {
    const { jar, createCookie } = createJar({
      [`${NAME}.0`]: 'first-',
      [`${NAME}.1`]: 'second'
    })
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    cookie.value = null

    expect(jar.size).toBe(0)
    expect(cookie.value).toBeNull()
  })

  it('returns null for malformed chunks', () => {
    const { createCookie } = createJar({ [`${NAME}.0`]: 'broken%E' })
    const cookie = createChunkedCookie(NAME, createCookie, CHUNK_SIZE)

    expect(cookie.value).toBeNull()
  })
})
