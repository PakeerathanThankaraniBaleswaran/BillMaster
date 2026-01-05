import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Upload } from 'lucide-react'
import AppTopbar from '@/components/layout/AppTopbar'
import { companyAPI } from '../services/api'
import { COUNTRIES_LIST, getStatesByCountry, searchCountries } from '../data/countries'

export default function CompanySetup() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      navigate('/signin')
      return
    }

    companyAPI
      .getCompanyProfile()
      .then(() => navigate('/dashboard'))
      .catch((error) => {
        if (error.response?.status !== 404) {
          navigate('/signin')
        }
      })
  }, [navigate])

  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    country: '',
    state: '',
    city: '',
    email: '',
    phoneNo: '',
    administrativeRegion: '',
    taxIdentificationNo: '',
    companyLogo: null,
    enableManufacturing: false,
  })

  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

  const filteredCountries = countrySearch ? searchCountries(countrySearch).slice(0, 15) : COUNTRIES_LIST.slice(0, 15)
  const states = formData.country ? getStatesByCountry(formData.country) : []
  const adminRegions = ['North Region', 'South Region', 'East Region', 'West Region', 'Central']

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result)
      setFormData((prev) => ({ ...prev, companyLogo: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!termsAccepted) {
      alert('Please accept the terms and conditions.')
      return
    }

    setLoading(true)
    try {
      const response = await companyAPI.setupCompany(formData)
      if (response?.success) {
        alert('Company setup completed successfully.')
        localStorage.setItem('setupComplete', 'true')
        window.dispatchEvent(new Event('auth-change'))
        navigate('/dashboard', { replace: true })
        return
      }

      alert('Setup did not complete. Please try again.')
    } catch (error) {
      console.error('Setup error:', error)
      alert(error.response?.data?.message || 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-page">
      <AppTopbar />
      <div className="app-container py-8">
        <div className="card overflow-hidden">
          <div className="card-body">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary-50 border border-primary-100 text-primary-700 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="page-title">Company setup</h1>
                <p className="page-subtitle">Complete your company profile to start using BillMaster.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
              <div className="grid lg:grid-cols-2 gap-8">
                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-gray-900">Company details</h2>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Business name *</label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter your business name"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="textarea-field"
                      rows={3}
                      placeholder="Enter complete business address"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Country *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search country..."
                        value={countrySearch}
                        onChange={(e) => {
                          const next = e.target.value
                          setCountrySearch(next)
                          setShowCountryDropdown(true)
                          setFormData((prev) => ({ ...prev, country: next, state: '' }))
                        }}
                        onFocus={() => setShowCountryDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                        className="input-field pr-10"
                        required
                      />

                      {showCountryDropdown && (
                        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                          <div className="max-h-56 overflow-auto">
                            {filteredCountries.length > 0 ? (
                              filteredCountries.map((country) => (
                                <button
                                  key={country.code}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, country: country.name, state: '' }))
                                    setCountrySearch(country.name)
                                    setShowCountryDropdown(false)
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 hover:bg-gray-50 ${
                                    formData.country === country.name ? 'bg-gray-50' : 'bg-white'
                                  }`}
                                >
                                  {country.name} <span className="text-xs text-gray-500">({country.code})</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500">No countries found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">State/Province *</label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="select-field"
                        required
                      >
                        <option value="">Select state</option>
                        {states.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">City *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Enter city"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Email address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="contact@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Phone number *</label>
                      <input
                        type="tel"
                        name="phoneNo"
                        value={formData.phoneNo}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="+94 77 123 4567"
                        required
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-gray-900">Additional information</h2>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Administrative region *</label>
                    <select
                      name="administrativeRegion"
                      value={formData.administrativeRegion}
                      onChange={handleInputChange}
                      className="select-field"
                      required
                    >
                      <option value="">Select region</option>
                      {adminRegions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tax identification number *</label>
                    <input
                      type="text"
                      name="taxIdentificationNo"
                      value={formData.taxIdentificationNo}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter GST/TIN number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Company logo</label>
                    <div className="flex items-center gap-4">
                      <label className="btn-secondary cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Upload
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 object-contain p-2"
                        />
                      ) : (
                        <p className="text-sm text-gray-500">Optional</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">Business preferences</p>
                    <label className="mt-3 flex items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="enableManufacturing"
                        checked={formData.enableManufacturing}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      Enable manufacturing module
                    </label>
                  </div>
                </section>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    required
                  />
                  I agree to the terms and conditions
                </label>
                <button type="submit" disabled={loading || !termsAccepted} className="btn-primary px-6 py-3">
                  {loading ? 'Processing...' : 'Complete setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}