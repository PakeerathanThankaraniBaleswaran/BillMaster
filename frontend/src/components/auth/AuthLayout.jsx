import { useEffect, useState } from 'react'

const images = [
  'https://www.shutterstock.com/image-vector/pos-terminal-business-special-gadget-600nw-2120229725.jpg',
  'https://www.clio.com/wp-content/uploads/2020/01/Clio-2020-Legal_Billing_Software_Blog_Feature_Image-750x375.png',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRh1HkUEmX70lOPGvbAZIZINqd10lPQrsnX6Q&s',
]

export function AuthLayout({ children }) {
  const [activeIndex, setActiveIndex] = useState(0)

  // Auto slide every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen w-full flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">

        {/* Background Images */}
        {images.map((img, index) => (
          <div
            key={img}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              activeIndex === index ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-start px-16 xl:px-24 text-white h-full">
          <div className="space-y-6 max-w-lg">
            <h1 className="text-5xl xl:text-6xl font-bold leading-tight">
              Welcome to BillMaster
            </h1>

            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              Manage your invoices, track payments, and grow your business all in one place.
            </p>

            {/* Indicator Bars */}
            <div className="flex gap-2 pt-6">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeIndex === index
                      ? 'w-14 bg-white'
                      : 'w-10 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 md:p-12 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

    </div>
  )
}
