import { defineEventHandler } from 'h3'
import { getServerSession } from '#auth'

export default defineEventHandler(event => getServerSession(event))
