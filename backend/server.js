import dotenv from 'dotenv'
import app from './app.js'
import connectDB from './config/db.js'

// Load environment variables
dotenv.config()

const PORT = process.env.PORT || 5000

// Connect to MongoDB
connectDB()

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
  console.log(`📍 Server URL: http://localhost:${PORT}`)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ UNHANDLED REJECTION! Shutting down...')
  console.log(err.name, err.message)
  // Close server & exit process
  server.close(() => {
    process.exit(1)
  })
})

