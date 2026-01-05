import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import routes from './routes/index.js'
import { errorHandler } from './middleware/error.middleware.js'

const app = express()

// Middleware
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const isDev = (process.env.NODE_ENV || 'development') !== 'production'
const allowedOrigins = Array.from(new Set([...configuredOrigins]))

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (no Origin header)
      if (!origin) return callback(null, true)

      // In dev, allow any localhost/127.0.0.1 port (Vite may auto-switch ports)
      if (isDev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) return callback(null, true)

      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.use('/api', routes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

export default app

