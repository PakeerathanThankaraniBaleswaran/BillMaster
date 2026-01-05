import { Link } from 'react-router-dom'

export default function AppTopbar({ children }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="app-container py-4 flex items-center justify-between gap-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-semibold">
            B
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">BillMaster</p>
            <p className="text-xs text-gray-500">Billing & inventory</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  )
}
