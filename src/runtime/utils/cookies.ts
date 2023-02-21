import { getResponseHeader, setResponseHeader } from 'h3'
import type { H3Event } from 'h3'

interface RawCookie {
  name: string
  value: string
  expiration?: Date
  raw: string
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F]/
const TERMINATORS = ['\n', '\r', '\0']
// eslint-disable-next-line no-control-regex
const DATE_DELIM = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/
const MONTH_TO_NUM: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
}

/**
 * @source https://github.com/salesforce/tough-cookie
 */
const trimTerminator = (str: string) => {
  for (let t = 0; t < TERMINATORS.length; t++) {
    const terminatorIdx = str.indexOf(TERMINATORS[t])
    if (terminatorIdx !== -1) {
      str = str.substring(0, terminatorIdx)
    }
  }

  return str
}

/**
 * @source https://github.com/salesforce/tough-cookie
 */
const parseCookiePair = (cookiePair: string) => {
  cookiePair = trimTerminator(cookiePair)

  const eqIdx = cookiePair.indexOf('=')
  if (eqIdx <= 0) {
    return
  }

  const name = cookiePair.substring(0, eqIdx).trim()
  const value = cookiePair.substring(eqIdx + 1).trim()
  if (CONTROL_CHARS.test(name) || CONTROL_CHARS.test(value)) {
    return
  }

  return [name, value]
}

/**
 * @source https://github.com/salesforce/tough-cookie
 */
const parseDigits = (token: string, minDigits: number, maxDigits: number, trailingOK: boolean) => {
  let count = 0
  while (count < token.length) {
    const c = token.charCodeAt(count)
    if (c <= 0x2F || c >= 0x3A) {
      break
    }
    count++
  }

  if (count < minDigits || count > maxDigits) {
    return null
  }

  if (!trailingOK && count !== token.length) {
    return null
  }

  return parseInt(token.substring(0, count), 10)
}

/**
 * @source https://github.com/salesforce/tough-cookie
 */
const parseTime = (token: string) => {
  const parts = token.split(':')
  const result = [0, 0, 0]
  if (parts.length !== 3) {
    return null
  }

  for (let i = 0; i < 3; i++) {
    const num = parseDigits(parts[i], 1, 2, i === 2)
    if (num === null) {
      return null
    }

    result[i] = num
  }

  return result
}

/**
 * @source https://github.com/salesforce/tough-cookie
 */
const parseMonth = (token: string) => {
  token = String(token)
    .substring(0, 3)
    .toLowerCase()

  if (!(token in MONTH_TO_NUM)) {
    return null
  }

  return MONTH_TO_NUM[token]
}

/**
 * @source https://github.com/salesforce/tough-cookie
 */
const parseDate = (str: string) => {
  if (!str) {
    return
  }

  const tokens = str.split(DATE_DELIM)
  if (!tokens) {
    return
  }

  let hour = null
  let minute = null
  let second = null
  let dayOfMonth = null
  let month = null
  let year = null

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim()
    if (!token.length) {
      continue
    }

    let result

    if (second === null) {
      result = parseTime(token)
      if (result) {
        hour = result[0]
        minute = result[1]
        second = result[2]
        continue
      }
    }

    if (dayOfMonth === null) {
      result = parseDigits(token, 1, 2, true)
      if (result !== null) {
        dayOfMonth = result
        continue
      }
    }

    if (month === null) {
      result = parseMonth(token)
      if (result !== null) {
        month = result
        continue
      }
    }

    if (year === null) {
      result = parseDigits(token, 2, 4, true)
      if (result !== null) {
        year = result
        if (year >= 70 && year <= 99) {
          year += 1900
        } else if (year >= 0 && year <= 69) {
          year += 2000
        }
      }
    }
  }

  if (
    dayOfMonth === null ||
    month === null ||
    year === null ||
    hour === null ||
    minute === null ||
    second === null ||
    dayOfMonth < 1 ||
    dayOfMonth > 31 ||
    year < 1601 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return
  }

  return new Date(Date.UTC(year, month, dayOfMonth, hour, minute, second))
}

/**
 * @source https://github.com/salesforce/tough-cookie
 */
