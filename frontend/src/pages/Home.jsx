import { Link } from 'react-router-dom'
import { BarChart3, FileText, Wallet } from 'lucide-react'

function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative app-container py-16">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-white/70">Business billing suite</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight text-white">
            BillMaster
          </h1>
          <p className="mt-4 text-lg text-white/85 max-w-2xl">
            Create invoices, track stock, and manage customers — built for small business owners.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/signin"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-800 hover:bg-gray-100 transition"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 transition"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="Invoices"
            description="Create and manage invoices with clear status tracking."
          />
          <FeatureCard
            icon={<Wallet className="h-5 w-5" />}
            title="Cash & payments"
            description="Capture daily cash entries and monitor collections."
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Overview"
            description="Get a quick view of customers, products, and sales."
          />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm p-5">
      <div className="h-10 w-10 rounded-lg bg-white/10 text-white flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/80">{description}</p>
    </div>
  )
}

export default Home

