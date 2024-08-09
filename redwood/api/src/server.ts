import { createServer } from '@redwoodjs/api-server'

import { logger } from 'src/lib/logger'

async function main() {
  const server = await createServer({
    logger,
    configureApiServer: (server) => {
      server.addContentTypeParser(
        /application\/pgp-.*/g,
        (_, payload, done) => {
          done(null, payload)
        }
      )
    },
  })

  await server.start()
}

main()
