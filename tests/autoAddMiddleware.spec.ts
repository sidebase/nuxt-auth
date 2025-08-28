import { describe, expect, it } from 'vitest'
import { autoAddMiddleware } from '../src/build/autoAddMiddleware'
import type { NuxtPage } from '../src/build/autoAddMiddleware'

const MIDDLEWARE_NAME = 'sidebase-auth'

describe('setMiddleware', () => {
  it('adds middleware if meta.auth is true', () => {
    testMiddleware({ meta: { auth: true } }, [MIDDLEWARE_NAME])
  })

  it('adds middleware if meta.auth is object', () => {
    testMiddleware({ meta: { auth: {} } }, [MIDDLEWARE_NAME])
    testMiddleware({ meta: { auth: { navigateUnauthenticatedTo: '/' } } }, [MIDDLEWARE_NAME])
  })

  it('ignores pages without meta.auth', () => {
    testMiddleware({}, undefined)
    testMiddleware({ meta: {} }, undefined)
    testMiddleware({ meta: { foo: 'bar' } }, undefined)
    testMiddleware({ meta: { auth2: 'foo' } }, undefined)
    testMiddleware({ meta: { middleware: 'foo' } }, 'foo')
    testMiddleware({ meta: { middleware: ['foo'] } }, ['foo'])
    const middlewareFunction = () => {}
    testMiddleware({ meta: { middleware: middlewareFunction } }, middlewareFunction)
  })

  it('does not add when meta.auth is false', () => {
    testMiddleware({ meta: { auth: false } }, undefined)
  })

  it('does not add when middleware is already present', () => {
    testMiddleware(
      { meta: { auth: true, middleware: MIDDLEWARE_NAME } },
      MIDDLEWARE_NAME
    )
    testMiddleware(
      { meta: { auth: true, middleware: [MIDDLEWARE_NAME] } },
      [MIDDLEWARE_NAME]
    )
    testMiddleware(
      { meta: { auth: true, middleware: ['foo', MIDDLEWARE_NAME, 'bar'] } },
      ['foo', MIDDLEWARE_NAME, 'bar']
    )
    testMiddleware(
      { meta: { middleware: MIDDLEWARE_NAME } },
      MIDDLEWARE_NAME
    )
    testMiddleware(
      { meta: { middleware: [MIDDLEWARE_NAME] } },
      [MIDDLEWARE_NAME]
    )
    testMiddleware(
      { meta: { middleware: ['foo', MIDDLEWARE_NAME, 'bar'] } },
      ['foo', MIDDLEWARE_NAME, 'bar']
    )
  })

  it('adds to an existing array', () => {
    testMiddleware(
      { meta: { auth: true, middleware: [] } },
      [MIDDLEWARE_NAME]
    )
    testMiddleware(
      { meta: { auth: true, middleware: ['foo'] } },
      ['foo', MIDDLEWARE_NAME]
    )
  })

  it('wraps string middleware into array', () => {
    testMiddleware(
      { meta: { auth: true, middleware: 'foo' } },
      ['foo', MIDDLEWARE_NAME]
    )
  })

  it('overrides undefined', () => {
    testMiddleware(
      { meta: { auth: true, middleware: undefined } },
      [MIDDLEWARE_NAME]
    )
  })

  it('wraps other middleware options into array', () => {
    const functionMiddleware = () => {}
    testMiddleware(
      { meta: { auth: true, middleware: functionMiddleware } },
      [functionMiddleware, MIDDLEWARE_NAME]
    )
  })

  it('handles multiple pages', () => {
    const pages: NuxtPage[] = [
      { meta: { auth: true } },
      { meta: { auth: true, middleware: 'foo' } }
    ]

    autoAddMiddleware(pages, MIDDLEWARE_NAME)

    expect(pages[0].meta?.middleware).toEqual([MIDDLEWARE_NAME])
    expect(pages[1].meta?.middleware).toEqual(['foo', MIDDLEWARE_NAME])
  })

  it('handles nested children', () => {
    const pages: NuxtPage[] = [
      {
        meta: {},
        children: [
          { meta: { auth: true } }
        ]
      }
    ]

    autoAddMiddleware(pages, MIDDLEWARE_NAME)

    expect(pages[0].meta?.middleware).toBeUndefined()
    expect(pages[0].children?.[0].meta?.middleware).toEqual([MIDDLEWARE_NAME])
  })
})

/**
 * Helper: test a single-page scenario
 */
function testMiddleware(page: NuxtPage, expected: unknown) {
  const pages: NuxtPage[] = [page]
  autoAddMiddleware(pages, MIDDLEWARE_NAME)
  expect(pages[0].meta?.middleware).toEqual(expected)
}
