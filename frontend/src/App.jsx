import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import CashIn from './pages/CashIn'
import AuthCallback from './pages/AuthCallback'
import CompanySetup from './pages/CompanySetup'
import DataEntry from './pages/DataEntry'
import Invoices from './pages/Invoices'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Reports from './pages/Reports'
import AppShell from './components/layout/AppShell'

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route element={<AppShell />}>
            <Route path="/company-setup" element={<CompanySetup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cash-in" element={<CashIn />} />
            <Route path="/data-entry" element={<DataEntry />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
