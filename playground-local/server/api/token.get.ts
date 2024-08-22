import { defineEventHandler } from 'h3'
import { getToken } from '#auth'

export default defineEventHandler(event => getToken(event))
