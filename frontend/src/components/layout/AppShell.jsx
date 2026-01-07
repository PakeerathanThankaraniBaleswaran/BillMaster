import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import SidebarNav from './SidebarNav'

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true)

  const isInvoicePOS = location.pathname === '/invoices'

  useEffect(() => {
    setIsDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isDrawerOpen) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsDrawerOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDrawerOpen])

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }

    document.body.style.overflow = ''
  }, [isDrawerOpen])

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
        {isDesktopSidebarOpen && (
          <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-gray-200 bg-white">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <Link to="/dashboard" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-semibold">
                    B
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-gray-900">BillMaster</p>
                    <p className="text-xs text-gray-500">Billing & inventory</p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsDesktopSidebarOpen(false)}
                  className="btn-secondary"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6">
                <SidebarNav variant="sidebar" />
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0">
          {!isInvoicePOS && (
            <header className="border-b border-gray-200 bg-white">
              <div className="app-container py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="hidden lg:flex items-center">
                    <button
                      type="button"
                      onClick={() => setIsDesktopSidebarOpen((v) => !v)}
                      className="btn-secondary"
                      aria-label={isDesktopSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                      {isDesktopSidebarOpen ? (
                        <PanelLeftClose className="h-4 w-4" />
                      ) : (
                        <PanelLeftOpen className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(true)}
                      className="btn-secondary"
                      aria-label="Open menu"
                    >
                      <Menu className="h-4 w-4" />
                    </button>

                    <Link to="/dashboard" className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-semibold">
                        B
                      </div>
                      <p className="text-sm font-semibold text-gray-900">BillMaster</p>
                    </Link>
                  </div>

                  <div className="flex-1" />

                  <button type="button" onClick={handleLogout} className="btn-secondary">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </header>
          )}

          <div
            className={
              isDrawerOpen
                ? 'lg:hidden fixed inset-0 z-50'
                : 'lg:hidden fixed inset-0 z-50 pointer-events-none'
            }
            aria-hidden={!isDrawerOpen}
          >
            <button
              type="button"
              className={
                isDrawerOpen
                  ? 'absolute inset-0 bg-black/30 opacity-100 transition-opacity'
                  : 'absolute inset-0 bg-black/30 opacity-0 transition-opacity'
              }
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close menu"
            />

            <div
              className={
                isDrawerOpen
                  ? 'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-gray-200 transform translate-x-0 transition-transform'
                  : 'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-gray-200 transform -translate-x-full transition-transform'
              }
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <div className="h-9 w-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-semibold">
                    B
                  </div>
                  <p className="text-sm font-semibold text-gray-900">BillMaster</p>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="btn-secondary"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                <SidebarNav variant="sidebar" onNavigate={() => setIsDrawerOpen(false)} />
              </div>
            </div>
          </div>

          {isInvoicePOS && (
            <div className="fixed top-3 left-3 z-40 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="btn-secondary lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsDesktopSidebarOpen((v) => !v)}
                className="btn-secondary hidden lg:inline-flex"
                aria-label={isDesktopSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {isDesktopSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          <main className={isInvoicePOS ? 'p-0' : 'app-container py-8'}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
