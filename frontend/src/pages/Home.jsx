import { Link } from 'react-router-dom'

function Home() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundColor: '#2563eb',
        backgroundImage: "url('https://thumbs.dreamstime.com/b/automate-invoice-processing-streamline-billing-cycles-our-innovative-software-manage-finances-efficiently-track-payments-391882263.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay to ensure text readability */}
      <div className="absolute inset-0 bg-blue-600/70 z-0"></div>
      {/* Content container */}
      <div className="max-w-4xl mx-auto px-4 py-12 w-full relative z-10">
        <div className="text-center mb-12">
          {/* Heading matching reference image */}
          <div className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">
              Welcome to
            </h1>
            <h1 className="text-6xl md:text-7xl font-bold text-white">
              BillMaster
            </h1>
          </div>
          
          {/* Tagline matching reference */}
          <p className="text-lg md:text-xl text-white mb-8 max-w-xl mx-auto font-light">
            Manage your invoices, track payments, and grow your business all in one place.
          </p>
          
          {/* Decorative dashes matching reference */}
          <div className="flex justify-center gap-2 mb-8">
            <div className="w-8 h-1 bg-white rounded-full"></div>
            <div className="w-8 h-1 bg-white rounded-full"></div>
            <div className="w-8 h-1 bg-white/40 rounded-full"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signin"
              className="px-8 py-3.5 bg-white text-blue-600 rounded-xl font-semibold text-base
                       transition-all duration-200 
                       hover:bg-gray-100 hover:shadow-2xl hover:scale-[1.05] 
                       active:scale-[0.98]"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white border-2 border-white/30 rounded-xl font-semibold text-base
                       transition-all duration-200 
                       hover:bg-white/20 hover:border-white/50 hover:shadow-2xl hover:scale-[1.05] 
                       active:scale-[0.98]"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Features cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="text-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-xl font-semibold mb-2 text-white">Manage Invoices</h3>
            <p className="text-white/80">
              Create, edit, and track all your invoices in one place
            </p>
          </div>

          <div className="text-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2 text-white">Track Payments</h3>
            <p className="text-white/80">
              Monitor payments and manage your financial records
            </p>
          </div>

          <div className="text-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2 text-white">Analytics</h3>
            <p className="text-white/80">
              Get insights into your business with detailed reports
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

