import connectDB from './db.js'
import { initFirebase } from './firebase.js'

export const getDataStore = () => {
  const raw = String(process.env.DATA_STORE || '').trim().toLowerCase()
  if (!raw) return 'mongo'
  if (raw === 'firebase' || raw === 'firestore') return 'firebase'
  if (raw === 'mongo' || raw === 'mongodb') return 'mongo'
  return 'mongo'
}

export const initDataStore = async () => {
  const store = getDataStore()
  if (store === 'firebase') {
    initFirebase()
    console.log('✅ Data store: Firebase (Firestore)')
    return
  }

  await connectDB()
  console.log('✅ Data store: MongoDB')
}
