import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import SidebarNav from './SidebarNav'

export default function AppShell() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')

  if (!token) {
    return <Navigate to="/signin" replace />
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('setupComplete')
    navigate('/signin', { replace: true })
  }

  return (
    <div className="app-page">
      <div className="min-h-screen flex">
        <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-gray-200 bg-white">
          <div className="p-6">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-semibold">
                B
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-gray-900">BillMaster</p>
                <p className="text-xs text-gray-500">Billing & inventory</p>
              </div>
            </Link>

            <div className="mt-6">
              <SidebarNav variant="sidebar" />
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="border-b border-gray-200 bg-white">
            <div className="app-container py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <Link to="/dashboard" className="flex items-center gap-3 lg:hidden">
                  <div className="h-9 w-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-semibold">
                    B
                  </div>
                  <p className="text-sm font-semibold text-gray-900">BillMaster</p>
                </Link>

                <div className="flex-1" />

                <button type="button" onClick={handleLogout} className="btn-secondary">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>

              <div className="lg:hidden">
                <SidebarNav variant="mobile" />
              </div>
            </div>
          </header>

          <main className="app-container py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
