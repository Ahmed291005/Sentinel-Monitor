/**
 * src/utils/response.js
 * Standardized API response helpers.
 * Every controller uses these for consistent JSON structure.
 */

const ok = (res, data, message = 'Success', status = 200) => {
  return res.status(status).json({ success: true, message, data })
}

const created = (res, data, message = 'Created successfully') => {
  return res.status(201).json({ success: true, message, data })
}

const badRequest = (res, message = 'Bad request') => {
  return res.status(400).json({ success: false, error: message })
}

const unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({ success: false, error: message })
}

const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({ success: false, error: message })
}

const notFound = (res, message = 'Resource not found') => {
  return res.status(404).json({ success: false, error: message })
}

const serverError = (res, err) => {
  console.error('[API Error]', err?.message || err)
  return res.status(500).json({
    success: false,
    error: err?.message || 'Internal server error',
  })
}

module.exports = { ok, created, badRequest, unauthorized, forbidden, notFound, serverError }
