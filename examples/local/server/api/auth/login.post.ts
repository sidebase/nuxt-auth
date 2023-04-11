const KNOWN_USERS = {
  jsmith: 'hunter2'
}

export default eventHandler(async (event) => {
  const { username, password } = await readBody(event)
  if (KNOWN_USERS[username] === password) {
    return 'success'
  }

  throw createError({ statusCode: 403 })
})
