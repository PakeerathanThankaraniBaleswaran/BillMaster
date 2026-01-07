import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor (add auth token if available)
api.interceptors.request.use(
  (config) => {
    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor (handle errors globally)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access - clear both storage locations
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      // Redirect to sign in page (correct route)
      window.location.href = '/signin'
    }
    return Promise.reject(error)
  }
)

export default api

// Company API functions
export const companyAPI = {
  setupCompany: (companyData) => api.post('/company/setup', companyData),
  getCompanyProfile: () => api.get('/company/profile'),
}

// Cash In API functions
export const cashInAPI = {
  createEntry: (payload) => api.post('/cash-in', payload),
  getSummary: () => api.get('/cash-in/summary'),
}

// Cash Out API functions
export const cashOutAPI = {
  createEntry: (payload) => api.post('/cash-out/out', payload),
}

// Inventory / Data Entry API functions
export const inventoryAPI = {
  createItem: (payload) => api.post('/inventory', payload),
  getInventory: () => api.get('/inventory'),
  updateItem: (id, payload) => api.put(`/inventory/${id}`, payload),
  removeItem: (id) => api.delete(`/inventory/${id}`),
}

// Product API functions
export const productAPI = {
  list: () => api.get('/products'),
  create: (payload) => api.post('/products', payload),
  update: (id, payload) => api.put(`/products/${id}`, payload),
  remove: (id) => api.delete(`/products/${id}`),
}

// Customer API functions
export const customerAPI = {
  list: () => api.get('/customers'),
  create: (payload) => api.post('/customers', payload),
  update: (id, payload) => api.put(`/customers/${id}`, payload),
  remove: (id) => api.delete(`/customers/${id}`),
}

// Invoice API functions
export const invoiceAPI = {
  list: () => api.get('/invoices'),
  get: (id) => api.get(`/invoices/${id}`),
  create: (payload) => api.post('/invoices', payload),
  update: (id, payload) => api.put(`/invoices/${id}`, payload),
  remove: (id) => api.delete(`/invoices/${id}`),
}

// Summary API functions
export const summaryAPI = {
  get: () => api.get('/summary'),
}

// Reports API functions
export const reportsAPI = {
  get: (params) => api.get('/reports', { params }),
}

