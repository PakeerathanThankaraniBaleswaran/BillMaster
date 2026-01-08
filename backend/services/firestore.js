import admin from 'firebase-admin'
import { getFirestore } from '../config/firebase.js'

export const db = () => getFirestore()

export const nowTimestamp = () => admin.firestore.FieldValue.serverTimestamp()

const isTimestamp = (v) =>
  v && typeof v === 'object' && typeof v.toDate === 'function' && v.constructor?.name === 'Timestamp'

const toPlain = (value) => {
  if (isTimestamp(value)) return value.toDate()
  if (Array.isArray(value)) return value.map(toPlain)
  if (!value || typeof value !== 'object') return value
  const out = {}
  for (const [k, v] of Object.entries(value)) out[k] = toPlain(v)
  return out
}

export const docToApi = (doc) => {
  const data = doc?.data?.() || {}
  return { _id: doc.id, ...toPlain(data) }
}

export const collection = (name) => db().collection(name)

export const userCollection = (name, userId) => collection(name).where('user', '==', String(userId))

export const getByIdOwned = async (name, id, userId) => {
  const snap = await collection(name).doc(String(id)).get()
  if (!snap.exists) return null
  const obj = docToApi(snap)
  if (String(obj.user) !== String(userId)) return null
  return obj
}

export const updateByIdOwned = async (name, id, userId, updates) => {
  const ref = collection(name).doc(String(id))
  const snap = await ref.get()
  if (!snap.exists) return null
  const existing = docToApi(snap)
  if (String(existing.user) !== String(userId)) return null

  await ref.update({ ...updates, updatedAt: nowTimestamp() })
  const next = await ref.get()
  return docToApi(next)
}

export const deleteByIdOwned = async (name, id, userId) => {
  const ref = collection(name).doc(String(id))
  const snap = await ref.get()
  if (!snap.exists) return null
  const existing = docToApi(snap)
  if (String(existing.user) !== String(userId)) return null
  await ref.delete()
  return existing
}

export const batchGet = async (name, ids = []) => {
  const uniq = Array.from(new Set(ids.map((x) => String(x)).filter(Boolean)))
  if (!uniq.length) return []
  const refs = uniq.map((id) => collection(name).doc(id))
  const snaps = await db().getAll(...refs)
  return snaps.filter((s) => s.exists).map(docToApi)
}
