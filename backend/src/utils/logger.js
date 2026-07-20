/**
 * src/utils/logger.js
 * Simple structured logger for the backend.
 */

const levels = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', DEBUG: 'DEBUG' }

function log(level, module, message, data = null) {
  const timestamp = new Date().toISOString()
  const prefix    = `[${timestamp}] [${level}] [${module}]`
  if (data) {
    console.log(`${prefix} ${message}`, data)
  } else {
    console.log(`${prefix} ${message}`)
  }
}

const logger = {
  info:  (mod, msg, data) => log(levels.INFO,  mod, msg, data),
  warn:  (mod, msg, data) => log(levels.WARN,  mod, msg, data),
  error: (mod, msg, data) => log(levels.ERROR, mod, msg, data),
  debug: (mod, msg, data) => {
    if (process.env.NODE_ENV === 'development') {
      log(levels.DEBUG, mod, msg, data)
    }
  },
}

module.exports = logger
