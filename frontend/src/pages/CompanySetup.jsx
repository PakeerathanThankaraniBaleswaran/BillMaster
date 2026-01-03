import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyAPI } from '../services/api';
import { COUNTRIES_LIST, getStatesByCountry, searchCountries } from '../data/countries';

const CompanySetup = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    
    if (!token) {
      navigate('/signin')
      return
    }

    // Check if user already has company setup
    companyAPI.getCompanyProfile()
      .then(() => {
        // Company exists, redirect to dashboard
        navigate('/dashboard')
      })
      .catch((error) => {
        if (error.response?.status !== 404) {
          // Other error, perhaps token invalid
          navigate('/signin')
        }
        // If 404, no company, stay on page
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
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const filteredCountries = countrySearch 
    ? searchCountries(countrySearch).slice(0, 15) 
    : COUNTRIES_LIST.slice(0, 15);
  const states = formData.country ? getStatesByCountry(formData.country) : [];
  const adminRegions = ['North Region', 'South Region', 'East Region', 'West Region', 'Central'];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setFormData({ ...formData, companyLogo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert('Please accept terms and conditions');
      return;
    }

    setLoading(true);

    try {
      const response = await companyAPI.setupCompany(formData)

      // axios interceptor already unwraps to response.data
      if (response?.success) {
        alert('✅ Company setup completed successfully! Welcome to Dashboard.')
        localStorage.setItem('setupComplete', 'true')
        window.dispatchEvent(new Event('auth-change'))
        navigate('/dashboard', { replace: true })
        return
      }

      // Fallback if response shape is unexpected
      alert('Setup did not complete. Please try again.')
    } catch (error) {
      console.error('Setup error:', error)
      alert(error.response?.data?.message || '❌ Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
    },
    card: {
      background: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 20px 80px rgba(0, 0, 0, 0.3)',
      width: '100%',
      maxWidth: '1200px',
      padding: '60px',
      position: 'relative',
    },
    header: {
      textAlign: 'center',
      marginBottom: '50px',
      paddingBottom: '30px',
      borderBottom: '3px solid #e5e7eb',
    },
    title: {
      fontSize: '42px',
      fontWeight: '700',
      color: '#1e3a8a',
      marginBottom: '12px',
      letterSpacing: '-0.5px',
    },
    subtitle: {
      color: '#6b7280',
      fontSize: '16px',
      fontWeight: '400',
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '50px',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '25px',
      paddingBottom: '12px',
      borderBottom: '2px solid #e5e7eb',
    },
    formGroup: {
      marginBottom: '22px',
    },
    label: {
      display: 'block',
      color: '#374151',
      marginBottom: '8px',
      fontWeight: '500',
      fontSize: '14px',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '15px',
      outline: 'none',
      transition: 'all 0.2s ease',
      background: '#ffffff',
      color: '#1f2937',
      fontFamily: 'inherit',
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '15px',
      outline: 'none',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '15px',
      outline: 'none',
      resize: 'vertical',
      fontFamily: 'inherit',
      background: '#ffffff',
      color: '#1f2937',
      transition: 'all 0.2s ease',
    },
    logoUpload: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
    },
    fileButton: {
      background: '#1e3a8a',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
    },
    logoPreview: {
      height: '70px',
      width: '70px',
      objectFit: 'contain',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px',
      background: '#f9fafb',
    },
    checkboxContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginTop: '40px',
      padding: '18px',
      background: '#f3f4f6',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: '#1e3a8a',
    },
    submitButton: {
      background: '#1e3a8a',
      color: '#ffffff',
      padding: '16px 48px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginTop: '40px',
    },
    submitButtonDisabled: {
      background: '#9ca3af',
      cursor: 'not-allowed',
    },
    buttonContainer: {
      textAlign: 'center',
    },
    preferenceBox: {
      background: '#f9fafb',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginTop: '25px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome to Your Business Platform</h1>
          <p style={styles.subtitle}>Complete your company profile to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.gridContainer}>
            {/* Left Side - Company Details */}
            <div>
              <h2 style={styles.sectionTitle}>Company Details</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Business Name *</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Enter your business name"
                  required
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #1e3a8a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  style={styles.textarea}
                  rows="3"
                  placeholder="Enter complete business address"
                  required
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #1e3a8a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

<div style={styles.formGroup}>
  <label style={styles.label}>Country *</label>

  <div style={{ position: 'relative' }}>
    <input
      type="text"
      placeholder="Search country..."
      value={countrySearch}
      onChange={(e) => {
        setCountrySearch(e.target.value);
        setShowCountryDropdown(true);
      }}
      onFocus={() => setShowCountryDropdown(true)}
      onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
      style={{
        ...styles.input,
        paddingRight: '40px',
      }}
    />

    {showCountryDropdown && (
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#ffffff',
          border: '1px solid #d1d5db',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 10,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {filteredCountries.length > 0 ? (
          filteredCountries.map((country) => (
            <div
              key={country.code}
              onClick={() => {
                setFormData({
                  ...formData,
                  country: country.name,
                  state: '',
                });
                setCountrySearch(country.name); // ⭐ IMPORTANT
                setShowCountryDropdown(false);
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6',
                backgroundColor:
                  formData.country === country.name
                    ? '#f3f4f6'
                    : '#ffffff',
                fontSize: '14px',
                color: '#1f2937',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#eff6ff')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  formData.country === country.name
                    ? '#f3f4f6'
                    : '#ffffff')
              }
            >
              {country.name} ({country.code})
            </div>
          ))
        ) : (
          <div
            style={{
              padding: '12px 16px',
              color: '#6b7280',
              fontSize: '14px',
            }}
          >
            No countries found
          </div>
        )}
      </div>
    )}
  </div>
</div>


              <div style={styles.formGroup}>
                <label style={styles.label}>State/Province *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #1e3a8a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Enter city name"
                  required
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #1e3a8a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="contact@company.com"
                  required
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #1e3a8a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number *</label>
                <input
                  type="tel"
                  name="phoneNo"
                  value={formData.phoneNo}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  required
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #1e3a8a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Right Side - Other Details */}
            <div>
              <h2 style={styles.sectionTitle}>Additional Information</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Administrative Region *</label>
                <select
                  name="administrativeRegion"
                  value={formData.administrativeRegion}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #1e3a8a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select Region</option>
                  {adminRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tax Identification Number *</label>
                <input
                  type="text"
                  name="taxIdentificationNo"
                  value={formData.taxIdentificationNo}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Enter GST/TIN number"
                  required
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #1e3a8a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid #d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Company Logo</label>
                <div style={styles.logoUpload}>
                  <label style={styles.fileButton}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#1e40af';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(30, 58, 138, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#1e3a8a';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    📁 Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      style={styles.logoPreview}
                    />
                  )}
                </div>
              </div>

              <div style={styles.preferenceBox}>
                <h3 style={{ ...styles.sectionTitle, borderBottom: 'none', marginBottom: '15px', fontSize: '16px' }}>
                  Business Preferences
                </h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="enableManufacturing"
                    checked={formData.enableManufacturing}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  <span style={{ ...styles.label, marginBottom: 0 }}>
                    Enable Manufacturing Module
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div style={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={styles.checkbox}
              required
            />
            <label style={{ ...styles.label, marginBottom: 0 }}>
              I agree to the terms and conditions
            </label>
          </div>

          <div style={styles.buttonContainer}>
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              style={{
                ...styles.submitButton,
                ...(loading || !termsAccepted ? styles.submitButtonDisabled : {}),
              }}
              onMouseEnter={(e) => {
                if (!loading && termsAccepted) {
                  e.target.style.background = '#1e40af';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 24px rgba(30, 58, 138, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && termsAccepted) {
                  e.target.style.background = '#1e3a8a';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {loading ? 'Processing...' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySetup;