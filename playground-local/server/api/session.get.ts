import { defineEventHandler } from 'h3'
import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  return { session: session ?? null }
})
