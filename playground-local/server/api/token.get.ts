import { defineEventHandler } from 'h3'
import { getToken } from '#auth'

export default defineEventHandler((event) => {
  const token = getToken(event)
  return { token: token ?? null }
})
