import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import CashIn from './pages/CashIn'
import AuthCallback from './pages/AuthCallback'
import CompanySetup from './pages/CompanySetup'
import DataEntry from './pages/DataEntry'

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/company-setup" element={<CompanySetup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cash-in" element={<CashIn />} />
          <Route path="/data-entry" element={<DataEntry />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
