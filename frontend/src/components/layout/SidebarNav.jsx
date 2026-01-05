import { NavLink } from 'react-router-dom'
import { BarChart3, FileText, LayoutDashboard, Package, Users, Wallet } from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/data-entry', label: 'Stock', icon: Package },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/cash-in', label: 'Cash In', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors'

export default function SidebarNav({ variant = 'sidebar' }) {
  const isSidebar = variant === 'sidebar'

  return (
    <nav className={isSidebar ? 'space-y-1' : 'flex flex-wrap gap-2'}>
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isSidebar
                ? `${linkBase} ${
                    isActive
                      ? 'bg-primary-50 text-primary-800 border border-primary-100'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                : `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border ${
                    isActive
                      ? 'bg-primary-50 text-primary-800 border-primary-100'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
