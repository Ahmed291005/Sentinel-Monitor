require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const morgan     = require('morgan')
const rateLimit  = require('express-rate-limit')

const { getPool }           = require('../database/connection')
const ruleEngineService     = require('./services/RuleEngineService')

const authRoutes       = require('./routes/auth.routes')
const eventRoutes      = require('./routes/events.routes')
const ruleRoutes       = require('./routes/rules.routes')
const actionRoutes     = require('./routes/actions.routes')
const logRoutes        = require('./routes/logs.routes')
const simulationRoutes = require('./routes/simulation.routes')
const userRoutes       = require('./routes/users.routes')
const agentRoutes      = require('./routes/agent.routes')
const monitorRoutes    = require('./routes/monitor.routes')
const analyticsRoutes  = require('./routes/analytics.routes')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ 
  origin: function (origin, callback) {
    callback(null, true) // Allow any origin for testing
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'Accept', 'X-Requested-With']
}))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { error: 'Too many requests.' } }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    project:   'Sentinel',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    engine:    ruleEngineService.getStatus(),
  })
})

app.use('/api/auth',       authRoutes)
app.use('/api/events',     eventRoutes)
app.use('/api/rules',      ruleRoutes)
app.use('/api/actions',    actionRoutes)
app.use('/api/logs',       logRoutes)
app.use('/api/simulation', simulationRoutes)
app.use('/api/users',      userRoutes)
app.use('/api/agent',      agentRoutes)
app.use('/api/monitor',    monitorRoutes)
app.use('/api/analytics',  analyticsRoutes)

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

app.use((err, req, res, next) => {
  console.error('[Error]', err.message)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

async function startServer() {
  try {
    await getPool()
    ruleEngineService.start()
    app.listen(PORT, () => {
      console.log('')
      console.log('██████████████████████████████████████████')
      console.log('  SENTINEL — Autonomous Rule Intelligence')
      console.log('██████████████████████████████████████████')
      console.log(`  API     → http://localhost:${PORT}/api`)
      console.log(`  Health  → http://localhost:${PORT}/api/health`)
      console.log(`  Monitor → http://localhost:${PORT}/api/monitor/metrics`)
      console.log('██████████████████████████████████████████')
    })
  } catch (err) {
    console.error('[Server] Failed to start:', err.message)
    process.exit(1)
  }
}

startServer()
module.exports = app
