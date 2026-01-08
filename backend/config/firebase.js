import admin from 'firebase-admin'
import fs from 'node:fs'

let app

const parseServiceAccount = () => {
  const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH

  if (jsonInline && String(jsonInline).trim()) {
    try {
      return JSON.parse(String(jsonInline))
    } catch (e) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON')
    }
  }

  if (jsonPath && String(jsonPath).trim()) {
    const raw = fs.readFileSync(String(jsonPath), 'utf8')
    try {
      return JSON.parse(raw)
    } catch (e) {
      throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT_PATH file')
    }
  }

  return null
}

export const initFirebase = () => {
  if (app) return app

  const serviceAccount = parseServiceAccount()

  if (!serviceAccount) {
    throw new Error(
      'Firebase is enabled but service account is missing. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_PATH.'
    )
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  })

  return app
}

export const getFirestore = () => {
  initFirebase()
  return admin.firestore()
}
