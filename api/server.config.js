/**
 * This file allows you to configure the Fastify Server settings
 * used by the RedwoodJS dev server.
 *
 * It also applies when running RedwoodJS with `yarn rw serve`.
 *
 * For the Fastify server options that you can set, see:
 * https://www.fastify.io/docs/latest/Reference/Server/#factory
 *
 * Examples include: logger settings, timeouts, maximum payload limits, and more.
 *
 * Note: This configuration does not apply in a serverless deploy.
 */

/** @type {import('fastify').FastifyServerOptions} */
const config = {
  requestTimeout: 15_000,
  bodyLimit: "1mb",
  logger: {
    // Note: If running locally using `yarn rw serve` you may want to adjust
    // the default non-development level to `info`
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  },
  exposeHeadRoutes: true,
}

module.exports = {
  config,
}