const parseRawCookie = (str: string) => {
  str = str.trim()
  if (!str) {
    return
  }

  const firstSemi = str.indexOf(';')
  const cookiePair = firstSemi === -1 ? str : str.substring(0, firstSemi)
  const c = parseCookiePair(cookiePair)
  if (!c) {
    return
  }

  const cookie: RawCookie = {
    name: c[0],
    value: c[1],
    raw: str
  }

  if (firstSemi === -1) {
    return cookie
  }

  const unparsed = str.slice(firstSemi + 1).trim()
  if (unparsed.length === 0) {
    return cookie
  }

  const cookieAVS = unparsed.split(';')
  while (cookieAVS.length) {
    const av = cookieAVS.shift()!.trim()
    if (av.length === 0) {
      continue
    }

    const avSep = av.indexOf('=')
    if (avSep === -1) {
      continue
    }

    const avValue = av.substring(avSep + 1).trim()
    if (!avValue) {
      continue
    }

    const avKey = av.substring(0, avSep).trim().toLowerCase()

    switch (avKey) {
      case 'expires':
        cookie.expiration = parseDate(avValue)
        break

      case 'max-age':
        if (/^-?[0-9]+$/.test(avValue)) {
          cookie.expiration = new Date(Date.now() + parseInt(avValue, 10) * 1000)
        }
        break
    }
  }

  return cookie
}

/**
 * @source https://github.com/nfriedly/set-cookie-parser/blob/master/lib/set-cookie.js
 *
 * Set-Cookie header field-values are sometimes comma joined in one string. This splits them without choking on commas
 * that are within a single set-cookie field-value, such as in the Expires portion.
 * This is uncommon, but explicitly allowed - see https://tools.ietf.org/html/rfc2616#section-4.2
 * Node.js does this for every header *except* set-cookie - see https://github.com/nodejs/node/blob/d5e363b77ebaf1caf67cd7528224b651c86815c1/lib/_http_incoming.js#L128
 * React Native's fetch does this for *every* header, including set-cookie.
 *
 * Based on: https://github.com/google/j2objc/commit/16820fdbc8f76ca0c33472810ce0cb03d20efe25
 * Credits to: https://github.com/tomball for original and https://github.com/chrusart for JavaScript implementation
 */
const splitCookiesString = (cookiesString: string) => {
  if (!cookiesString) {
    return []
  }

  const cookiesStrings: string[] = []

  let pos = 0
  let start
  let ch
  let lastComma
  let nextStart
  let cookiesSeparatorFound

  function skipWhitespace () {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1
    }
    return pos < cookiesString.length
  }

  function notSpecialChar () {
    ch = cookiesString.charAt(pos)

    return ch !== '=' && ch !== ';' && ch !== ','
  }

  while (pos < cookiesString.length) {
    start = pos
    cookiesSeparatorFound = false

    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos)
      if (ch === ',') {
        // ',' is a cookie separator if we have later first '=', not ';' or ','
        lastComma = pos
        pos += 1

        skipWhitespace()
        nextStart = pos

        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1
        }

        // currently special character
        if (pos < cookiesString.length && cookiesString.charAt(pos) === '=') {
          // we found cookies separator
          cookiesSeparatorFound = true
          // pos is inside the next cookie, so back up and return it.
          pos = nextStart
          cookiesStrings.push(cookiesString.substring(start, lastComma))
          start = pos
        } else {
          // in param ',' or param separator ';',
          // we continue from that comma
          pos = lastComma + 1
        }
      } else {
        pos += 1
      }
    }

    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length))
    }
  }

  return cookiesStrings
}

export const parseSetCookieHeaders = (headers: Headers, filter?: (cookie: RawCookie) => boolean) => {
  const setCookieHeader = headers.get('set-cookie')
  if (!setCookieHeader) {
    return []
  }

  return splitCookiesString(setCookieHeader).flatMap((setCookieValue) => {
    const cookie = parseRawCookie(setCookieValue)
    if (!cookie || filter?.(cookie) === false) {
      return []
    }

    return cookie
  })
}

export const getResponseCookies = (event: H3Event, filter?: (cookie: RawCookie) => boolean) => {
  const header = getResponseHeader(event, 'set-cookie')

  if (typeof header === 'string') {
    const cookie = parseRawCookie(header)
    if (!cookie || filter?.(cookie) === false) {
      return []
    }

    return [cookie]
  }

  if (Array.isArray(header)) {
    return header.flatMap((h) => {
      const cookie = parseRawCookie(h)
      if (!cookie || filter?.(cookie) === false) {
        return []
      }

      return cookie
    })
  }

  return []
}

export const addResponseCookies = (event: H3Event, cookies: RawCookie[]) => {
  // Merge existing response cookies with new cookies
  const newCookies = getResponseCookies(event, (cookie) => {
    return !cookies.some(c => c.name === cookie.name)
  }).concat(cookies)

  setResponseHeader(event, 'set-cookie', newCookies.map(cookie => cookie.raw))
}

export const parseCookieHeader = (header?: string, filter?: (cookie: RawCookie) => boolean): RawCookie[] => {
  if (!header) {
    return []
  }

  return header.split(';').flatMap((value) => {
    const cookie = parseRawCookie(value)
    if (!cookie || filter?.(cookie) === false) {
      return []
    }

    return cookie
  })
}
