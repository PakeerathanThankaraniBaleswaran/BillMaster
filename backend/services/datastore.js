import { getDataStore } from '../config/datastore.js'

export const isFirebase = () => getDataStore() === 'firebase'
