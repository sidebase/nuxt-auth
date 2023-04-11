import { parseURL } from 'ufo'

export const isProduction = process.env.NODE_ENV === 'production'

export const getOriginAndPathnameFromURL = (url: string) => {
  const { protocol, host, pathname } = parseURL(url)

  let origin
  if (host && protocol) {
    origin = `${protocol}//${host}`
  }

  const pathname_ = pathname.length > 0 ? pathname : undefined
  return {
    origin,
    pathname: pathname_
  }
}
